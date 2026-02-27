/*
 * Public API Surface of users
 */

export * from './lib/processors';
export * from './lib/services';

import {
    ICliModule,
    ICliUsersStoreService,
    ICliUserSessionService,
    ICliUsersStoreService_TOKEN,
    ICliUserSessionService_TOKEN,
} from '@qodalis/cli-core';
import { CliWhoamiCommandProcessor } from './lib/processors/cli-whoami-command-processor';
import { CliAddUserCommandProcessor } from './lib/processors/cli-add-user-command-processor';
import { CliListUsersCommandProcessor } from './lib/processors/cli-list-users-command-processor';
import { CliSwitchUserCommandProcessor } from './lib/processors/cli-switch-user-command-processor';
import { CliDefaultUsersStoreService } from './lib/services/cli-default-users-store.service';
import { CliDefaultUserSessionService } from './lib/services/cli-default-user-session.service';
import { LIBRARY_VERSION } from './lib/version';

export const usersModule: ICliModule = {
    name: '@qodalis/cli-users',
    version: LIBRARY_VERSION,
    description: 'User management commands (whoami, adduser, listusers, su)',
    processors: [
        new CliSwitchUserCommandProcessor(),
        new CliWhoamiCommandProcessor(),
        new CliAddUserCommandProcessor(),
        new CliListUsersCommandProcessor(),
    ],
    services: [
        { provide: ICliUsersStoreService_TOKEN, useValue: new CliDefaultUsersStoreService() },
    ],
    async onInit(context) {
        // Register user session service (depends on users store being available)
        const usersStore = context.services.get<ICliUsersStoreService>(ICliUsersStoreService_TOKEN);
        context.services.set([
            { provide: ICliUserSessionService_TOKEN, useValue: new CliDefaultUserSessionService(usersStore) },
        ]);

        // Subscribe to session changes and set on context
        const userSessionService = context.services.get<ICliUserSessionService>(ICliUserSessionService_TOKEN);
        if (userSessionService) {
            userSessionService.getUserSession().subscribe((session) => {
                if (session) {
                    context.userSession = session;
                }
            });
        }
    },
};
