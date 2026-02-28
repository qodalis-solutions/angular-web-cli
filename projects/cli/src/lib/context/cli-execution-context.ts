import { Terminal } from '@xterm/xterm';
import { Subject } from 'rxjs';
import {
    ICliExecutionContext,
    ICliTerminalWriter,
    ICliUserSession,
    CliOptions,
    ICliSpinner,
    ICliPercentageProgressBar,
    ICliClipboard,
    ICliExecutionProcess,
    ICliCommandProcessor,
    ICliLogger,
    CliLogLevel,
    ICliServiceProvider,
    ICliStateStore,
    ICliTextAnimator,
    ICliCommandExecutorService,
    ICliInputReader,
} from '@qodalis/cli-core';
import { CliTerminalWriter } from '../services/cli-terminal-writer';
import { CliTerminalSpinner } from '../services/progress-bars/cli-terminal-spinner';
import { CliTerminalProgressBar } from '../services/progress-bars/cli-terminal-progress-bar';
import { CliTerminalTextAnimator } from '../services/progress-bars/cli-terminal-text-animator';
import { CliClipboard } from '../services/cli-clipboard';
import { CliCommandHistory } from '../services/cli-command-history';
import { CliExecutionProcess } from './cli-execution-process';
import { CliStateStoreManager } from '../state/cli-state-store-manager';
import { CliInputReader, ActiveInputRequest, CliInputReaderHost } from '../services/cli-input-reader';
import { CliCompletionEngine } from '../completion/cli-completion-engine';
import {
    CliLineBuffer,
    IInputMode,
    CommandLineMode,
    CommandLineModeHost,
    ReaderMode,
    ReaderModeHost,
    RawMode,
    CliTerminalLineRenderer,
    PromptOptions,
} from '../input';

export interface CliExecutionContextDeps {
    services: ICliServiceProvider;
    logger: ICliLogger;
    commandHistory: CliCommandHistory;
    stateStoreManager: CliStateStoreManager;
}

