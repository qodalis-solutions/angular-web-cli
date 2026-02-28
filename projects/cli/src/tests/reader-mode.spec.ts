import { ReaderMode, ReaderModeHost } from '../lib/input/reader-mode';
import { ActiveInputRequest } from '../lib/services/cli-input-reader';

class MockTerminal {
    written: string[] = [];

    write(data: string): void {
        this.written.push(data);
    }

    writeln(data: string): void {
        this.written.push(data + '\n');
    }
}

class MockReaderModeHost implements ReaderModeHost {
    terminal = new MockTerminal() as any;
    private _activeRequest: ActiveInputRequest | null = null;
    poppedMode = false;

    getActiveInputRequest(): ActiveInputRequest | null {
        return this._activeRequest;
    }

    setActiveInputRequest(request: ActiveInputRequest | null): void {
        this._activeRequest = request;
    }

    popMode(): void {
        this.poppedMode = true;
    }

    reset(): void {
        this._activeRequest = null;
        this.poppedMode = false;
        this.terminal.written = [];
    }
}

function createSelectRequest(
    options: { label: string; value: string }[],
    onChange?: (value: string) => void,
): { request: ActiveInputRequest; resolvedValue: Promise<string | null> } {
    let resolvePromise: (value: string | null) => void;
    const resolvedValue = new Promise<string | null>((resolve) => {
        resolvePromise = resolve;
    });

    const request: ActiveInputRequest = {
        type: 'select',
        promptText: 'Pick one:',
        resolve: (value: any) => resolvePromise(value),
        buffer: '',
        cursorPosition: 0,
        options,
        selectedIndex: 0,
        onChange,
    };

    return { request, resolvedValue };
}

describe('ReaderMode', () => {
    let host: MockReaderModeHost;
    let mode: ReaderMode;

    const options = [
        { label: 'Option A', value: 'a' },
        { label: 'Option B', value: 'b' },
        { label: 'Option C', value: 'c' },
    ];

    beforeEach(() => {
        host = new MockReaderModeHost();
        mode = new ReaderMode(host);
    });

    describe('handleSelectInput', () => {
        it('should call onChange when arrow down is pressed', async () => {
            const onChange = jasmine.createSpy('onChange');
            const { request } = createSelectRequest(options, onChange);
            host.setActiveInputRequest(request);

            await mode.handleInput('\u001B[B'); // Arrow Down

            expect(onChange).toHaveBeenCalledTimes(1);
            expect(onChange).toHaveBeenCalledWith('b');
            expect(request.selectedIndex).toBe(1);
        });

        it('should call onChange when arrow up is pressed after moving down', async () => {
            const onChange = jasmine.createSpy('onChange');
            const { request } = createSelectRequest(options, onChange);
            request.selectedIndex = 1; // Start at option B
            host.setActiveInputRequest(request);

            await mode.handleInput('\u001B[A'); // Arrow Up

            expect(onChange).toHaveBeenCalledTimes(1);
            expect(onChange).toHaveBeenCalledWith('a');
            expect(request.selectedIndex).toBe(0);
        });

        it('should not call onChange when arrow up at top of list', async () => {
            const onChange = jasmine.createSpy('onChange');
            const { request } = createSelectRequest(options, onChange);
            host.setActiveInputRequest(request);

            await mode.handleInput('\u001B[A'); // Arrow Up at index 0

            expect(onChange).not.toHaveBeenCalled();
            expect(request.selectedIndex).toBe(0);
        });

        it('should not call onChange when arrow down at bottom of list', async () => {
            const onChange = jasmine.createSpy('onChange');
            const { request } = createSelectRequest(options, onChange);
            request.selectedIndex = 2; // At last option
            host.setActiveInputRequest(request);

            await mode.handleInput('\u001B[B'); // Arrow Down at last index

            expect(onChange).not.toHaveBeenCalled();
            expect(request.selectedIndex).toBe(2);
        });

        it('should resolve with selected value on Enter', async () => {
            const onChange = jasmine.createSpy('onChange');
            const { request, resolvedValue } = createSelectRequest(options, onChange);
            request.selectedIndex = 1; // Option B
            host.setActiveInputRequest(request);

            await mode.handleInput('\r'); // Enter

            const result = await resolvedValue;
            expect(result).toBe('b');
            expect(host.poppedMode).toBe(true);
            expect(onChange).not.toHaveBeenCalled();
        });

        it('should navigate through all options with arrow down', async () => {
            const onChange = jasmine.createSpy('onChange');
            const { request } = createSelectRequest(options, onChange);
            host.setActiveInputRequest(request);

            await mode.handleInput('\u001B[B'); // Down to B
            await mode.handleInput('\u001B[B'); // Down to C

            expect(onChange).toHaveBeenCalledTimes(2);
            expect(onChange.calls.argsFor(0)).toEqual(['b']);
            expect(onChange.calls.argsFor(1)).toEqual(['c']);
            expect(request.selectedIndex).toBe(2);
        });

        it('should work without onChange callback', async () => {
            const { request } = createSelectRequest(options); // no onChange
            host.setActiveInputRequest(request);

            // Should not throw
            await mode.handleInput('\u001B[B');
            expect(request.selectedIndex).toBe(1);
        });
    });

    describe('handleKeyEvent - abort paths', () => {
        it('should resolve with null on Ctrl+C', () => {
            const onChange = jasmine.createSpy('onChange');
            const { request } = createSelectRequest(options, onChange);
            host.setActiveInputRequest(request);

            const event = new KeyboardEvent('keydown', { code: 'KeyC', ctrlKey: true });
            const result = mode.handleKeyEvent(event);

            expect(result).toBe(false);
            expect(host.poppedMode).toBe(true);
            expect(host.getActiveInputRequest()).toBeNull();
        });

        it('should resolve with null on Escape', () => {
            const onChange = jasmine.createSpy('onChange');
            const { request } = createSelectRequest(options, onChange);
            host.setActiveInputRequest(request);

            const event = new KeyboardEvent('keydown', { code: 'Escape' });
            const result = mode.handleKeyEvent(event);

            expect(result).toBe(false);
            expect(host.poppedMode).toBe(true);
            expect(host.getActiveInputRequest()).toBeNull();
        });

        it('should return true for other key events', () => {
            const { request } = createSelectRequest(options);
            host.setActiveInputRequest(request);

            const event = new KeyboardEvent('keydown', { code: 'KeyA' });
            const result = mode.handleKeyEvent(event);

            expect(result).toBe(true);
            expect(host.poppedMode).toBe(false);
        });
    });

    describe('handleInput with no active request', () => {
        it('should do nothing when no request is active', async () => {
            // No request set
            await mode.handleInput('\r');
            expect(host.poppedMode).toBe(false);
        });
    });
});
