import {
    CliAliasCommandProcessor,
    CliEchoCommandProcessor,
    CliEvalCommandProcessor,
    CliSleepCommandProcessor,
    CliUnAliasCommandProcessor,
} from '..';
import { CliClearCommandProcessor } from './cli-clear-command-processor';
import { CliTimeCommandProcessor } from './cli-time-command-processor';
import { CliUnameCommandProcessor } from './cli-uname-command-processor';

export * from './cli-echo-command-processor';
export * from './cli-clear-command-processor';
export * from './cli-alias-command-processor';
export * from './cli-unalias-command-processor';
export * from './cli-sleep-command-processor';
export * from './cli-time-command-processor';

export const miscProcessors = [
    new CliClearCommandProcessor(),
    new CliEchoCommandProcessor(),
    new CliEvalCommandProcessor(),
    new CliAliasCommandProcessor(),
    new CliUnAliasCommandProcessor(),
    new CliSleepCommandProcessor(),
    new CliUnameCommandProcessor(),
    new CliTimeCommandProcessor(),
];
