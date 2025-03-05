import {
    Component,
    Inject,
    Injector,
    Input,
    OnInit,
    ViewEncapsulation,
} from '@angular/core';
import {
    CliForegroundColor,
    CliOptions,
    colorFirstWord,
    ICliUserSession,
    ICliUserSessionService,
} from '@qodalis/cli-core';
import {
    CliCommandExecutorService,
    CliCommandHistoryService,
} from './services';
import { CliKeyValueStore } from './storage/cli-key-value-store';
import {
    ITerminalInitOnlyOptions,
    ITerminalOptions,
    Terminal,
} from '@xterm/xterm';
import { ICliUserSessionService_TOKEN } from './tokens';
import { CliExecutionContext } from './context';
import { CliBoot } from './services/system/cli-boot';
import { CliWelcomeMessageService } from './services/system/cli-welcome-message.service';
import { BehaviorSubject, combineLatest, filter } from 'rxjs';
import { themes } from './processors/theme/types';
import { ContainerSize } from '../cli-terminal/cli-terminal.component';

@Component({
    selector: 'cli',
    templateUrl: './cli.component.html',
    styleUrls: ['./cli.component.sass'],
    encapsulation: ViewEncapsulation.None,
})
export class CliComponent implements OnInit {
    @Input() options?: CliOptions;

    @Input() height?: ContainerSize;

    protected terminalOptions!: ITerminalOptions & ITerminalInitOnlyOptions;
    private terminal!: Terminal;

    private currentLine = '';
    private executionContext?: CliExecutionContext;
    private currentUserSession: ICliUserSession | undefined;

    protected minDepsInitialized = new BehaviorSubject<boolean>(false);
    protected terminalInitialized = new BehaviorSubject<boolean>(false);

    constructor(
        private injector: Injector,
        @Inject(ICliUserSessionService_TOKEN)
        private readonly userManagementService: ICliUserSessionService,
        private commandExecutor: CliCommandExecutorService,
        private readonly commandHistoryService: CliCommandHistoryService,
        private readonly store: CliKeyValueStore,
    ) {
        this.userManagementService.getUserSession().subscribe((session) => {
            this.currentUserSession = session;
            this.executionContext?.setSession(session!);

            if (this.terminal) {
                this.printPrompt({
                    reset: true,
                });
            }
        });
    }

    ngOnInit(): void {
        combineLatest([this.minDepsInitialized, this.terminalInitialized])
            .pipe(filter(([x, y]) => x && y))
            .subscribe(() => {
                this.initialize();
            });

        this.terminalOptions = {
            cursorBlink: true,
            allowProposedApi: true,
            fontSize: 20,
            theme: themes.default,
            convertEol: true,
            ...(this.options?.terminalOptions ?? {}),
        };

        this.store.initialize().then(() => {
            this.minDepsInitialized.next(true);
        });
    }

    protected onTerminalReady(terminal: Terminal): void {
        this.terminal = terminal;

        this.terminalInitialized.next(true);
    }

    private initialize() {
        this.commandHistoryService.initialize().then(() => {
            this.historyIndex = this.commandHistoryService.getLastIndex();
        });

        this.addTerminalEventListeners();

        this.executionContext = new CliExecutionContext(
            this.injector,
            this.terminal,
            this.commandExecutor,
            (o) => this.printPrompt(o),
            {
                ...(this.options ?? {}),
                terminalOptions: this.terminalOptions,
            },
        );

        this.executionContext.setSession(this.currentUserSession!);

        this.injector
            .get(CliBoot)
            .boot(this.executionContext)
            .then(() => {
                this.injector
                    .get(CliWelcomeMessageService)
                    .displayWelcomeMessage(this.executionContext!);
            });
    }

    private getTerminalCursorPosition() {
        const x: number = (this.terminal as any)._core.buffer.x;
        const y: number = (this.terminal as any)._core.buffer.y;

        return {
            x,
            y,
        };
    }

    private selectionStart: { x: number; y: number } | null = null;
    private selectionEnd: { x: number; y: number } | null = null;

