import { CliCommandProcessorRegistry } from '../lib/registry';
import { ICliCommandProcessor } from '@qodalis/cli-core';

const createProcessor = (
    command: string,
    aliases?: string[],
): ICliCommandProcessor => ({
    command,
    aliases,
    description: `Test ${command}`,
    async processCommand() {},
});

describe('CliCommandProcessorRegistry', () => {
    let registry: CliCommandProcessorRegistry;

    beforeEach(() => {
        registry = new CliCommandProcessorRegistry();
    });

    it('should register and find a processor', () => {
        const proc = createProcessor('test');
        registry.registerProcessor(proc);
        expect(registry.findProcessor('test', [])).toBe(proc);
    });

    it('should find processor by alias', () => {
        const proc = createProcessor('test', ['t']);
        registry.registerProcessor(proc);
        expect(registry.findProcessor('t', [])).toBe(proc);
    });

    it('should return undefined for unknown command', () => {
        expect(registry.findProcessor('unknown', [])).toBeUndefined();
    });

    it('should unregister a processor', () => {
        const proc = createProcessor('test');
        registry.registerProcessor(proc);
        registry.unregisterProcessor(proc);
        expect(registry.findProcessor('test', [])).toBeUndefined();
    });

    it('should not unregister a sealed processor', () => {
        const proc = createProcessor('test');
        proc.metadata = { sealed: true };
        registry.registerProcessor(proc);
        registry.unregisterProcessor(proc);
        expect(registry.findProcessor('test', [])).toBe(proc);
    });

    it('should replace an existing processor', () => {
        const proc1 = createProcessor('test');
        const proc2 = createProcessor('test');
        proc2.description = 'Replaced';
        registry.registerProcessor(proc1);
        registry.registerProcessor(proc2);
        expect(registry.findProcessor('test', [])?.description).toBe(
            'Replaced',
        );
    });

    it('should accept initial processors', () => {
        const proc = createProcessor('init');
        registry = new CliCommandProcessorRegistry([proc]);
        expect(registry.findProcessor('init', [])).toBe(proc);
    });

    it('should find nested processors via chain commands', () => {
        const child: ICliCommandProcessor = {
            command: 'sub',
            description: 'Sub command',
            async processCommand() {},
        };
        const parent = createProcessor('parent');
        parent.processors = [child];
        registry.registerProcessor(parent);
        expect(
            registry.findProcessorInCollection(
                'parent',
                ['sub'],
                registry.processors,
            ),
        ).toBe(child);
    });

    describe('Extension / Delegation', () => {
        it('should wire originalProcessor when extendsProcessor is true', () => {
            const original = createProcessor('echo');
            const extension = createProcessor('echo');
            extension.extendsProcessor = true;

            registry.registerProcessor(original);
            registry.registerProcessor(extension);

            const found = registry.findProcessor('echo', []);
            expect(found).toBe(extension);
            expect(found?.originalProcessor).toBe(original);
        });

        it('should chain multiple extensions (A -> B -> C)', () => {
            const base = createProcessor('echo');
            base.description = 'base';
            const ext1 = createProcessor('echo');
            ext1.extendsProcessor = true;
            ext1.description = 'ext1';
            const ext2 = createProcessor('echo');
            ext2.extendsProcessor = true;
            ext2.description = 'ext2';

            registry.registerProcessor(base);
            registry.registerProcessor(ext1);
            registry.registerProcessor(ext2);

            const found = registry.findProcessor('echo', []);
            expect(found).toBe(ext2);
            expect(found?.originalProcessor).toBe(ext1);
            expect(found?.originalProcessor?.originalProcessor).toBe(base);
        });

        it('should allow extending sealed processors', () => {
            const sealed = createProcessor('help');
            sealed.metadata = { sealed: true };
            const extension = createProcessor('help');
            extension.extendsProcessor = true;

            registry.registerProcessor(sealed);
            registry.registerProcessor(extension);

            const found = registry.findProcessor('help', []);
            expect(found).toBe(extension);
            expect(found?.originalProcessor).toBe(sealed);
        });

        it('should register normally when no existing command to extend', () => {
            const extension = createProcessor('newcmd');
            extension.extendsProcessor = true;

            registry.registerProcessor(extension);

            const found = registry.findProcessor('newcmd', []);
            expect(found).toBe(extension);
            expect(found?.originalProcessor).toBeUndefined();
        });

        it('should restore original when unregistering an extending processor', () => {
            const original = createProcessor('echo');
            const extension = createProcessor('echo');
            extension.extendsProcessor = true;

            registry.registerProcessor(original);
            registry.registerProcessor(extension);
            registry.unregisterProcessor(extension);

            const found = registry.findProcessor('echo', []);
            expect(found).toBe(original);
        });

        it('should allow extending processor to delegate to original', async () => {
            const calls: string[] = [];
            const original = createProcessor('echo');
            original.processCommand = async () => {
                calls.push('original');
            };

            const extension = createProcessor('echo');
            extension.extendsProcessor = true;
            extension.processCommand = async function (
                this: ICliCommandProcessor,
                cmd: any,
                ctx: any,
            ) {
                calls.push('extension');
                await this.originalProcessor!.processCommand(cmd, ctx);
            }.bind(extension);

            registry.registerProcessor(original);
            registry.registerProcessor(extension);

            const found = registry.findProcessor('echo', [])!;
            await found.processCommand(
                {
                    command: 'echo',
                    rawCommand: 'echo hi',
                    chainCommands: [],
                    args: {},
                },
                {} as any,
            );

            expect(calls).toEqual(['extension', 'original']);
        });

        it('should allow extending processor to NOT delegate', async () => {
            const calls: string[] = [];
            const original = createProcessor('echo');
            original.processCommand = async () => {
                calls.push('original');
            };

            const extension = createProcessor('echo');
            extension.extendsProcessor = true;
            extension.processCommand = async () => {
                calls.push('extension-only');
            };

            registry.registerProcessor(original);
            registry.registerProcessor(extension);

            const found = registry.findProcessor('echo', [])!;
            await found.processCommand(
                {
                    command: 'echo',
                    rawCommand: 'echo hi',
                    chainCommands: [],
                    args: {},
                },
                {} as any,
            );

            expect(calls).toEqual(['extension-only']);
        });
    });
});
