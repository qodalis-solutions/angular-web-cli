import { ICliModule } from '../interfaces';

/**
 * Registry that tracks loaded CLI modules and dispatches boot handlers
 * when new modules are registered (including dynamically via UMD).
 */
export class CliModuleRegistry {
    private readonly modules = new Map<string, ICliModule>();
    private readonly bootHandlers: ((module: ICliModule) => Promise<void>)[] = [];

    /**
     * Register a handler that is called whenever a new module is registered.
     */
    onModuleBoot(handler: (module: ICliModule) => Promise<void>): void {
        this.bootHandlers.push(handler);
    }

    /**
     * Register a module and notify all boot handlers.
     */
    async register(module: ICliModule): Promise<void> {
        this.modules.set(module.name, module);
        for (const handler of this.bootHandlers) {
            await handler(module);
        }
    }

    /**
     * Get a module by name.
     */
    getModule(name: string): ICliModule | undefined {
        return this.modules.get(name);
    }

    /**
     * Get all registered modules.
     */
    getAll(): ICliModule[] {
        return Array.from(this.modules.values());
    }

    /**
     * Check if a module is registered.
     */
    has(name: string): boolean {
        return this.modules.has(name);
    }
}
