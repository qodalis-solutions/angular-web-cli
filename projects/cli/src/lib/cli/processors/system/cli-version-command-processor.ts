import { Injectable } from '@angular/core';
import {
    ICliExecutionContext,
    CliProcessCommand,
    ICliCommandProcessor,
    ICliCommandAuthor,
    CliProcessorMetadata,
    CliIcon,
} from '@qodalis/cli-core';

import { DefaultLibraryAuthor } from '@qodalis/cli-core';
import { LIBRARY_VERSION } from '../../../version';
import { CLi_Name_Art } from '../../constants';

@Injectable({
    providedIn: 'root',
})
export class CliVersionCommandProcessor implements ICliCommandProcessor {
    command = 'version';

    description?: string | undefined = 'Prints the version information';

    processors?: ICliCommandProcessor[] | undefined = [];

    author?: ICliCommandAuthor | undefined = DefaultLibraryAuthor;

    metadata?: CliProcessorMetadata | undefined = {
        sealed: true,
        icon: CliIcon.Settings,
    };

    async processCommand(
        _: CliProcessCommand,
        context: ICliExecutionContext,
    ): Promise<void> {
        context.writer.writeln(CLi_Name_Art);
        context.writer.writeln(`CLI Version: ${LIBRARY_VERSION}`);
    }

    writeDescription(context: ICliExecutionContext): void {
        context.writer.writeln('Prints the current version of the CLI');
    }
}
