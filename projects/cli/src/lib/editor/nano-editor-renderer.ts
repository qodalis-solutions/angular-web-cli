import { Terminal } from '@xterm/xterm';
import { NanoEditorBuffer } from './nano-editor-buffer';

/**
 * Renders the nano-style editor UI to an xterm.js terminal.
 * Uses alternate screen buffer to preserve scroll history.
 */
export class NanoEditorRenderer {
    constructor(
        private readonly terminal: Terminal,
    ) {}

    /** Enter alternate screen buffer and hide default cursor. */
    enterAlternateScreen(): void {
        this.terminal.write('\x1b[?1049h');
        this.terminal.write('\x1b[?25l');
    }

    /** Leave alternate screen buffer and restore cursor. */
    leaveAlternateScreen(): void {
        this.terminal.write('\x1b[?25h');
        this.terminal.write('\x1b[?1049l');
    }

    /** Get the number of content rows available (total rows minus title and status bars). */
    get contentHeight(): number {
        return this.terminal.rows - 2;
    }

    /** Full redraw of the editor screen. */
    render(buffer: NanoEditorBuffer, fileName: string, statusMessage?: string): void {
        const { rows, cols } = this.terminal;

        buffer.ensureVisible(this.contentHeight);

        let output = '\x1b[?25l';

        // Title bar (row 1)
        output += '\x1b[H';
        output += this.renderTitleBar(fileName, buffer.dirty, cols);

        // Content area (rows 2 to rows-1)
        for (let i = 0; i < this.contentHeight; i++) {
            const lineIdx = buffer.scrollOffset + i;
            output += `\x1b[${i + 2};1H`;
            output += '\x1b[2K';

            if (lineIdx < buffer.lines.length) {
                const line = buffer.lines[lineIdx];
                output += line.length > cols ? line.slice(0, cols) : line;
            }
        }

        // Status bar (last row)
        output += `\x1b[${rows};1H`;
        output += this.renderStatusBar(statusMessage, cols);

        // Position cursor
        const screenRow = buffer.cursorRow - buffer.scrollOffset + 2;
        const screenCol = buffer.cursorCol + 1;
        output += `\x1b[${screenRow};${screenCol}H`;
        output += '\x1b[?25h';

        this.terminal.write(output);
    }

    /** Render just the status bar (for transient messages). */
    renderStatusOnly(buffer: NanoEditorBuffer, statusMessage: string): void {
        const { rows, cols } = this.terminal;

        let output = `\x1b[${rows};1H`;
        output += this.renderStatusBar(statusMessage, cols);

        const screenRow = buffer.cursorRow - buffer.scrollOffset + 2;
        const screenCol = buffer.cursorCol + 1;
        output += `\x1b[${screenRow};${screenCol}H`;

        this.terminal.write(output);
    }

    private renderTitleBar(fileName: string, dirty: boolean, cols: number): string {
        const title = `  CLI Nano  ${fileName || 'New Buffer'}${dirty ? ' (modified)' : ''}`;
        const padded = title.padEnd(cols);
        return `\x1b[7m${padded}\x1b[0m`;
    }

    private renderStatusBar(statusMessage: string | undefined, cols: number): string {
        const text = statusMessage || '  ^S Save  ^Q Quit  ^K Cut Line';
        const padded = text.padEnd(cols);
        return `\x1b[7m${padded}\x1b[0m`;
    }
}
