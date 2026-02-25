// Re-export all system processors from @qodalis/cli
export {
    CliHelpCommandProcessor,
    CliVersionCommandProcessor,
    CliFeedbackCommandProcessor,
    CliHistoryCommandProcessor,
    CliHotKeysCommandProcessor,
    CliPackagesCommandProcessor,
    systemProcessors,
} from '@qodalis/cli';

/** @deprecated Use systemProcessors instead. */
import { systemProcessors } from '@qodalis/cli';
export const systemProviders = systemProcessors;
