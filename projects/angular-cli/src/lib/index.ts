import { Provider } from '@angular/core';
import { ICliCommandProcessor } from '@qodalis/cli-core';
import { resolveCommandProcessorProvider } from './utils';
import { CliPingCommandProcessor } from './cli/processors';
import { systemProcessors } from './cli/processors/system';
import { usersProviders } from './cli/processors/users';
import { CliThemeCommandProcessor } from './cli/processors/theme/cli-theme-command-processor';
import {
    ICliPingServerService_TOKEN,
    ICliUserSessionService_TOKEN,
    ICliUsersStoreService_TOKEN,
} from './cli/tokens';
import { CliUserSessionService } from './cli/services/cli-user-session.service';
import { CliUsersStoreService } from './cli/services/cli-users-store.service';
import { CliDefaultPingServerService } from './cli/services';

/**
 * Built-in system processors that are plain class instances (no Angular DI needed).
 * These are registered directly with the CliEngine.
 */
export const builtinProcessors: ICliCommandProcessor[] = [
    ...systemProcessors,
    new CliThemeCommandProcessor(),
];

/**
 * Angular DI providers for processors that require Angular injection
 * and the services they depend on.
 */
export const resolveCliProviders = (): Provider[] => {
    return [
        // Services needed by the Angular DI processors
        {
            useClass: CliUserSessionService,
            provide: ICliUserSessionService_TOKEN,
        },
        {
            useClass: CliUsersStoreService,
            provide: ICliUsersStoreService_TOKEN,
        },
        {
            useClass: CliDefaultPingServerService,
            provide: ICliPingServerService_TOKEN,
        },
        // Angular DI processors
        ...usersProviders,
        resolveCommandProcessorProvider(CliPingCommandProcessor),
    ];
};
