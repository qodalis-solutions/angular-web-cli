import {
    CliProcessCommand,
    DefaultLibraryAuthor,
    ICliCommandProcessor,
    ICliExecutionContext,
} from '@qodalis/cli-core';
import { IFileSystemService, IFileSystemService_TOKEN } from '../interfaces';
import { LIBRARY_VERSION } from '../version';

export class CliEchoCommandProcessor implements ICliCommandProcessor {
    command = 'echo';
    description = 'Display text or redirect output to a file';
    author = DefaultLibraryAuthor;
    version = LIBRARY_VERSION;
    allowUnlistedCommands = true;
    metadata = { icon: '💬', module: 'file management' };

    async processCommand(
        command: CliProcessCommand,
        context: ICliExecutionContext,
    ): Promise<void> {
        const fs = context.services.get<IFileSystemService>(IFileSystemService_TOKEN);
        const raw = command.rawCommand;

        const afterEcho = raw.substring(raw.indexOf('echo') + 5).trim();

        let text: string;
        let filePath: string | null = null;
        let append = false;

        const appendMatch = afterEcho.match(/^(.*?)\s*>>\s*(.+)$/);
        const overwriteMatch = afterEcho.match(/^(.*?)\s*>\s*(.+)$/);

        if (appendMatch) {
            text = appendMatch[1].trim();
            filePath = appendMatch[2].trim();
            append = true;
        } else if (overwriteMatch) {
            text = overwriteMatch[1].trim();
            filePath = overwriteMatch[2].trim();
            append = false;
        } else {
            text = afterEcho;
        }

        // Remove surrounding quotes
        if (
            (text.startsWith('"') && text.endsWith('"')) ||
            (text.startsWith("'") && text.endsWith("'"))
        ) {
            text = text.slice(1, -1);
        }

        if (filePath) {
            try {
                fs.writeFile(filePath, text + '\n', append);
                await fs.persist();
            } catch (e: any) {
                context.writer.writeError(e.message);
            }
        } else {
            context.writer.writeln(text);
        }
    }
}
