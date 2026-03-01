import { bootCliModule } from '@qodalis/cli-core';
import { CliLogsCommandProcessor } from './lib/processors/cli-logs-command-processor';

bootCliModule({
    name: '@qodalis/cli-server-logs',
    processors: [new CliLogsCommandProcessor()],
});
