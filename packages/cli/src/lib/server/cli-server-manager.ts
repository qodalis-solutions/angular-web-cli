import {
    CliServerConfig,
    ICliCommandProcessorRegistry,
} from '@qodalis/cli-core';
import { CliServerConnection } from './cli-server-connection';
import { CliServerProxyProcessor } from './cli-server-proxy-processor';

export const CliServerManager_TOKEN = 'cli-server-manager';

export class CliServerManager {
    readonly connections = new Map<string, CliServerConnection>();
    private _logger?: { warn(msg: string): void; info(msg: string): void };

    constructor(private readonly registry: ICliCommandProcessorRegistry) {}

    async connectAll(
        servers: CliServerConfig[],
        logger?: { warn(msg: string): void; info(msg: string): void },
    ): Promise<void> {
        this._logger = logger;

        for (const config of servers) {
            if (config.enabled === false) continue;

            const connection = new CliServerConnection(config);
            this.connections.set(config.name, connection);

            connection.onDisconnect = () => {
                this.handleDisconnect(config.name);
            };

            await connection.connect();

            if (connection.connected) {
                logger?.info(
                    `Connected to server '${config.name}' (${connection.commands.length} commands)`,
                );
                this.registerProxyProcessors(connection, config.name);
            } else {
                logger?.warn(
                    `Could not connect to server '${config.name}' at ${config.url}. Commands from this server will not be available.`,
                );
            }
        }

        this.registerBareAliases();
    }

    async reconnect(
        name: string,
    ): Promise<{ success: boolean; commandCount: number }> {
        const connection = this.connections.get(name);
        if (!connection) {
            return { success: false, commandCount: 0 };
        }

        this.unregisterServerProcessors(name);

        connection.onDisconnect = () => {
            this.handleDisconnect(name);
        };

        await connection.connect();

        if (connection.connected) {
            this.registerProxyProcessors(connection, name);
            this.registerBareAliases();
            return { success: true, commandCount: connection.commands.length };
        }

        return { success: false, commandCount: 0 };
    }

    getConnection(name: string): CliServerConnection | undefined {
        return this.connections.get(name);
    }

    private handleDisconnect(name: string): void {
        this._logger?.warn(
            `Server '${name}' disconnected. Its commands are no longer available. Run 'server reconnect ${name}' to retry.`,
        );
        this.unregisterServerProcessors(name);
    }

    private unregisterServerProcessors(name: string): void {
        // Unregister namespaced processors
        const prefix = `${name}:`;
        const namespaced = this.registry.processors.filter((p) =>
            p.command.startsWith(prefix),
        );
        for (const p of namespaced) {
            this.registry.unregisterProcessor(p);
        }

        // Unregister bare aliases
        for (const p of [...this.registry.processors]) {
            if (p.metadata?.module === `server:${name}`) {
                this.registry.unregisterProcessor(p);
            }
        }
    }

    private registerProxyProcessors(
        connection: CliServerConnection,
        serverName: string,
    ): void {
        for (const descriptor of connection.commands) {
            const proxy = new CliServerProxyProcessor(
                connection,
                descriptor,
                serverName,
            );
            this.registry.registerProcessor(proxy);
        }
    }

    private registerBareAliases(): void {
        const commandCounts = new Map<string, string[]>();

        for (const [serverName, connection] of this.connections) {
            if (!connection.connected) continue;
            for (const cmd of connection.commands) {
                const existing = commandCounts.get(cmd.command) ?? [];
                existing.push(serverName);
                commandCounts.set(cmd.command, existing);
            }
        }

        for (const [command, servers] of commandCounts) {
            if (servers.length !== 1) continue;

            const serverName = servers[0];
            const namespacedCommand = `${serverName}:${command}`;
            const existingProcessor = this.registry.findProcessor(command, []);

            // Only register bare alias if no local processor owns this command
            if (existingProcessor && !existingProcessor.metadata?.requireServer)
                continue;

            const namespacedProcessor = this.registry.findProcessor(
                namespacedCommand,
                [],
            );
            if (!namespacedProcessor) continue;

            // Create a proper proxy processor instance (not a spread copy)
            // to preserve prototype methods like processCommand
            const connection = this.connections.get(serverName)!;
            const descriptor = connection.commands.find(
                (c) => c.command === command,
            )!;
            const alias = new CliServerProxyProcessor(
                connection,
                descriptor,
                serverName,
            );
            alias.command = command;
            alias.aliases = [namespacedCommand];

            this.registry.registerProcessor(alias);
        }
    }
}
