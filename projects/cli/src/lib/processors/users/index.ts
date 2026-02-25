import { ICliCommandProcessor } from '@qodalis/cli-core';
import { CliAddUserCommandProcessor } from './cli-add-user-command-processor';
import { CliListUsersCommandProcessor } from './cli-list-users-command-processor';
import { CliSwitchUserCommandProcessor } from './cli-switch-user-command-processor';
import { CliWhoamiCommandProcessor } from './cli-whoami-command-processor';

export { CliAddUserCommandProcessor } from './cli-add-user-command-processor';
export { CliListUsersCommandProcessor } from './cli-list-users-command-processor';
export { CliSwitchUserCommandProcessor } from './cli-switch-user-command-processor';
export { CliWhoamiCommandProcessor } from './cli-whoami-command-processor';

export const userProcessors: ICliCommandProcessor[] = [
    new CliSwitchUserCommandProcessor(),
    new CliWhoamiCommandProcessor(),
    new CliAddUserCommandProcessor(),
    new CliListUsersCommandProcessor(),
];