export class CliExecutionContext
    implements ICliExecutionContext, CliInputReaderHost, CommandLineModeHost, ReaderModeHost
{
    public userSession?: ICliUserSession;

    public contextProcessor?: ICliCommandProcessor;

    public readonly writer: ICliTerminalWriter;

    public readonly spinner: ICliSpinner;

    public readonly textAnimator: ICliTextAnimator;

    public readonly progressBar: ICliPercentageProgressBar;

    public readonly options?: CliOptions;

    public readonly onAbort = new Subject<void>();

    public readonly state: ICliStateStore;

    public readonly clipboard: ICliClipboard;

    public readonly process: ICliExecutionProcess;

    public readonly logger: ICliLogger;

    public readonly services: ICliServiceProvider;

    public promptPathProvider?: () => string | null;

    public readonly completionEngine = new CliCompletionEngine();

    public promptLength: number = 0;

    public readonly reader: ICliInputReader;

    public readonly lineBuffer = new CliLineBuffer();

    public readonly lineRenderer: CliTerminalLineRenderer;

    public readonly commandHistory: CliCommandHistory;

    private _activeInputRequest: ActiveInputRequest | null = null;

    private readonly modeStack: IInputMode[] = [];

    constructor(
        deps: CliExecutionContextDeps,
        public terminal: Terminal,
        public executor: ICliCommandExecutorService,
        cliOptions?: CliOptions,
    ) {
        //initialize services
        this.services = deps.services;

        //initialize state store
        const stateStoreManager = deps.stateStoreManager;
        this.state = stateStoreManager.getStateStore('shared');

        this.options = cliOptions;
        this.writer = new CliTerminalWriter(terminal);

        const spinner = new CliTerminalSpinner(terminal);
        const progressBar = new CliTerminalProgressBar(terminal);
        const textAnimator = new CliTerminalTextAnimator(terminal);

        spinner.context = this;
        progressBar.context = this;
        textAnimator.context = this;

        this.spinner = spinner;
        this.progressBar = progressBar;
        this.textAnimator = textAnimator;

        this.clipboard = new CliClipboard(this);
        this.process = new CliExecutionProcess(this);

        this.reader = new CliInputReader(this);

        //initialize logger
        this.logger = deps.logger;
        this.logger.setCliLogLevel(cliOptions?.logLevel || CliLogLevel.ERROR);

        this.commandHistory = deps.commandHistory;
        this.lineRenderer = new CliTerminalLineRenderer(terminal, this.writer);
    }

    // -- Public API (ICliExecutionContext) --

    public get activeInputRequest(): ActiveInputRequest | null {
        return this._activeInputRequest;
    }

    /**
     * Sets the active input request. When a non-null request is provided,
     * pushes ReaderMode onto the mode stack. ReaderMode pops itself on
     * completion, so passing null here does NOT pop the mode.
     */
    public setActiveInputRequest(request: ActiveInputRequest | null): void {
        this._activeInputRequest = request;
        if (request !== null) {
            this.pushMode(new ReaderMode(this));
        }
    }

    public writeToTerminal(text: string): void {
        this.terminal.write(text);
    }

    public get currentLine(): string {
        return this.lineBuffer.text;
    }

    public get cursorPosition(): number {
        return this.lineBuffer.cursorPosition;
    }

    public set cursorPosition(value: number) {
        this.lineBuffer.cursorPosition = value;
    }

    initializeTerminalListeners(): void {
        // Push CommandLineMode as the base mode
        const commandLineMode = new CommandLineMode(this);
        this.pushMode(commandLineMode);

        this.terminal.onData(async (data) => {
            if (this.isProgressRunning()) {
                return;
            }
            const mode = this.currentMode;
            if (mode) {
                await mode.handleInput(data);
            }
        });

        this.terminal.onKey(async (_event) => {});

        this.terminal.attachCustomKeyEventHandler((event) => {
            if (event.type === 'keydown') {
                const mode = this.currentMode;
                if (mode) {
                    return mode.handleKeyEvent(event);
                }
            }
            return true;
        });
    }

    setContextProcessor = (
        processor: ICliCommandProcessor | undefined,
        silent?: boolean,
    ): void => {
        if (!processor) {
            // Clearing the context processor — pop RawMode if one was active
            if (this.contextProcessor?.onData) {
                this.popMode();
            }
            this.contextProcessor = undefined;
            return;
        }

        if (!silent) {
            this.writer.writeInfo(
                'Set ' +
                    processor?.command +
                    ' as context processor, press Ctrl+C to exit',
            );
        }

        this.contextProcessor = processor;

        // If processor has onData, push a RawMode to intercept all input
        if (processor.onData) {
            this.pushMode(new RawMode(processor, this));
        }
    };

    setCurrentLine(line: string): void {
        this.lineBuffer.setText(line);
    }

    clearLine(): void {
        this.lineRenderer.clearLine(
            this.promptLength + this.lineBuffer.text.length,
        );
    }

    showPrompt(options?: {
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
            this.lineBuffer.clear();
        }

        this.promptLength = this.lineRenderer.renderPrompt(
            this.getPromptOptions(),
        );
    }

    clearCurrentLine(): void {
        this.clearLine();
        this.showPrompt();
    }

    refreshCurrentLine(previousContentLength?: number): void {
        const promptStr = this.lineRenderer.getPromptString(
            this.getPromptOptions(),
        );
        this.lineRenderer.refreshLine(
            this.lineBuffer.text,
            this.lineBuffer.cursorPosition,
            this.promptLength,
            promptStr,
            previousContentLength,
        );
    }

    public isProgressRunning(): boolean {
        return (
            this.progressBar.isRunning ||
            this.spinner.isRunning ||
            this.textAnimator.isRunning
        );
    }

    public abort(): void {
        if (this.progressBar.isRunning) {
            this.progressBar.complete();
        }

        if (this.spinner?.isRunning) {
            this.spinner.hide();
        }

        if (this.textAnimator?.isRunning) {
            this.textAnimator.hide();
        }

        this.onAbort.next();
    }

    public setSession(session: ICliUserSession): void {
        this.userSession = session;
    }

    // -- CommandLineModeHost interface --

    getPromptOptions(): PromptOptions {
        return {
            userName: this.userSession?.displayName,
            hideUserName: this.options?.usersModule?.hideUserName,
            contextProcessor: this.contextProcessor?.command,
            pathProvider: this.promptPathProvider,
        };
    }

    getPromptLength(): number {
        return this.promptLength;
    }

    setPromptLength(value: number): void {
        this.promptLength = value;
    }

    getExecutionContext(): ICliExecutionContext {
        return this;
    }

    // -- ReaderModeHost interface --

    getActiveInputRequest(): ActiveInputRequest | null {
        return this._activeInputRequest;
    }

    // -- Mode stack management --

    private get currentMode(): IInputMode | undefined {
        return this.modeStack.length > 0
            ? this.modeStack[this.modeStack.length - 1]
            : undefined;
    }

    pushMode(mode: IInputMode): void {
        const previous = this.currentMode;
        if (previous?.deactivate) {
            previous.deactivate();
        }
        this.modeStack.push(mode);
        if (mode.activate) {
            mode.activate();
        }
    }

    popMode(): void {
        const removed = this.modeStack.pop();
        if (removed?.deactivate) {
            removed.deactivate();
        }
        const current = this.currentMode;
        if (current?.activate) {
            current.activate();
        }
    }
}
