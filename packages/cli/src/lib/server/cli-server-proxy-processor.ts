import {
    CliProcessCommand,
    CliProcessorMetadata,
    CliServerCommandDescriptor,
    CliServerResponse,
    ICliCommandParameterDescriptor,
    ICliCommandProcessor,
    ICliExecutionContext,
} from '@qodalis/cli-core';
import { CliServerConnection } from './cli-server-connection';

export class CliServerProxyProcessor implements ICliCommandProcessor {
    command: string;
    aliases?: string[];
    description?: string;
    version?: string;
    metadata?: CliProcessorMetadata;
    parameters?: ICliCommandParameterDescriptor[];
    processors?: ICliCommandProcessor[];

    constructor(
        private readonly connection: CliServerConnection,
        private readonly descriptor: CliServerCommandDescriptor,
        private readonly serverName: string,
    ) {
        this.command = `${serverName}:${descriptor.command}`;
        this.description = descriptor.description;
        this.version = descriptor.version;
        this.metadata = {
            module: `server:${serverName}`,
            icon: '\u{1F5A5}',
            requireServer: true,
        };
        this.parameters = descriptor.parameters?.map((p) => ({
            name: p.name,
            aliases: p.aliases,
            description: p.description,
            required: p.required,
            type: p.type,
            defaultValue: p.defaultValue,
        }));
        this.processors = descriptor.processors?.map(
            (sub) => new CliServerProxyProcessor(connection, sub, serverName),
        );
    }

    async processCommand(
        command: CliProcessCommand,
        context: ICliExecutionContext,
    ): Promise<void> {
        if (!this.connection.connected) {
            context.writer.writeError(
                `Server '${this.serverName}' is not reachable. Run 'server reconnect ${this.serverName}' to retry.`,
            );
            context.process.exit(1);
            return;
        }

        const serverCommand: CliProcessCommand = {
            ...command,
            command: this.descriptor.command,
        };

        try {
            context.spinner?.show('Executing on server...');
            const response = await this.connection.execute(serverCommand);
            context.spinner?.hide();
            this.renderResponse(response, context);
        } catch (e: any) {
            context.spinner?.hide();
            if (e.name === 'AbortError') {
                context.writer.writeError(
                    `Request to server '${this.serverName}' timed out after ${this.connection.config.timeout ?? 30000}ms.`,
                );
            } else {
                context.writer.writeError(
                    `Error communicating with server '${this.serverName}': ${e.message}`,
                );
            }
            context.process.exit(1);
        }
    }

    private renderResponse(
        response: CliServerResponse,
        context: ICliExecutionContext,
    ): void {
        for (const output of response.outputs ?? []) {
            switch (output.type) {
                case 'text': {
                    const style = output.style;
                    if (style === 'success')
                        context.writer.writeSuccess(output.value);
                    else if (style === 'error')
                        context.writer.writeError(output.value);
                    else if (style === 'info')
                        context.writer.writeInfo(output.value);
                    else if (style === 'warning')
                        context.writer.writeWarning(output.value);
                    else context.writer.writeln(output.value);
                    break;
                }
                case 'table':
                    context.writer.writeTable(output.headers, output.rows);
                    break;
                case 'list':
                    context.writer.writeList(output.items, {
                        ordered: output.ordered,
                    });
                    break;
                case 'json':
                    context.writer.writeJson(output.value);
                    break;
                case 'key-value': {
                    const record: Record<string, string> = {};
                    for (const e of output.entries) {
                        record[e.key] = e.value;
                    }
                    context.writer.writeKeyValue(record);
                    break;
                }
            }
        }

        if (response.exitCode !== 0) {
            context.process.exit(response.exitCode);
        }
    }
}
