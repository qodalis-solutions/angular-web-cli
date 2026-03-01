import { CliCurlCommandProcessor } from '../lib/processors/cli-curl-command-processor';

describe('CliCurlCommandProcessor', () => {
    let processor: CliCurlCommandProcessor;

    beforeEach(() => {
        processor = new CliCurlCommandProcessor();
    });

    it('should be created', () => {
        expect(processor).toBeDefined();
    });

    describe('command identity', () => {
        it('should have command name "curl"', () => {
            expect(processor.command).toBe('curl');
        });

        it('should have a description', () => {
            expect(processor.description).toBeDefined();
            expect(processor.description!.length).toBeGreaterThan(0);
        });

        it('should have metadata with an icon', () => {
            expect(processor.metadata).toBeDefined();
            expect(processor.metadata!.icon).toBeDefined();
        });

        it('should have an author', () => {
            expect(processor.author).toBeDefined();
        });

        it('should have a version', () => {
            expect(processor.version).toBeDefined();
        });
    });

    describe('sub-processors', () => {
        it('should have processors array defined', () => {
            expect(processor.processors).toBeDefined();
            expect(Array.isArray(processor.processors)).toBe(true);
        });

        it('should have exactly 4 sub-processors', () => {
            expect(processor.processors!.length).toBe(4);
        });

        it('should include "get" sub-processor', () => {
            const sub = processor.processors!.find((p) => p.command === 'get');
            expect(sub).toBeDefined();
            expect(sub!.description).toBeDefined();
        });

        it('should include "post" sub-processor', () => {
            const sub = processor.processors!.find((p) => p.command === 'post');
            expect(sub).toBeDefined();
            expect(sub!.description).toBeDefined();
        });

        it('should include "put" sub-processor', () => {
            const sub = processor.processors!.find((p) => p.command === 'put');
            expect(sub).toBeDefined();
            expect(sub!.description).toBeDefined();
        });

        it('should include "delete" sub-processor', () => {
            const sub = processor.processors!.find(
                (p) => p.command === 'delete',
            );
            expect(sub).toBeDefined();
            expect(sub!.description).toBeDefined();
        });

        it('should have all sub-processors with valueRequired = true', () => {
            for (const sub of processor.processors!) {
                expect(sub.valueRequired)
                    .withContext(
                        `Sub-processor "${sub.command}" should have valueRequired = true`,
                    )
                    .toBe(true);
            }
        });

        it('should have all sub-processors with processCommand as a function', () => {
            for (const sub of processor.processors!) {
                expect(typeof sub.processCommand)
                    .withContext(
                        `Sub-processor "${sub.command}" should have processCommand as a function`,
                    )
                    .toBe('function');
            }
        });

        it('should have unique command names across all sub-processors', () => {
            const names = processor.processors!.map((p) => p.command);
            const uniqueNames = new Set(names);
            expect(uniqueNames.size).toBe(names.length);
        });
    });

    describe('sub-processor parameters', () => {
        it('"get" sub-processor should have parameters defined', () => {
            const sub = processor.processors!.find((p) => p.command === 'get');
            expect(sub!.parameters).toBeDefined();
            expect(sub!.parameters!.length).toBeGreaterThan(0);
        });

        it('"get" sub-processor should have a "header" parameter with alias "H"', () => {
            const sub = processor.processors!.find((p) => p.command === 'get');
            const headerParam = sub!.parameters!.find(
                (p) => p.name === 'header',
            );
            expect(headerParam).toBeDefined();
            expect(headerParam!.aliases).toContain('H');
            expect(headerParam!.type).toBe('array');
        });

        it('"post" sub-processor should have a "data" parameter with alias "d"', () => {
            const sub = processor.processors!.find((p) => p.command === 'post');
            const dataParam = sub!.parameters!.find((p) => p.name === 'data');
            expect(dataParam).toBeDefined();
            expect(dataParam!.aliases).toContain('d');
            expect(dataParam!.type).toBe('string');
        });

        it('"post" sub-processor should have a "header" parameter', () => {
            const sub = processor.processors!.find((p) => p.command === 'post');
            const headerParam = sub!.parameters!.find(
                (p) => p.name === 'header',
            );
            expect(headerParam).toBeDefined();
            expect(headerParam!.type).toBe('array');
        });

        it('"put" sub-processor should have a "data" parameter with alias "d"', () => {
            const sub = processor.processors!.find((p) => p.command === 'put');
            const dataParam = sub!.parameters!.find((p) => p.name === 'data');
            expect(dataParam).toBeDefined();
            expect(dataParam!.aliases).toContain('d');
            expect(dataParam!.type).toBe('string');
        });

        it('"put" sub-processor should have a "header" parameter', () => {
            const sub = processor.processors!.find((p) => p.command === 'put');
            const headerParam = sub!.parameters!.find(
                (p) => p.name === 'header',
            );
            expect(headerParam).toBeDefined();
        });

        it('"delete" sub-processor should have a "header" parameter', () => {
            const sub = processor.processors!.find(
                (p) => p.command === 'delete',
            );
            const headerParam = sub!.parameters!.find(
                (p) => p.name === 'header',
            );
            expect(headerParam).toBeDefined();
        });

        it('"delete" sub-processor should NOT have a "data" parameter', () => {
            const sub = processor.processors!.find(
                (p) => p.command === 'delete',
            );
            const dataParam = sub!.parameters!.find((p) => p.name === 'data');
            expect(dataParam).toBeUndefined();
        });

        it('all sub-processors with header parameters should have type "array"', () => {
            for (const sub of processor.processors!) {
                const headerParam = sub.parameters?.find(
                    (p) => p.name === 'header',
                );
                if (headerParam) {
                    expect(headerParam.type)
                        .withContext(
                            `"${sub.command}" header param should be type "array"`,
                        )
                        .toBe('array');
                }
            }
        });

        it('"get" sub-processor should have a "proxy" parameter', () => {
            const sub = processor.processors!.find((p) => p.command === 'get');
            const proxyParam = sub!.parameters!.find((p) => p.name === 'proxy');
            expect(proxyParam).toBeDefined();
            expect(proxyParam!.type).toBe('boolean');
        });
    });

    describe('processCommand', () => {
        it('should have processCommand defined as a function', () => {
            expect(typeof processor.processCommand).toBe('function');
        });
    });

    describe('writeDescription', () => {
        it('should have writeDescription defined as a function', () => {
            expect(typeof processor.writeDescription).toBe('function');
        });
    });

    describe('initialize', () => {
        it('should have initialize defined as a function', () => {
            expect(typeof processor.initialize).toBe('function');
        });
    });
});
