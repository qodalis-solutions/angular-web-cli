import { Inject, Injectable } from '@angular/core';
import {
    ICliCommandExecutorService,
    ICliCommandProcessorRegistry,
} from '@qodalis/cli-core';
import { CliCommandExecutor } from '@qodalis/cli';
import { CliProcessorsRegistry_TOKEN } from '../tokens';

@Injectable({
    providedIn: 'root',
})
export class CliCommandExecutorService
    extends CliCommandExecutor
    implements ICliCommandExecutorService
{
    constructor(
        @Inject(CliProcessorsRegistry_TOKEN)
        registry: ICliCommandProcessorRegistry,
    ) {
        super(registry);
    }
}
