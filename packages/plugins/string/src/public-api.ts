/*
 * Public API Surface of string
 */

export * from './lib/processors/cli-string-command-processor';

import { ICliModule } from '@qodalis/cli-core';
import { CliStringCommandProcessor } from './lib/processors/cli-string-command-processor';

export const stringModule: ICliModule = {
    name: '@qodalis/cli-string',
    processors: [new CliStringCommandProcessor()],
};
