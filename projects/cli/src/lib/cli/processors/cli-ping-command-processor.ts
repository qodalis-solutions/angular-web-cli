import { Inject, Injectable } from '@angular/core';
import { CliProcessorMetadata, DefaultLibraryAuthor } from '@qodalis/cli-core';
import {
    CliProcessCommand,
    ICliCommandAuthor,
    ICliCommandProcessor,
    ICliExecutionContext,
    ICliPingServerService,
} from '@qodalis/cli-core';
import { ICliPingServerService_TOKEN } from '../tokens';

@Injectable()
export class CliPingCommandProcessor implements ICliCommandProcessor {
    command = 'ping';

    description?: string | undefined = 'Pings the server';

    author?: ICliCommandAuthor | undefined = DefaultLibraryAuthor;

    metadata?: CliProcessorMetadata | undefined = {
        icon: '🏓',
    };

    constructor(
        @Inject(ICliPingServerService_TOKEN)
        private pingServerService: ICliPingServerService,
    ) {}

    async processCommand(
        _: CliProcessCommand,
        context: ICliExecutionContext,
    ): Promise<void> {
        context.spinner?.show();
        context?.spinner?.setText('Pinging server...');
        this.pingServerService
            .ping()
            .then(() => {
                context.spinner?.hide();
                context.writer.writeln('pong');
                context.showPrompt();
            })
            .catch(() => {
                context.spinner?.hide();
                context.writer.writeError('Failed to ping the server');
                context.showPrompt();
            });
    }
}
