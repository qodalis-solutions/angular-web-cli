import { CliCommandProcessorRegistry } from '../lib/registry';
import { ICliCommandProcessor } from '@qodalis/cli-core';

const createProcessor = (command: string, aliases?: string[]): ICliCommandProcessor => ({
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
        expect(registry.findProcessor('test', [])?.description).toBe('Replaced');
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
        expect(registry.findProcessorInCollection('parent', ['sub'], registry.processors)).toBe(child);
    });
});
