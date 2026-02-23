import { CommandParser } from '../lib/parsers/command-parser';

describe('CommandParser', () => {
    let parser: CommandParser;

    beforeEach(() => {
        parser = new CommandParser();
    });

    it('should parse a simple command', () => {
        const result = parser.parse('echo hello');
        expect(result.commandName).toBe('echo hello');
        expect(result.args.length).toBe(0);
    });

    it('should parse command with flag arguments', () => {
        const result = parser.parse('build --verbose --output=dist');
        expect(result.commandName).toBe('build');
        expect(result.args).toContain(jasmine.objectContaining({ name: 'verbose', value: true }));
        expect(result.args).toContain(jasmine.objectContaining({ name: 'output', value: 'dist' }));
    });

    it('should parse numeric values', () => {
        const result = parser.parse('test --count=5');
        expect(result.args[0].value).toBe(5);
    });

    it('should parse boolean string values', () => {
        const result = parser.parse('test --flag=true');
        expect(result.args[0].value).toBe(true);
    });

    it('should handle quoted values', () => {
        const result = parser.parse('echo --msg="hello world"');
        expect(result.args[0].value).toBe('hello world');
    });

    it('should return empty command on invalid input', () => {
        const result = parser.parse('');
        expect(result.commandName).toBe('');
    });
});
