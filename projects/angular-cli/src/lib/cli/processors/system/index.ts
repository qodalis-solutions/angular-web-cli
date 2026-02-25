import { ICliCommandProcessor } from '@qodalis/cli-core';
import { CliFeedbackCommandProcessor } from './cli-feedback-command-processor';
import { CliHelpCommandProcessor } from './cli-help-command-processor';
import { CliHistoryCommandProcessor } from './cli-history-command-processor';
import { CliHotKeysCommandProcessor } from './cli-hot-keys-command-processor';
import { CliPackagesCommandProcessor } from './cli-packages-command-processor';
import { CliVersionCommandProcessor } from './cli-version-command-processor';

export { CliPackagesCommandProcessor } from './cli-packages-command-processor';

export { CliHotKeysCommandProcessor } from './cli-hot-keys-command-processor';

export { CliHelpCommandProcessor } from './cli-help-command-processor';

export { CliVersionCommandProcessor } from './cli-version-command-processor';

export { CliHistoryCommandProcessor } from './cli-history-command-processor';

export { CliFeedbackCommandProcessor } from './cli-feedback-command-processor';

/**
 * All built-in system command processors as plain class instances.
 */
export const systemProcessors: ICliCommandProcessor[] = [
    new CliHelpCommandProcessor(),
    new CliVersionCommandProcessor(),
    new CliFeedbackCommandProcessor(),
    new CliHistoryCommandProcessor(),
    new CliPackagesCommandProcessor(),
    new CliHotKeysCommandProcessor(),
];

/**
 * @deprecated Use systemProcessors instead. Kept for backward compatibility.
 */
export const systemProviders = systemProcessors;
