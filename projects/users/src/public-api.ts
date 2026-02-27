/*
 * Public API Surface of users
 */

export * from './lib/processors';
export * from './lib/services';
export * from './lib/models/users-module-config';

import {
    ICliModule,
    ICliKeyValueStore,
    ICliUsersStoreService,
    ICliGroupsStoreService,
    ICliAuthService,
    ICliUser,
    ICliUsersStoreService_TOKEN,
    ICliUserSessionService_TOKEN,
    ICliGroupsStoreService_TOKEN,
    ICliAuthService_TOKEN,
} from '@qodalis/cli-core';

import { CliWhoamiCommandProcessor } from './lib/processors/cli-whoami-command-processor';
import { CliAddUserCommandProcessor } from './lib/processors/cli-add-user-command-processor';
import { CliListUsersCommandProcessor } from './lib/processors/cli-list-users-command-processor';
import { CliSwitchUserCommandProcessor } from './lib/processors/cli-switch-user-command-processor';
import { CliUserdelCommandProcessor } from './lib/processors/cli-userdel-command-processor';
import { CliUsermodCommandProcessor } from './lib/processors/cli-usermod-command-processor';
import { CliPasswdCommandProcessor } from './lib/processors/cli-passwd-command-processor';
import { CliLoginCommandProcessor } from './lib/processors/cli-login-command-processor';
import { CliLogoutCommandProcessor } from './lib/processors/cli-logout-command-processor';
import { CliIdCommandProcessor } from './lib/processors/cli-id-command-processor';
import { CliGroupsCommandProcessor } from './lib/processors/cli-groups-command-processor';
import { CliGroupaddCommandProcessor } from './lib/processors/cli-groupadd-command-processor';
import { CliGroupdelCommandProcessor } from './lib/processors/cli-groupdel-command-processor';
import { CliWhoCommandProcessor } from './lib/processors/cli-who-command-processor';

import { CliDefaultUsersStoreService } from './lib/services/cli-default-users-store.service';
import { CliDefaultUserSessionService } from './lib/services/cli-default-user-session.service';
import { CliDefaultGroupsStoreService } from './lib/services/cli-default-groups-store.service';
import { CliDefaultAuthService } from './lib/services/cli-default-auth.service';
import { CliUsersModuleConfig, CliUsersModuleConfig_TOKEN } from './lib/models/users-module-config';
import { firstValueFrom } from 'rxjs';

import { LIBRARY_VERSION } from './lib/version';

interface ICliUsersModule extends ICliModule {
    configure(config: CliUsersModuleConfig): ICliModule;
}

export const usersModule: ICliUsersModule = {
    name: '@qodalis/cli-users',
    version: LIBRARY_VERSION,
    description: 'Linux-style user and group management with authentication',
    processors: [
        new CliWhoamiCommandProcessor(),
        new CliAddUserCommandProcessor(),
        new CliListUsersCommandProcessor(),
        new CliSwitchUserCommandProcessor(),
        new CliUserdelCommandProcessor(),
        new CliUsermodCommandProcessor(),
        new CliPasswdCommandProcessor(),
        new CliLoginCommandProcessor(),
        new CliLogoutCommandProcessor(),
        new CliIdCommandProcessor(),
        new CliGroupsCommandProcessor(),
        new CliGroupaddCommandProcessor(),
        new CliGroupdelCommandProcessor(),
        new CliWhoCommandProcessor(),
    ],
    services: [
        { provide: ICliUsersStoreService_TOKEN, useValue: new CliDefaultUsersStoreService() },
        { provide: ICliGroupsStoreService_TOKEN, useValue: new CliDefaultGroupsStoreService() },
    ],

    configure(config: CliUsersModuleConfig): ICliModule {
        return { ...this, config };
    },

    async onInit(context) {
        const moduleConfig = (this.config || {}) as CliUsersModuleConfig;
        const kvStore = context.services.get<ICliKeyValueStore>('cli-key-value-store');

        // Register module config so processors can access it
        context.services.set([
            { provide: CliUsersModuleConfig_TOKEN, useValue: moduleConfig },
        ]);

        // Initialize users store
        const usersStore = context.services.get<ICliUsersStoreService>(ICliUsersStoreService_TOKEN);
        await (usersStore as CliDefaultUsersStoreService).initialize(kvStore);

        // Initialize groups store (depends on users store)
        const groupsStore = context.services.get<ICliGroupsStoreService>(ICliGroupsStoreService_TOKEN);
        await (groupsStore as CliDefaultGroupsStoreService).initialize(kvStore, usersStore);

        // Initialize session service
        const sessionService = new CliDefaultUserSessionService();
        await sessionService.initialize(kvStore);
        context.services.set([
            { provide: ICliUserSessionService_TOKEN, useValue: sessionService },
        ]);

        // Initialize auth service (depends on users store and session service)
        const authService = new CliDefaultAuthService();
        await authService.initialize(kvStore, usersStore, sessionService);
        context.services.set([
            { provide: ICliAuthService_TOKEN, useValue: authService },
        ]);

        // Seed additional users from config
        if (moduleConfig.seedUsers) {
            for (const seedUser of moduleConfig.seedUsers) {
                try {
                    const created = await usersStore.createUser(seedUser);
                    const password = moduleConfig.defaultPassword || 'root';
                    await authService.setPassword(created.id, password);
                } catch {
                    // User may already exist from previous boot — skip
                }
            }
        }

        // Restore session from IndexedDB, or auto-login as root
        const restoredSession = await sessionService.restoreSession();
        if (!restoredSession) {
            const rootUser = await firstValueFrom(usersStore.getUser('root'));
            if (rootUser) {
                await sessionService.setUserSession({
                    user: rootUser,
                    loginTime: Date.now(),
                    lastActivity: Date.now(),
                });
            }
        }

        // Resolve display name formatter (default: user.name)
        const formatDisplayName = moduleConfig.userDisplayFormatter
            ?? ((user: ICliUser) => user.name);

        // Subscribe session changes to execution context
        sessionService.getUserSession().subscribe(session => {
            if (session) {
                context.userSession = {
                    ...session,
                    displayName: formatDisplayName(session.user),
                };
            }
        });
    },
};
