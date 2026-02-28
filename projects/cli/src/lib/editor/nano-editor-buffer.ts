/**
 * Text buffer for the nano-style editor.
 * Manages lines of text, cursor position, scroll offset, and edit operations.
 */
export class NanoEditorBuffer {
    lines: string[] = [''];
    cursorRow = 0;
    cursorCol = 0;
    scrollOffset = 0;
    dirty = false;

    /** Load content into the buffer, replacing existing content. */
    load(content: string): void {
        this.lines = content.split('\n');
        if (this.lines.length === 0) {
            this.lines = [''];
        }
        this.cursorRow = 0;
        this.cursorCol = 0;
        this.scrollOffset = 0;
        this.dirty = false;
    }

    /** Get the full buffer content as a single string. */
    getContent(): string {
        return this.lines.join('\n');
    }

    /** Insert a character at the current cursor position. */
    insertChar(ch: string): void {
        const line = this.lines[this.cursorRow];
        this.lines[this.cursorRow] =
            line.slice(0, this.cursorCol) + ch + line.slice(this.cursorCol);
        this.cursorCol += ch.length;
        this.dirty = true;
    }

    /** Insert a newline, splitting the current line at the cursor. */
    insertNewline(): void {
        const line = this.lines[this.cursorRow];
        const before = line.slice(0, this.cursorCol);
        const after = line.slice(this.cursorCol);
        this.lines[this.cursorRow] = before;
        this.lines.splice(this.cursorRow + 1, 0, after);
        this.cursorRow++;
        this.cursorCol = 0;
        this.dirty = true;
    }

    /** Delete the character before the cursor (backspace). */
    deleteCharBefore(): void {
        if (this.cursorCol > 0) {
            const line = this.lines[this.cursorRow];
            this.lines[this.cursorRow] =
                line.slice(0, this.cursorCol - 1) + line.slice(this.cursorCol);
            this.cursorCol--;
            this.dirty = true;
        } else if (this.cursorRow > 0) {
            const prevLine = this.lines[this.cursorRow - 1];
            const curLine = this.lines[this.cursorRow];
            this.cursorCol = prevLine.length;
            this.lines[this.cursorRow - 1] = prevLine + curLine;
            this.lines.splice(this.cursorRow, 1);
            this.cursorRow--;
            this.dirty = true;
        }
    }

    /** Delete the character at the cursor (delete key). */
    deleteCharAt(): void {
        const line = this.lines[this.cursorRow];
        if (this.cursorCol < line.length) {
            this.lines[this.cursorRow] =
                line.slice(0, this.cursorCol) + line.slice(this.cursorCol + 1);
            this.dirty = true;
        } else if (this.cursorRow < this.lines.length - 1) {
            this.lines[this.cursorRow] = line + this.lines[this.cursorRow + 1];
            this.lines.splice(this.cursorRow + 1, 1);
            this.dirty = true;
        }
    }

    /** Delete the entire current line (Ctrl+K). */
    deleteLine(): void {
        if (this.lines.length === 1) {
            this.lines[0] = '';
            this.cursorCol = 0;
        } else {
            this.lines.splice(this.cursorRow, 1);
            if (this.cursorRow >= this.lines.length) {
                this.cursorRow = this.lines.length - 1;
            }
            this.cursorCol = Math.min(
                this.cursorCol,
                this.lines[this.cursorRow].length,
            );
        }
        this.dirty = true;
    }

    /** Move cursor up one line. */
    moveUp(): void {
        if (this.cursorRow > 0) {
            this.cursorRow--;
            this.cursorCol = Math.min(
                this.cursorCol,
                this.lines[this.cursorRow].length,
            );
        }
    }

    /** Move cursor down one line. */
    moveDown(): void {
        if (this.cursorRow < this.lines.length - 1) {
            this.cursorRow++;
            this.cursorCol = Math.min(
                this.cursorCol,
                this.lines[this.cursorRow].length,
            );
        }
    }

    /** Move cursor left one character. */
    moveLeft(): void {
        if (this.cursorCol > 0) {
            this.cursorCol--;
        } else if (this.cursorRow > 0) {
            this.cursorRow--;
            this.cursorCol = this.lines[this.cursorRow].length;
        }
    }

    /** Move cursor right one character. */
    moveRight(): void {
        if (this.cursorCol < this.lines[this.cursorRow].length) {
            this.cursorCol++;
        } else if (this.cursorRow < this.lines.length - 1) {
            this.cursorRow++;
            this.cursorCol = 0;
        }
    }

    /** Move cursor to the start of the current line. */
    moveHome(): void {
        this.cursorCol = 0;
    }

    /** Move cursor to the end of the current line. */
    moveEnd(): void {
        this.cursorCol = this.lines[this.cursorRow].length;
    }

    /**
     * Ensure the cursor row is visible within the viewport.
     * @param viewportHeight Number of visible content rows
     */
    ensureVisible(viewportHeight: number): void {
        if (this.cursorRow < this.scrollOffset) {
            this.scrollOffset = this.cursorRow;
        } else if (this.cursorRow >= this.scrollOffset + viewportHeight) {
            this.scrollOffset = this.cursorRow - viewportHeight + 1;
        }
    }
}
