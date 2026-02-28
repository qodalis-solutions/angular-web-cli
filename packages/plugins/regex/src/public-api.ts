/*
 * Public API Surface of regex
 */

export * from './lib/processors/cli-regex-command-processor';

import { ICliModule } from '@qodalis/cli-core';
import { CliRegexCommandProcessor } from './lib/processors/cli-regex-command-processor';

export const regexModule: ICliModule = {
    name: '@qodalis/cli-regex',
    processors: [new CliRegexCommandProcessor()],
};
