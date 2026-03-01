/*
 * Public API Surface of string
 */

export * from './lib/processors/cli-password-generator-command-processor';

export * from './lib/version';

import { ICliModule } from '@qodalis/cli-core';
import { CliPasswordGeneratorCommandProcessor } from './lib/processors/cli-password-generator-command-processor';

export const passwordGeneratorModule: ICliModule = {
    name: '@qodalis/cli-password-generator',
    processors: [new CliPasswordGeneratorCommandProcessor()],
};
