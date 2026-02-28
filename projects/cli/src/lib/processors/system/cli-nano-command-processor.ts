import {
    CliProcessCommand,
    ICliCommandProcessor,
    ICliExecutionContext,
    CliProcessorMetadata,
    CliIcon,
    CliForegroundColor,
    DefaultLibraryAuthor,
} from '@qodalis/cli-core';
import { NanoEditorBuffer } from '../../editor/nano-editor-buffer';
import { NanoEditorRenderer } from '../../editor/nano-editor-renderer';

/** Token string for IFileSystemService — avoid hard dependency on files plugin. */
const FS_TOKEN = 'cli-file-system-service';

/** Minimal interface for file operations (matches IFileSystemService). */
interface FileSystemLike {
    readFile(path: string): string | null;
    writeFile(path: string, content: string, append?: boolean): void;
    createFile(path: string, content?: string): void;
    exists(path: string): boolean;
    isDirectory(path: string): boolean;
    resolvePath(path: string): string;
    persist(): Promise<void>;
}

export class CliNanoCommandProcessor implements ICliCommandProcessor {
    command = 'nano';
    aliases = ['edit'];
    description = 'Open the built-in text editor';
    author = DefaultLibraryAuthor;
    allowUnlistedCommands = true;
    metadata: CliProcessorMetadata = {
        icon: '📝',
        module: 'system',
    };

    private buffer!: NanoEditorBuffer;
    private renderer!: NanoEditorRenderer;
    private filePath: string | null = null;
    private fs: FileSystemLike | null = null;
    private context!: ICliExecutionContext;
    private resizeDisposable: { dispose(): void } | null = null;
    private statusMessage: string | undefined;
    private statusTimeout: ReturnType<typeof setTimeout> | null = null;
    private promptingFileName = false;
    private fileNameBuffer = '';

    async processCommand(
        command: CliProcessCommand,
        context: ICliExecutionContext,
    ): Promise<void> {
        this.context = context;
        this.buffer = new NanoEditorBuffer();
        this.renderer = new NanoEditorRenderer(context.terminal);
        this.promptingFileName = false;
        this.fileNameBuffer = '';
        this.statusMessage = undefined;

        // Try to get filesystem service (optional)
        try {
            this.fs = context.services.get<FileSystemLike>(FS_TOKEN);
        } catch {
            this.fs = null;
        }

        // Parse file path from command
        const args = (command.value || '').trim();
        if (args) {
            this.filePath = args;

            if (this.fs) {
                try {
                    const resolved = this.fs.resolvePath(this.filePath);
                    if (this.fs.exists(resolved) && !this.fs.isDirectory(resolved)) {
                        const content = this.fs.readFile(resolved);
                        if (content !== null) {
                            this.buffer.load(content);
                        }
                        this.filePath = resolved;
                    } else if (this.fs.exists(resolved) && this.fs.isDirectory(resolved)) {
                        context.writer.writeError(`${this.filePath} is a directory`);
                        return;
                    } else {
                        this.filePath = resolved;
                        // New file — empty buffer is fine
                    }
                } catch (e: any) {
                    context.writer.writeError(e.message || 'Error opening file');
                    return;
                }
            }
        } else {
            this.filePath = null;
        }

        // Enter editor mode
        this.renderer.enterAlternateScreen();
        this.renderer.render(this.buffer, this.filePath || 'New Buffer');

        // Handle terminal resize
        this.resizeDisposable = context.terminal.onResize(() => {
            this.renderer.render(
                this.buffer,
                this.filePath || 'New Buffer',
                this.statusMessage,
            );
        });

        // Set as context processor to intercept all input
        context.setContextProcessor(this, true);
    }

    async onData(data: string, context: ICliExecutionContext): Promise<void> {
        // If prompting for filename, handle that separately
        if (this.promptingFileName) {
            this.handleFileNameInput(data);
            return;
        }

        // Control characters (Ctrl+key sends 0x01-0x1A)
        if (data === '\x13') {
            // Ctrl+S — Save
            await this.save();
            return;
        }

        if (data === '\x11') {
            // Ctrl+Q — Quit
            this.quit();
            return;
        }

        if (data === '\x0B') {
            // Ctrl+K — Cut line
            this.buffer.deleteLine();
            this.render();
            return;
        }

        // Enter
        if (data === '\r') {
            this.buffer.insertNewline();
            this.render();
            return;
        }

        // Backspace
        if (data === '\x7F') {
            this.buffer.deleteCharBefore();
            this.render();
            return;
        }

        // Delete key (escape sequence)
        if (data === '\x1b[3~') {
            this.buffer.deleteCharAt();
            this.render();
            return;
        }

        // Arrow keys
        if (data === '\x1b[A') { this.buffer.moveUp(); this.render(); return; }
        if (data === '\x1b[B') { this.buffer.moveDown(); this.render(); return; }
        if (data === '\x1b[C') { this.buffer.moveRight(); this.render(); return; }
        if (data === '\x1b[D') { this.buffer.moveLeft(); this.render(); return; }

        // Home / End
        if (data === '\x1b[H' || data === '\x1b[1~') {
            this.buffer.moveHome();
            this.render();
            return;
        }
        if (data === '\x1b[F' || data === '\x1b[4~') {
            this.buffer.moveEnd();
            this.render();
            return;
        }

        // Ignore other escape sequences
        if (data.startsWith('\x1b')) {
            return;
        }

        // Ignore other control characters
        if (data.length === 1 && data.charCodeAt(0) < 32) {
            return;
        }

        // Printable text — insert
        this.buffer.insertChar(data);
        this.render();
    }

