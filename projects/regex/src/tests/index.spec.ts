import { CliRegexCommandProcessor } from '../lib';

describe('CliRegexCommandProcessor', () => {
    let processor: CliRegexCommandProcessor;

    beforeEach(() => {
        processor = new CliRegexCommandProcessor();
    });

    it('should be created', () => {
        expect(processor).toBeDefined();
    });

    describe('command identity', () => {
        it('should have command name "regex"', () => {
            expect(processor.command).toBe('regex');
        });

        it('should have a description defined', () => {
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

        it('should have at least 1 sub-processor', () => {
            expect(processor.processors!.length).toBeGreaterThanOrEqual(1);
        });

        it('should include "match" sub-processor', () => {
            const sub = processor.processors!.find(p => p.command === 'match');
            expect(sub).toBeDefined();
        });

        it('"match" sub-processor should have a description', () => {
            const sub = processor.processors!.find(p => p.command === 'match');
            expect(sub!.description).toBeDefined();
            expect(sub!.description!.length).toBeGreaterThan(0);
        });

        it('"match" sub-processor should have allowUnlistedCommands = true', () => {
            const sub = processor.processors!.find(p => p.command === 'match');
            expect(sub!.allowUnlistedCommands).toBe(true);
        });

        it('"match" sub-processor should have processCommand as a function', () => {
            const sub = processor.processors!.find(p => p.command === 'match');
            expect(typeof sub!.processCommand).toBe('function');
        });

        it('"match" sub-processor should have writeDescription as a function', () => {
            const sub = processor.processors!.find(p => p.command === 'match');
            expect(typeof sub!.writeDescription).toBe('function');
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
});
