import {
    ICliCommandProcessor,
    ICliExecutionContext,
    CliProcessCommand,
    CliProcessorMetadata,
    CliIcon,
    CliForegroundColor,
    ICliAuthService,
    ICliAuthService_TOKEN,
    DefaultLibraryAuthor,
    CliStateConfiguration,
} from '@qodalis/cli-core';

export class CliLoginCommandProcessor implements ICliCommandProcessor {
    command = 'login';
    description = 'Log in with username and password';
    author = DefaultLibraryAuthor;
    allowUnlistedCommands = true;
    valueRequired = false;
    metadata: CliProcessorMetadata = { sealed: true, module: 'users', icon: CliIcon.User };
    stateConfiguration: CliStateConfiguration = { initialState: {}, storeName: 'users' };

    private authService!: ICliAuthService;

    async initialize(context: ICliExecutionContext): Promise<void> {
        this.authService = context.services.get<ICliAuthService>(ICliAuthService_TOKEN);
    }

    async processCommand(command: CliProcessCommand, context: ICliExecutionContext): Promise<void> {
        let username = command.value as string;

        if (!username) {
            const input = await context.reader.readLine('Username: ');
            if (input === null) return;
            username = input;
        }

        if (!username) {
            context.writer.writeError('login: username required');
            return;
        }

        const password = await context.reader.readPassword('Password: ');
        if (password === null) return;

        try {
            const session = await this.authService.login(username, password);
            context.writer.writeSuccess(`Logged in as ${session.user.name}`);
        } catch (e: any) {
            context.writer.writeError(e.message || 'login: Authentication failure');
        }
    }

    writeDescription(context: ICliExecutionContext): void {
        const { writer } = context;
        writer.writeln('Log in with username and password');
        writer.writeln();
        writer.writeln(`  ${writer.wrapInColor('login', CliForegroundColor.Cyan)}                 Prompts for username and password`);
        writer.writeln(`  ${writer.wrapInColor('login <username>', CliForegroundColor.Cyan)}       Prompts for password only`);
    }
}