    private addTerminalEventListeners(): void {
        // Handle user input
        this.terminal.onData(async (data) => await this.handleInput(data));

        this.terminal.onKey(async (event) => {});

        this.terminal.attachCustomKeyEventHandler((event) => {
            if (event.type === 'keydown') {
                if (event.code === 'KeyC' && event.ctrlKey) {
                    // Handle Ctrl+C
                    this.executionContext?.abort();
                    this.executionContext?.setContextProcessor(undefined);
                    this.terminal.writeln('Ctrl+C');
                    this.printPrompt();

                    return false;
                }

                if (event.code === 'Escape') {
                    // Handle Escape
                    this.executionContext?.abort();
                    this.printPrompt({
                        newLine: true,
                    });

                    return false;
                }

                if (event.code === 'KeyV' && event.ctrlKey) {
                    //Handle Ctrl+V
                    return false;
                }

                if (event.code === 'KeyL' && event.ctrlKey) {
                    // Prevent the browser's default action (e.g., focusing the address bar)
                    event.preventDefault();

                    this.clearCurrentLine();

                    // Clear the terminal screen
                    this.terminal.clear();

                    return false;
                }

                if (
                    event.shiftKey &&
                    (event.code === 'ArrowLeft' || event.code === 'ArrowRight')
                ) {
                    if (!this.selectionStart) {
                        this.selectionStart = this.getTerminalCursorPosition();
                    }

                    switch (event.code) {
                        case 'ArrowLeft':
                            this.moveCursorLeft();
                            break;
                        case 'ArrowRight':
                            this.moveCursorRight();
                            break;
                    }

                    this.selectionEnd = this.getTerminalCursorPosition();

                    this.updateSelection();
                    return false;
                } else {
                    this.selectionStart = null;
                }
            }

            return true;
        });
    }

    private updateSelection(): void {
        if (this.selectionStart && this.selectionEnd) {
            const startRow = Math.min(
                this.selectionStart.y,
                this.selectionEnd.y,
            );
            const endRow = Math.max(this.selectionStart.y, this.selectionEnd.y);

            if (startRow === endRow) {
                const startCol = Math.min(
                    this.selectionStart.x,
                    this.selectionEnd.x,
                );
                const endCol = Math.max(
                    this.selectionStart.x,
                    this.selectionEnd.x,
                );

                // Select text on the same line
                this.terminal.select(
                    startCol,
                    startRow,
                    Math.abs(endCol - startCol),
                );
            } else {
                // Select multiple lines
                this.terminal.selectLines(startRow, endRow);
            }
        }
    }

    private printPrompt(options?: {
        reset?: boolean;
        newLine?: boolean;
        keepCurrentLine?: boolean;
    }): void {
        const { reset, newLine, keepCurrentLine } = options || {};

        if (reset) {
            this.terminal.write('\x1b[2K\r');
        }

        if (newLine) {
            this.terminal.write('\r\n');
        }

        if (!keepCurrentLine) {
            this.currentLine = '';
            this.cursorPosition = 0;
        }

        let promtStartMessage =
            this.options?.usersModule?.hideUserName ||
            !this.options?.usersModule?.enabled
                ? ''
                : `\x1b[32m${this.currentUserSession?.user.email}\x1b[0m:`;

        if (this.executionContext?.contextProcessor) {
            promtStartMessage = `${this.executionContext.contextProcessor.command}`;
        }

        const promtEndMessage = '\x1b[34m~\x1b[0m$ ';

        const prompt = `${promtStartMessage}${promtEndMessage}`;

        this.terminal.write(prompt);
    }

    private historyIndex: number = 0;
    private cursorPosition: number = 0;

