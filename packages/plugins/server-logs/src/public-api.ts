/*
 * Public API Surface of server-logs
 */

export * from './lib/processors/cli-logs-command-processor';

import { ICliModule } from '@qodalis/cli-core';
import { CliLogsCommandProcessor } from './lib/processors/cli-logs-command-processor';

export const serverLogsModule: ICliModule = {
    name: '@qodalis/cli-server-logs',
    processors: [new CliLogsCommandProcessor()],
};
