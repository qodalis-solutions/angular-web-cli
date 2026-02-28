import {
    CliServerConfig,
    ICliCommandProcessorRegistry,
} from '@qodalis/cli-core';
import { CliServerConnection } from './cli-server-connection';
import { CliServerProxyProcessor } from './cli-server-proxy-processor';

export const CliServerManager_TOKEN = 'cli-server-manager';

export class CliServerManager {
    readonly connections = new Map<string, CliServerConnection>();

    constructor(private readonly registry: ICliCommandProcessorRegistry) {}

    async connectAll(
        servers: CliServerConfig[],
        logger?: { warn(msg: string): void; info(msg: string): void },
    ): Promise<void> {
        for (const config of servers) {
            if (config.enabled === false) continue;

            const connection = new CliServerConnection(config);
            this.connections.set(config.name, connection);

            try {
                await connection.connect();
                logger?.info(
                    `Connected to server '${config.name}' (${connection.commands.length} commands)`,
                );
                this.registerProxyProcessors(connection, config.name);
            } catch {
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

        // Unregister existing proxy processors for this server
        const prefix = `${name}:`;
        const existing = this.registry.processors.filter((p) =>
            p.command.startsWith(prefix),
        );
        for (const p of existing) {
            this.registry.unregisterProcessor(p);
        }

        // Also unregister bare aliases
        for (const p of [...this.registry.processors]) {
            if (p.metadata?.module === `server:${name}`) {
                this.registry.unregisterProcessor(p);
            }
        }

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
            const existingProcessor = this.registry.findProcessor(
                command,
                [],
            );

            // Only register bare alias if no local processor owns this command
            if (existingProcessor && !existingProcessor.metadata?.requireServer)
                continue;

            const namespacedProcessor = this.registry.findProcessor(
                namespacedCommand,
                [],
            );
            if (!namespacedProcessor) continue;

            const alias: any = {
                ...namespacedProcessor,
                command,
                aliases: [namespacedCommand],
            };

            this.registry.registerProcessor(alias);
        }
    }
}