    private async handleInput(data: string): Promise<void> {
        if (this.executionContext?.isProgressRunning()) {
            return;
        }

        if (data === '\r') {
            // Enter key: Process the current command
            this.terminal.write('\r\n'); // Move to the next line

            if (this.currentLine) {
                await this.commandHistoryService.addCommand(this.currentLine);

                this.historyIndex = this.commandHistoryService.getLastIndex();

                //reset cursor position
                this.cursorPosition = 0;

                await this.commandExecutor.executeCommand(
                    this.currentLine,
                    this.executionContext!,
                );

                //check if the command has subscribed to the onAbort event
                if (this.executionContext?.onAbort.observed) {
                    this.terminal.writeln(
                        '\x1b[33m' + 'Press Ctrl+C to cancel' + '\x1b[0m',
                    );
                }
            }

            this.printPrompt();
        } else if (data === '\u001B[A') {
            // Arrow Up
            this.showPreviousCommand();
        } else if (data === '\u001B[B') {
            // Arrow Down
            this.showNextCommand();
        } else if (data === '\u001B[D') {
            // Left Arrow
            this.moveCursorLeft(data);
        } else if (data === '\u001B[C') {
            // Right Arrow
            this.moveCursorRight(data);
        } else if (data === '\u007F') {
            // Backspace key
            this.handleBackspace();
        } else {
            // Append character at cursor position
            this.handleInputText(data);
        }
    }

    private normalizeText(text: string): string {
        //handle tab
        if (text === '\u0009') {
            return '    ';
        }

        return text.replace(/[\r\n]+/g, '');
    }

    private handleInputText(text: string): void {
        text = this.normalizeText(text);

        this.currentLine =
            this.currentLine.slice(0, this.cursorPosition) +
            text +
            this.currentLine.slice(this.cursorPosition);

        this.cursorPosition += text.length;

        this.refreshCurrentLine();
    }

    private refreshCurrentLine(): void {
        this.terminal.write('\x1b[2K'); // Clear the current line
        this.terminal.write('\r'); // Move the cursor to the start

        this.printPrompt({
            keepCurrentLine: true,
        });

        // Redraw the prompt
        this.writeCurrentLine();

        // Move cursor to the correct position
        const cursorOffset = this.currentLine.length - this.cursorPosition;
        if (cursorOffset > 0) {
            this.terminal.write(`\x1b[${cursorOffset}D`);
        }
    }

    private writeCurrentLine() {
        this.terminal.write(
            colorFirstWord(
                this.currentLine,
                (word) =>
                    this.executionContext?.writer.wrapInColor(
                        word,
                        CliForegroundColor.Yellow,
                    ) ?? this.currentLine,
            ),
        );
    }

    private showPreviousCommand(): void {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.displayCommandFromHistory();
        }
    }

    private showNextCommand(): void {
        if (this.historyIndex < this.commandHistoryService.getLastIndex() - 1) {
            this.historyIndex++;
            this.displayCommandFromHistory();
        } else {
            this.historyIndex = this.commandHistoryService.getLastIndex();
            this.clearCurrentLine();
        }
    }

    private displayCommandFromHistory(): void {
        this.clearCurrentLine();
        this.currentLine =
            this.commandHistoryService.getCommand(this.historyIndex) || '';
        this.writeCurrentLine();
        this.cursorPosition = this.currentLine.length;
    }

    private clearCurrentLine(): void {
        const wrappedLines = Math.ceil(
            this.currentLine.length / this.terminal.cols,
        );

        for (let i = 0; i < wrappedLines; i++) {
            this.terminal.write('\x1b[2K'); // Clear the current line
            this.terminal.write('\r'); // Move the cursor to the start of the line
            if (i < wrappedLines - 1) {
                this.terminal.write('\x1b[F'); // Move the cursor up for all but the last line
            }

            if (i === wrappedLines - 1) {
                this.terminal.write('\r');
                this.printPrompt();
            }
        }

        this.currentLine = '';
        this.cursorPosition = 0;
    }

    private moveCursorLeft(key: string = '\x1b[D'): void {
        if (this.cursorPosition > 0) {
            this.cursorPosition--;
            this.terminal.write(key);
        }
    }

    private moveCursorRight(key: string = '\x1b[C'): void {
        if (this.cursorPosition < this.currentLine.length) {
            this.cursorPosition++;
            this.terminal.write(key);
        }
    }

    private handleBackspace(): void {
        if (this.cursorPosition > 0) {
            this.currentLine =
                this.currentLine.slice(0, this.cursorPosition - 1) +
                this.currentLine.slice(this.cursorPosition);
            this.cursorPosition--;

            this.refreshCurrentLine();
        }
    }
}
