import {
    ITerminalOptions, ITerminalInitOnlyOptions, Terminal,
} from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import {
    CliOptions, CliProvider, ICliCommandProcessor, ICliModule, DefaultThemes,
    ICliCompletionProvider, ICliCompletionProvider_TOKEN,
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
import { welcomeModule } from '../services/cli-welcome-message';
import { OverlayAddon } from '../addons/overlay';
import { CliCommandHistory_TOKEN, CliModuleRegistry_TOKEN, CliProcessorsRegistry_TOKEN, CliStateStoreManager_TOKEN, ICliPingServerService_TOKEN } from '../tokens';
import { CliDefaultPingServerService } from '../services/defaults/cli-default-ping-server.service';
import { CliCommandCompletionProvider } from '../completion/cli-command-completion-provider';
import { CliParameterCompletionProvider } from '../completion/cli-parameter-completion-provider';

export interface CliEngineOptions extends CliOptions {
    terminalOptions?: Partial<ITerminalOptions & ITerminalInitOnlyOptions>;
}

export class CliEngine {
    private terminal!: Terminal;
    private fitAddon!: FitAddon;
    private executionContext!: CliExecutionContext;
    private registry: CliCommandProcessorRegistry;
    private userModules: ICliModule[] = [];
    private pendingServices: CliProvider[] = [];
    private resizeObserver?: ResizeObserver;
    private resizeListener?: () => void;
    private wheelListener?: (e: WheelEvent) => void;
    private bootService?: CliBoot;

    constructor(
        private readonly container: HTMLElement,
        private readonly options?: CliEngineOptions,
    ) {
        this.registry = new CliCommandProcessorRegistry();
    }

    /**
     * Register a CLI module to be loaded on start().
     */
    registerModule(module: ICliModule): void {
        this.userModules.push(module);
    }

    /**
     * Register multiple CLI modules to be loaded on start().
     */
    registerModules(modules: ICliModule[]): void {
        this.userModules.push(...modules);
    }

    /**
     * Register a command processor to be loaded on start().
     * @deprecated Use registerModule() instead.
     */
    registerProcessor(processor: ICliCommandProcessor): void {
        this.userModules.push({
            name: `__inline_${processor.command}`,
            processors: [processor],
        });
    }

    /**
     * Register multiple command processors to be loaded on start().
     * @deprecated Use registerModule() instead.
     */
    registerProcessors(processors: ICliCommandProcessor[]): void {
        this.userModules.push({
            name: '__inline_processors',
            processors,
        });
    }

    /**
     * Register a service to be available in the service container.
     * Must be called before start().
     * @deprecated Use registerModule() with services instead.
     */
    registerService(token: string, value: any): void {
        this.pendingServices.push({ provide: token, useValue: value });
    }

    /**
     * Initialize the terminal, wire up services, boot modules, and show welcome message.
     */
    async start(): Promise<void> {
        // 1. Wait for container to have layout, then initialize xterm.js
        await this.waitForLayout();
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

        // Register default services only if not already provided
        const pendingTokens = new Set(this.pendingServices.map((s) => s.provide));

        if (!pendingTokens.has(ICliPingServerService_TOKEN)) {
            services.set([{ provide: ICliPingServerService_TOKEN, useValue: new CliDefaultPingServerService() }]);
        }

        // 4. Create boot service with registry and services
        this.bootService = new CliBoot(this.registry, services);

        // Register the module registry so debug/introspection commands can access it
        services.set([
            { provide: CliModuleRegistry_TOKEN, useValue: this.bootService.getModuleRegistry() },
        ]);

        // 5. Create executor and execution context
        const executor = new CliCommandExecutor(this.registry);
        const terminalOptions = this.getTerminalOptions();

        this.executionContext = new CliExecutionContext(
            { services, logger, commandHistory, stateStoreManager },
            this.terminal,
            executor,
            { ...(this.options ?? {}), terminalOptions },
        );

        this.executionContext.initializeTerminalListeners();

        // 6. Prepend welcome module (users can override via configure)
        const allModules = [welcomeModule, ...this.userModules];

        // 7. Boot all modules (core + welcome + user modules)
        await this.bootService.boot(this.executionContext, allModules);

        // 8. Set up tab-completion providers
        const defaultProviders: ICliCompletionProvider[] = [
            new CliCommandCompletionProvider(this.registry),
            new CliParameterCompletionProvider(this.registry),
        ];

        // Collect plugin-registered providers (multi-service)
        let pluginProviders: ICliCompletionProvider[] = [];
        try {
            pluginProviders = services.get<ICliCompletionProvider[]>(ICliCompletionProvider_TOKEN) ?? [];
        } catch {
            // No plugin providers registered — that's fine
        }

        this.executionContext.completionEngine.setProviders([
            ...pluginProviders,
            ...defaultProviders,
        ]);

        // 9. Run onAfterBoot hooks sorted by priority (lower first)
        const sorted = [...allModules].sort(
            (a, b) => (a.priority ?? 0) - (b.priority ?? 0),
        );
        for (const module of sorted) {
            if (module.onAfterBoot) {
                try {
                    await module.onAfterBoot(this.executionContext);
                } catch (e) {
                    console.error(`Error in onAfterBoot for module "${module.name}":`, e);
                }
            }
        }
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

    /**
     * Wait until the container element has non-zero dimensions.
     * xterm.js requires the host element to be laid out before open() is called.
     */
    private waitForLayout(): Promise<void> {
        return new Promise<void>((resolve) => {
            const check = () => {
                if (this.container.offsetWidth > 0 && this.container.offsetHeight > 0) {
                    resolve();
                    return;
                }
                requestAnimationFrame(check);
            };
            check();
        });
    }
}
