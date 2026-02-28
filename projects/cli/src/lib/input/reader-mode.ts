import { Terminal } from '@xterm/xterm';
import { IInputMode } from './input-mode';
import { ActiveInputRequest } from '../services/cli-input-reader';

/**
 * Host interface for ReaderMode — provides access to the active input request.
 */
export interface ReaderModeHost {
    readonly terminal: Terminal;
    getActiveInputRequest(): ActiveInputRequest | null;
    setActiveInputRequest(request: ActiveInputRequest | null): void;
    popMode(): void;
}

/**
 * Input mode for interactive reader prompts (readLine, readPassword,
 * readConfirm, readSelect). Pushed on top of CommandLineMode when
 * a reader request starts, pops itself when the request completes.
 */
export class ReaderMode implements IInputMode {
    constructor(private readonly host: ReaderModeHost) {}

    async handleInput(data: string): Promise<void> {
        const request = this.host.getActiveInputRequest();
        if (!request) {
            return;
        }

        switch (request.type) {
            case 'line':
                this.handleLineInput(request, data);
                break;
            case 'password':
                this.handlePasswordInput(request, data);
                break;
            case 'confirm':
                this.handleConfirmInput(request, data);
                break;
            case 'select':
                this.handleSelectInput(request, data);
                break;
        }
    }

    handleKeyEvent(event: KeyboardEvent): boolean {
        if (event.code === 'KeyC' && event.ctrlKey) {
            const request = this.host.getActiveInputRequest();
            if (request) {
                request.resolve(null);
                this.host.setActiveInputRequest(null);
                this.host.terminal.writeln('');
                this.host.popMode();
            }
            return false;
        }

        if (event.code === 'Escape') {
            const request = this.host.getActiveInputRequest();
            if (request) {
                request.resolve(null);
                this.host.setActiveInputRequest(null);
                this.host.terminal.writeln('');
                this.host.popMode();
            }
            return false;
        }

        return true;
    }

    private handleLineInput(request: ActiveInputRequest, data: string): void {
        if (data === '\r') {
            this.host.terminal.write('\r\n');
            const value = request.buffer;
            this.host.setActiveInputRequest(null);
            this.host.popMode();
            request.resolve(value);
        } else if (data === '\u007F') {
            if (request.cursorPosition > 0) {
                request.buffer =
                    request.buffer.slice(0, request.cursorPosition - 1) +
                    request.buffer.slice(request.cursorPosition);
                request.cursorPosition--;
                this.redrawReaderLine(request, request.buffer);
            }
        } else if (data === '\u001B[D') {
            if (request.cursorPosition > 0) {
                request.cursorPosition--;
                this.host.terminal.write(data);
            }
        } else if (data === '\u001B[C') {
            if (request.cursorPosition < request.buffer.length) {
                request.cursorPosition++;
                this.host.terminal.write(data);
            }
        } else if (data.startsWith('\u001B')) {
            // Ignore other escape sequences
        } else {
            const text = data.replace(/[\r\n]+/g, '');
            request.buffer =
                request.buffer.slice(0, request.cursorPosition) +
                text +
                request.buffer.slice(request.cursorPosition);
            request.cursorPosition += text.length;
            this.redrawReaderLine(request, request.buffer);
        }
    }

    private handlePasswordInput(request: ActiveInputRequest, data: string): void {
        if (data === '\r') {
            this.host.terminal.write('\r\n');
            const value = request.buffer;
            this.host.setActiveInputRequest(null);
            this.host.popMode();
            request.resolve(value);
        } else if (data === '\u007F') {
            if (request.cursorPosition > 0) {
                request.buffer =
                    request.buffer.slice(0, request.cursorPosition - 1) +
                    request.buffer.slice(request.cursorPosition);
                request.cursorPosition--;
                this.redrawReaderLine(request, '*'.repeat(request.buffer.length));
            }
        } else if (data.startsWith('\u001B')) {
            // Ignore all escape sequences for password
        } else {
            const text = data.replace(/[\r\n]+/g, '');
            request.buffer =
                request.buffer.slice(0, request.cursorPosition) +
                text +
                request.buffer.slice(request.cursorPosition);
            request.cursorPosition += text.length;
            this.redrawReaderLine(request, '*'.repeat(request.buffer.length));
        }
    }

    private handleConfirmInput(request: ActiveInputRequest, data: string): void {
        if (data === '\r') {
            this.host.terminal.write('\r\n');
            this.host.setActiveInputRequest(null);
            this.host.popMode();
            const buf = request.buffer.toLowerCase();
            if (buf === 'y') {
                request.resolve(true);
            } else if (buf === 'n') {
                request.resolve(false);
            } else {
                request.resolve(request.defaultValue ?? false);
            }
        } else if (data === '\u007F') {
            if (request.cursorPosition > 0) {
                request.buffer = request.buffer.slice(0, -1);
                request.cursorPosition--;
                this.redrawReaderLine(request, request.buffer);
            }
        } else if (data.startsWith('\u001B')) {
            // Ignore escape sequences
        } else {
            const char = data.toLowerCase();
            if (char === 'y' || char === 'n') {
                request.buffer = data;
                request.cursorPosition = 1;
                this.redrawReaderLine(request, request.buffer);
            }
        }
    }

    private handleSelectInput(request: ActiveInputRequest, data: string): void {
        const options = request.options!;
        const selectedIndex = request.selectedIndex!;

        if (data === '\r') {
            this.host.terminal.write('\r\n');
            this.host.setActiveInputRequest(null);
            this.host.popMode();
            request.resolve(options[selectedIndex].value);
        } else if (data === '\u001B[A') {
            if (selectedIndex > 0) {
                request.selectedIndex = selectedIndex - 1;
                this.redrawSelectOptions(request);
            }
        } else if (data === '\u001B[B') {
            if (selectedIndex < options.length - 1) {
                request.selectedIndex = selectedIndex + 1;
                this.redrawSelectOptions(request);
            }
        }
    }

    private redrawReaderLine(request: ActiveInputRequest, displayText: string): void {
        this.host.terminal.write('\x1b[2K\r');
        this.host.terminal.write(request.promptText + displayText);

        const cursorOffset = request.buffer.length - request.cursorPosition;
        if (cursorOffset > 0) {
            this.host.terminal.write(`\x1b[${cursorOffset}D`);
        }
    }

    private redrawSelectOptions(request: ActiveInputRequest): void {
        const options = request.options!;
        const selectedIndex = request.selectedIndex!;

        if (options.length > 0) {
            this.host.terminal.write(`\x1b[${options.length}A`);
        }

        for (let i = 0; i < options.length; i++) {
            this.host.terminal.write('\x1b[2K\r');
            const prefix = i === selectedIndex ? '  \x1b[36m> ' : '    ';
            const suffix = i === selectedIndex ? '\x1b[0m' : '';
            this.host.terminal.write(`${prefix}${options[i].label}${suffix}\r\n`);
        }
    }
}
