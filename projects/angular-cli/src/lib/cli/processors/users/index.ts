// Re-export all user processors from @qodalis/cli
export {
    CliAddUserCommandProcessor,
    CliListUsersCommandProcessor,
    CliSwitchUserCommandProcessor,
    CliWhoamiCommandProcessor,
    userProcessors,
} from '@qodalis/cli';

/** @deprecated Use userProcessors instead. */
import { userProcessors } from '@qodalis/cli';
export const usersProviders = userProcessors;