    writeDescription({ writer }: ICliExecutionContext): void {
        writer.writeln('Open the built-in nano-style text editor');
        writer.writeln();
        writer.writeln('Usage:');
        writer.writeln(`  ${writer.wrapInColor('nano', CliForegroundColor.Cyan)}                    Open empty scratch buffer`);
        writer.writeln(`  ${writer.wrapInColor('nano <file>', CliForegroundColor.Cyan)}              Open or create a file`);
        writer.writeln();
        writer.writeln('Keyboard shortcuts:');
        writer.writeln(`  ${writer.wrapInColor('^S', CliForegroundColor.Yellow)}  Save file`);
        writer.writeln(`  ${writer.wrapInColor('^Q', CliForegroundColor.Yellow)}  Quit editor`);
        writer.writeln(`  ${writer.wrapInColor('^K', CliForegroundColor.Yellow)}  Cut current line`);
    }

    private render(): void {
        this.renderer.render(
            this.buffer,
            this.filePath || 'New Buffer',
            this.statusMessage,
        );
    }

    private showStatus(message: string, duration = 2000): void {
        this.statusMessage = `  ${message}`;
        this.renderer.renderStatusOnly(this.buffer, this.statusMessage);

        if (this.statusTimeout) {
            clearTimeout(this.statusTimeout);
        }
        this.statusTimeout = setTimeout(() => {
            this.statusMessage = undefined;
            this.render();
        }, duration);
    }

    private async save(): Promise<void> {
        if (!this.fs) {
            this.showStatus('No filesystem available — install @qodalis/cli-files');
            return;
        }

        if (!this.filePath) {
            // Prompt for filename
            this.promptingFileName = true;
            this.fileNameBuffer = '';
            this.renderer.renderStatusOnly(
                this.buffer,
                '  File Name to Write: ',
            );
            return;
        }

        try {
            const content = this.buffer.getContent();
            if (this.fs.exists(this.filePath)) {
                this.fs.writeFile(this.filePath, content);
            } else {
                this.fs.createFile(this.filePath, content);
            }
            await this.fs.persist();
            this.buffer.dirty = false;
            this.showStatus(`Saved ${this.filePath}`);
        } catch (e: any) {
            this.showStatus(`Error: ${e.message}`);
        }
    }

    private handleFileNameInput(data: string): void {
        if (data === '\r') {
            // Enter — confirm filename
            this.promptingFileName = false;
            const name = this.fileNameBuffer.trim();
            if (name) {
                this.filePath = this.fs!.resolvePath(name);
                this.save();
            } else {
                this.showStatus('Save cancelled');
            }
            return;
        }

        if (data === '\x1b' || data === '\x03') {
            // Escape or Ctrl+C — cancel
            this.promptingFileName = false;
            this.showStatus('Save cancelled');
            return;
        }

        if (data === '\x7F') {
            // Backspace
            if (this.fileNameBuffer.length > 0) {
                this.fileNameBuffer = this.fileNameBuffer.slice(0, -1);
            }
        } else if (data.length === 1 && data.charCodeAt(0) >= 32) {
            // Printable character
            this.fileNameBuffer += data;
        } else {
            return; // Ignore other keys
        }

        this.renderer.renderStatusOnly(
            this.buffer,
            `  File Name to Write: ${this.fileNameBuffer}`,
        );
    }

    private quit(): void {
        if (this.buffer.dirty) {
            this.showStatus(
                'Unsaved changes! ^S to save, ^Q again to discard',
                3000,
            );
            // Temporarily rebind Ctrl+Q to force-quit
            const originalOnData = this.onData.bind(this);
            this.onData = async (data: string, ctx: ICliExecutionContext) => {
                if (data === '\x11') {
                    // Second Ctrl+Q — force quit
                    this.onData = originalOnData;
                    this.cleanup();
                    return;
                }
                if (data === '\x13') {
                    // Ctrl+S — save then restore normal mode
                    this.onData = originalOnData;
                    await this.save();
                    return;
                }
                // Any other key — cancel quit, restore normal mode
                this.onData = originalOnData;
                this.statusMessage = undefined;
                this.render();
                await this.onData(data, ctx);
            };
            return;
        }

        this.cleanup();
    }

    private cleanup(): void {
        if (this.statusTimeout) {
            clearTimeout(this.statusTimeout);
        }
        this.resizeDisposable?.dispose();
        this.renderer.leaveAlternateScreen();
        this.context.setContextProcessor(undefined);
        this.context.showPrompt();
    }
}
