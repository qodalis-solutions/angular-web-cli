import { CliTodoCommandProcessor } from '../lib/processors/cli-todo-command-processor';

describe('CliTodoCommandProcessor', () => {
    let processor: CliTodoCommandProcessor;

    beforeEach(() => {
        // Mock localStorage to prevent errors in test environment
        if (typeof localStorage === 'undefined') {
            (window as any).localStorage = {
                getItem: () => null,
                setItem: () => {},
                removeItem: () => {},
            };
        }
        spyOn(localStorage, 'getItem').and.returnValue(null);

        processor = new CliTodoCommandProcessor();
    });

    it('should be created', () => {
        expect(processor).toBeDefined();
    });

    describe('command identity', () => {
        it('should have command name "todo"', () => {
            expect(processor.command).toBe('todo');
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

        it('should include "ls" sub-processor', () => {
            const sub = processor.processors!.find(p => p.command === 'ls');
            expect(sub).toBeDefined();
            expect(sub!.description).toBeDefined();
        });

        it('should include "add" sub-processor', () => {
            const sub = processor.processors!.find(p => p.command === 'add');
            expect(sub).toBeDefined();
            expect(sub!.description).toBeDefined();
        });

        it('should include "rm" sub-processor', () => {
            const sub = processor.processors!.find(p => p.command === 'rm');
            expect(sub).toBeDefined();
            expect(sub!.description).toBeDefined();
        });

        it('should include "complete" sub-processor', () => {
            const sub = processor.processors!.find(p => p.command === 'complete');
            expect(sub).toBeDefined();
            expect(sub!.description).toBeDefined();
        });

        it('should have all sub-processors with processCommand as a function', () => {
            for (const sub of processor.processors!) {
                expect(typeof sub.processCommand)
                    .withContext(`Sub-processor "${sub.command}" should have processCommand as a function`)
                    .toBe('function');
            }
        });
    });

    describe('sub-processor configuration', () => {
        it('"add" sub-processor should have valueRequired = true', () => {
            const sub = processor.processors!.find(p => p.command === 'add');
            expect(sub!.valueRequired).toBe(true);
        });

        it('"complete" sub-processor should have valueRequired = true', () => {
            const sub = processor.processors!.find(p => p.command === 'complete');
            expect(sub!.valueRequired).toBe(true);
        });

        it('"add" sub-processor should have allowUnlistedCommands = true', () => {
            const sub = processor.processors!.find(p => p.command === 'add');
            expect(sub!.allowUnlistedCommands).toBe(true);
        });

        it('"complete" sub-processor should have allowUnlistedCommands = true', () => {
            const sub = processor.processors!.find(p => p.command === 'complete');
            expect(sub!.allowUnlistedCommands).toBe(true);
        });

        it('"rm" sub-processor should have allowUnlistedCommands = true', () => {
            const sub = processor.processors!.find(p => p.command === 'rm');
            expect(sub!.allowUnlistedCommands).toBe(true);
        });

        it('"rm" sub-processor should have an "all" parameter', () => {
            const sub = processor.processors!.find(p => p.command === 'rm');
            expect(sub!.parameters).toBeDefined();
            const allParam = sub!.parameters!.find(p => p.name === 'all');
            expect(allParam).toBeDefined();
            expect(allParam!.type).toBe('boolean');
        });
    });

    describe('stateConfiguration', () => {
        it('should have stateConfiguration defined', () => {
            expect(processor.stateConfiguration).toBeDefined();
        });

        it('should have initialState with a todos property', () => {
            expect(processor.stateConfiguration!.initialState).toBeDefined();
            expect(processor.stateConfiguration!.initialState['todos']).toBeDefined();
        });

        it('should have todos initialized as an empty array', () => {
            const todos = processor.stateConfiguration!.initialState['todos'];
            expect(Array.isArray(todos)).toBe(true);
            expect(todos.length).toBe(0);
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
