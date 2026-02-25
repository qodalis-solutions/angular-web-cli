import { Provider } from '@angular/core';
import {
    ICliPingServerService_TOKEN as CLI_PING_TOKEN,
    ICliUserSessionService_TOKEN as CLI_USER_SESSION_TOKEN,
    ICliUsersStoreService_TOKEN as CLI_USERS_STORE_TOKEN,
} from './cli/tokens';
import { CliUserSessionService } from './cli/services/cli-user-session.service';
import { CliUsersStoreService } from './cli/services/cli-users-store.service';
import { CliDefaultPingServerService } from './cli/services';

/**
 * Angular DI providers for services that the framework-agnostic
 * processors in @qodalis/cli need. The CliComponent bridges these
 * into the engine's service container automatically.
 */
export const resolveCliProviders = (): Provider[] => {
    return [
        {
            useClass: CliUserSessionService,
            provide: CLI_USER_SESSION_TOKEN,
        },
        {
            useClass: CliUsersStoreService,
            provide: CLI_USERS_STORE_TOKEN,
        },
        {
            useClass: CliDefaultPingServerService,
            provide: CLI_PING_TOKEN,
        },
    ];
};
