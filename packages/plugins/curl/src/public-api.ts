/*
 * Public API Surface of curl
 */

export * from './lib/processors/cli-curl-command-processor';

import { ICliModule } from '@qodalis/cli-core';
import { CliCurlCommandProcessor } from './lib/processors/cli-curl-command-processor';

export const curlModule: ICliModule = {
    name: '@qodalis/cli-curl',
    processors: [new CliCurlCommandProcessor()],
};
