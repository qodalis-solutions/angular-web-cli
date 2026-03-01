import { bootCliModule, ICliModule } from '@qodalis/cli-core';
import {
    CliCookiesCommandProcessor,
    CliLocalStorageCommandProcessor,
} from './lib/';

const module: ICliModule = {
    name: '@qodalis/cli-browser-storage',
    processors: [
        new CliCookiesCommandProcessor(),
        new CliLocalStorageCommandProcessor(),
    ],
};

bootCliModule(module);
