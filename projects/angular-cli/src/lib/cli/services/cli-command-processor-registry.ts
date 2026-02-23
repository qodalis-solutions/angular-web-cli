import { Injectable } from '@angular/core';
import { ICliCommandProcessorRegistry } from '@qodalis/cli-core';
import { CliCommandProcessorRegistry as BaseRegistry } from '@qodalis/cli';
import { miscProcessors } from '../processors';

@Injectable()
export class CliCommandProcessorRegistry
    extends BaseRegistry
    implements ICliCommandProcessorRegistry
{
    constructor() {
        super([...miscProcessors]);
    }
}
