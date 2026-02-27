import { CliInputReader, ActiveInputRequest, CliInputReaderHost } from '../lib/services/cli-input-reader';

class MockHost implements CliInputReaderHost {
    activeInputRequest: ActiveInputRequest | null = null;
    writtenText: string[] = [];

    get activeRequest(): ActiveInputRequest | null {
        return this.activeInputRequest;
    }

    setActiveInputRequest(request: ActiveInputRequest | null): void {
        this.activeInputRequest = request;
    }

    writeToTerminal(text: string): void {
        this.writtenText.push(text);
    }

    reset(): void {
        this.activeInputRequest = null;
        this.writtenText = [];
    }
}

describe('CliInputReader', () => {
    let host: MockHost;
    let reader: CliInputReader;

    beforeEach(() => {
        host = new MockHost();
        reader = new CliInputReader(host);
    });

    describe('readLine', () => {
        it('should set an active input request of type line', () => {
            reader.readLine('Name: ');
            expect(host.activeInputRequest).not.toBeNull();
            expect(host.activeInputRequest!.type).toBe('line');
        });

        it('should write the prompt text to the terminal', () => {
            reader.readLine('Enter name: ');
            expect(host.writtenText).toContain('Enter name: ');
        });

        it('should initialize buffer as empty string', () => {
            reader.readLine('Name: ');
            expect(host.activeInputRequest!.buffer).toBe('');
            expect(host.activeInputRequest!.cursorPosition).toBe(0);
        });

        it('should reject if another request is already active', async () => {
            reader.readLine('First: ');
            await expectAsync(reader.readLine('Second: ')).toBeRejectedWithError('Another input request is already active');
        });

        it('should resolve with value when resolve is called', async () => {
            const promise = reader.readLine('Name: ');
            host.activeInputRequest!.resolve('test');
            const result = await promise;
            expect(result).toBe('test');
        });

        it('should resolve with null when resolve is called with null', async () => {
            const promise = reader.readLine('Name: ');
            host.activeInputRequest!.resolve(null);
            const result = await promise;
            expect(result).toBeNull();
        });
    });

    describe('readPassword', () => {
        it('should set an active input request of type password', () => {
            reader.readPassword('Password: ');
            expect(host.activeInputRequest).not.toBeNull();
            expect(host.activeInputRequest!.type).toBe('password');
        });

        it('should write the prompt text to the terminal', () => {
            reader.readPassword('Password: ');
            expect(host.writtenText).toContain('Password: ');
        });
    });

    describe('readConfirm', () => {
        it('should set an active input request of type confirm', () => {
            reader.readConfirm('Continue?');
            expect(host.activeInputRequest).not.toBeNull();
            expect(host.activeInputRequest!.type).toBe('confirm');
        });

        it('should display (y/N) hint when default is false', () => {
            reader.readConfirm('Continue?', false);
            expect(host.writtenText[0]).toContain('(y/N)');
        });

        it('should display (Y/n) hint when default is true', () => {
            reader.readConfirm('Continue?', true);
            expect(host.writtenText[0]).toContain('(Y/n)');
        });

        it('should store defaultValue on the request', () => {
            reader.readConfirm('Continue?', true);
            expect(host.activeInputRequest!.defaultValue).toBe(true);
        });

        it('should default to false when no defaultValue provided', () => {
            reader.readConfirm('Continue?');
            expect(host.activeInputRequest!.defaultValue).toBe(false);
        });
    });

    describe('readSelect', () => {
        const options = [
            { label: 'Option A', value: 'a' },
            { label: 'Option B', value: 'b' },
            { label: 'Option C', value: 'c' },
        ];

        it('should set an active input request of type select', () => {
            reader.readSelect('Pick one:', options);
            expect(host.activeInputRequest).not.toBeNull();
            expect(host.activeInputRequest!.type).toBe('select');
        });

        it('should store options and initialize selectedIndex to 0', () => {
            reader.readSelect('Pick one:', options);
            expect(host.activeInputRequest!.options).toBe(options);
            expect(host.activeInputRequest!.selectedIndex).toBe(0);
        });

        it('should reject with error for empty options', async () => {
            await expectAsync(reader.readSelect('Pick:', [])).toBeRejectedWithError('readSelect requires at least one option');
        });

        it('should write the prompt and render options', () => {
            reader.readSelect('Pick one:', options);
            expect(host.writtenText[0]).toContain('Pick one:');
            // Options are rendered after prompt
            expect(host.writtenText.length).toBeGreaterThan(1);
        });
    });
});
