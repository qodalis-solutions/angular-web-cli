/**
 * Framework-agnostic token for the CLI command processor registry.
 * Used as a key in the service provider to retrieve the registry.
 */
export const CliProcessorsRegistry_TOKEN = 'cli-processors-registry';

/**
 * Framework-agnostic token for the CLI state store manager.
 * Used as a key in the service provider to retrieve the state store manager.
 */
export const CliStateStoreManager_TOKEN = 'cli-state-store-manager';

/**
 * Framework-agnostic token for the CLI command history service.
 * Used as a key in the service provider to retrieve the command history.
 */
export const CliCommandHistory_TOKEN = 'cli-command-history';

/**
 * Framework-agnostic token for the CLI ping server service.
 * Used as a key in the service provider to retrieve the ping server service.
 */
export const ICliPingServerService_TOKEN = 'cli-ping-server-service';

/**
 * Framework-agnostic token for the CLI user session service.
 * Used as a key in the service provider to retrieve the user session service.
 */
export const ICliUserSessionService_TOKEN = 'cli-user-session-service';

/**
 * Framework-agnostic token for the CLI users store service.
 * Used as a key in the service provider to retrieve the users store service.
 */
export const ICliUsersStoreService_TOKEN = 'cli-users-store-service';
