import {
    ITerminalOptions, ITerminalInitOnlyOptions, Terminal,
} from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import {
    CliOptions, CliProvider, ICliCommandProcessor, DefaultThemes,
} from '@qodalis/cli-core';
import { CliCommandExecutor } from '../executor/cli-command-executor';
import { CliCommandProcessorRegistry } from '../registry/cli-command-processor-registry';
import { CliExecutionContext } from '../context/cli-execution-context';
import { CliServiceContainer } from '../services/cli-service-container';
import { CliLogger } from '../services/cli-logger';
import { CliCommandHistory } from '../services/cli-command-history';
import { CliStateStoreManager } from '../state/cli-state-store-manager';
import { CliKeyValueStore } from '../storage/cli-key-value-store';
import { CliBoot } from '../services/cli-boot';
import { CliWelcomeMessage } from '../services/cli-welcome-message';
import { OverlayAddon } from '../addons/overlay';
import { builtinProcessors } from '../processors';
import { CliCommandHistory_TOKEN, CliProcessorsRegistry_TOKEN, CliStateStoreManager_TOKEN } from '../tokens';

export interface CliEngineOptions extends CliOptions {
    terminalOptions?: Partial<ITerminalOptions & ITerminalInitOnlyOptions>;
}

export class CliEngine {
    private terminal!: Terminal;
    private fitAddon!: FitAddon;
    private executionContext!: CliExecutionContext;
    private registry: CliCommandProcessorRegistry;
    private userProcessors: ICliCommandProcessor[] = [];
    private pendingServices: CliProvider[] = [];
    private resizeObserver?: ResizeObserver;
    private resizeListener?: () => void;
    private wheelListener?: (e: WheelEvent) => void;
    private bootService: CliBoot;

    constructor(
        private readonly container: HTMLElement,
        private readonly options?: CliEngineOptions,
    ) {
        this.registry = new CliCommandProcessorRegistry([...builtinProcessors]);
        this.bootService = new CliBoot(this.registry);
    }

    /**
     * Register a command processor to be loaded on start().
     */
    registerProcessor(processor: ICliCommandProcessor): void {
        this.userProcessors.push(processor);
    }

    /**
     * Register multiple command processors to be loaded on start().
     */
    registerProcessors(processors: ICliCommandProcessor[]): void {
        this.userProcessors.push(...processors);
    }

    /**
     * Register a service to be available in the service container.
     * Must be called before start().
     */
    registerService(token: string, value: any): void {
        this.pendingServices.push({ provide: token, useValue: value });
    }

    /**
     * Initialize the terminal, wire up services, boot processors, and show welcome message.
     */
    async start(): Promise<void> {
        // 1. Initialize xterm.js terminal
        this.initializeTerminal();

        // 2. Initialize storage (IndexedDB)
        const store = new CliKeyValueStore();
        await store.initialize();

        // 3. Build service container
        const services = new CliServiceContainer();
        const logger = new CliLogger();
        const commandHistory = new CliCommandHistory(store);
        await commandHistory.initialize();

        services.set([
            { provide: 'cli-key-value-store', useValue: store },
        ]);

        const stateStoreManager = new CliStateStoreManager(services, this.registry);

        services.set([
            { provide: CliStateStoreManager_TOKEN, useValue: stateStoreManager },
            { provide: CliProcessorsRegistry_TOKEN, useValue: this.registry },
            { provide: CliCommandHistory_TOKEN, useValue: commandHistory },
        ]);

        // Apply pending services registered before start()
        if (this.pendingServices.length > 0) {
            services.set(this.pendingServices);
        }

        // 4. Create executor and execution context
        const executor = new CliCommandExecutor(this.registry);
        const terminalOptions = this.getTerminalOptions();

        this.executionContext = new CliExecutionContext(
            { services, logger, commandHistory, stateStoreManager },
            this.terminal,
            executor,
            { ...(this.options ?? {}), terminalOptions },
        );

        this.executionContext.initializeTerminalListeners();

        // 5. Boot processors
        await this.bootService.boot(this.executionContext, this.userProcessors);

        // 6. Show welcome message
        const welcomeMessage = new CliWelcomeMessage();
        welcomeMessage.displayWelcomeMessage(this.executionContext);
    }

    /**
     * Clean up terminal and event listeners.
     */
    destroy(): void {
        if (this.resizeListener) {
            window.removeEventListener('resize', this.resizeListener);
        }
        if (this.wheelListener) {
            this.container.removeEventListener('wheel', this.wheelListener);
        }
        this.resizeObserver?.disconnect();
        this.terminal?.dispose();
    }

    /**
     * Focus the terminal and fit to container.
     */
    focus(): void {
        requestAnimationFrame(() => {
            this.fitAddon?.fit();
            this.terminal?.focus();
        });
    }

    /**
     * Get the underlying xterm.js Terminal instance.
     */
    getTerminal(): Terminal {
        return this.terminal;
    }

    /**
     * Get the execution context.
     */
    getContext(): CliExecutionContext {
        return this.executionContext;
    }

    /**
     * Get the command processor registry.
     */
    getRegistry(): CliCommandProcessorRegistry {
        return this.registry;
    }

    /**
     * Execute a command programmatically.
     */
    async execute(command: string): Promise<void> {
        if (this.executionContext) {
            await this.executionContext.executor.executeCommand(
                command,
                this.executionContext,
            );
        }
    }

    private getTerminalOptions(): ITerminalOptions & ITerminalInitOnlyOptions {
        return {
            cursorBlink: true,
            allowProposedApi: true,
            fontSize: 20,
            theme: DefaultThemes.default,
            convertEol: true,
            ...(this.options?.terminalOptions ?? {}),
        };
    }

    private initializeTerminal(): void {
        const opts = this.getTerminalOptions();
        this.terminal = new Terminal(opts);

        this.fitAddon = new FitAddon();
        this.terminal.loadAddon(this.fitAddon);
        this.terminal.loadAddon(new WebLinksAddon());
        this.terminal.loadAddon(new OverlayAddon());
        this.terminal.loadAddon(new Unicode11Addon());

        this.terminal.open(this.container);
        this.fitAddon.fit();

        // Prevent wheel events from scrolling the host page
        this.wheelListener = (e: WheelEvent) => e.preventDefault();
        this.container.addEventListener('wheel', this.wheelListener, { passive: false });

        this.terminal.focus();
        this.handleResize();
    }

    private handleResize(): void {
        this.resizeListener = () => this.fitAddon.fit();
        window.addEventListener('resize', this.resizeListener);

        this.resizeObserver = new ResizeObserver(() => this.fitAddon.fit());
        this.resizeObserver.observe(this.container);
    }
}
