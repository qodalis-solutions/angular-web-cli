/*
 * Public API Surface of guid
 */

export * from './lib/utilities';

export * from './lib/processors/cli-guid-command-processor';

import { ICliModule } from '@qodalis/cli-core';
import { CliGuidCommandProcessor } from './lib/processors/cli-guid-command-processor';

export const guidModule: ICliModule = {
    name: '@qodalis/cli-guid',
    processors: [new CliGuidCommandProcessor()],
};
