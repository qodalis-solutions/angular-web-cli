import {
    CliProcessCommand,
    CliIcon,
    ICliCommandProcessor,
    ICliCommandChildProcessor,
    ICliExecutionContext,
} from '@qodalis/cli-core';
import {
    CliServerManager,
    CliServerManager_TOKEN,
} from './cli-server-manager';

export class CliServerCommandProcessor implements ICliCommandProcessor {
    command = 'server';
    description = 'Manage remote CLI server connections';
    metadata = {
        icon: CliIcon.Server,
        module: '@qodalis/cli-server',
        sealed: true,
    };
    processors: ICliCommandChildProcessor[] = [
        new ServerListProcessor(),
        new ServerStatusProcessor(),
        new ServerReconnectProcessor(),
    ];

    async processCommand(
        _command: CliProcessCommand,
        context: ICliExecutionContext,
    ): Promise<void> {
        context.writer.writeln('Usage: server <list|status|reconnect>');
        context.writer.writeln('Run "help server" for details.');
    }
}

class ServerListProcessor implements ICliCommandChildProcessor {
    command = 'list';
    description = 'Show configured servers and their connection status';
    parent?: ICliCommandProcessor;

    async processCommand(
        _command: CliProcessCommand,
        context: ICliExecutionContext,
    ): Promise<void> {
        const manager =
            context.services.get<CliServerManager>(CliServerManager_TOKEN);

        if (!manager || manager.connections.size === 0) {
            context.writer.writeInfo('No servers configured.');
            return;
        }

        const headers = ['Name', 'URL', 'Status', 'Commands'];
        const rows: string[][] = [];

        for (const [name, connection] of manager.connections) {
            rows.push([
                name,
                connection.config.url,
                connection.connected ? 'Connected' : 'Disconnected',
                connection.connected
                    ? String(connection.commands.length)
                    : '-',
            ]);
        }

        context.writer.writeTable(headers, rows);
    }
}

class ServerStatusProcessor implements ICliCommandChildProcessor {
    command = 'status';
    description = 'Ping a server and show its version';
    valueRequired = true;
    parent?: ICliCommandProcessor;

    async processCommand(
        command: CliProcessCommand,
        context: ICliExecutionContext,
    ): Promise<void> {
        const serverName = command.value;
        if (!serverName) {
            context.writer.writeError('Usage: server status <server-name>');
            context.process.exit(1);
            return;
        }

        const manager =
            context.services.get<CliServerManager>(CliServerManager_TOKEN);
        const connection = manager?.getConnection(serverName);

        if (!connection) {
            context.writer.writeError(`Unknown server: ${serverName}`);
            context.process.exit(1);
            return;
        }

        context.spinner?.show(`Pinging ${serverName}...`);
        const reachable = await connection.ping();
        context.spinner?.hide();

        if (reachable) {
            context.writer.writeSuccess(
                `Server '${serverName}' is reachable`,
            );
            context.writer.writeKeyValue({
                URL: connection.config.url,
                Connected: String(connection.connected),
                Commands: String(connection.commands.length),
            });
        } else {
            context.writer.writeError(
                `Server '${serverName}' is not reachable at ${connection.config.url}`,
            );
        }
    }
}

class ServerReconnectProcessor implements ICliCommandChildProcessor {
    command = 'reconnect';
    description = 'Re-fetch commands from a server';
    valueRequired = true;
    parent?: ICliCommandProcessor;

    async processCommand(
        command: CliProcessCommand,
        context: ICliExecutionContext,
    ): Promise<void> {
        const serverName = command.value;
        if (!serverName) {
            context.writer.writeError(
                'Usage: server reconnect <server-name>',
            );
            context.process.exit(1);
            return;
        }

        const manager =
            context.services.get<CliServerManager>(CliServerManager_TOKEN);

        if (!manager) {
            context.writer.writeError('Server manager not available.');
            context.process.exit(1);
            return;
        }

        context.spinner?.show(`Reconnecting to ${serverName}...`);
        const result = await manager.reconnect(serverName);
        context.spinner?.hide();

        if (result.success) {
            context.writer.writeSuccess(
                `Reconnected to '${serverName}'. ${result.commandCount} commands available.`,
            );
        } else {
            context.writer.writeError(
                `Could not reconnect to '${serverName}'.`,
            );
            context.process.exit(1);
        }
    }
}
