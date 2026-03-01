import { bootCliModule, ICliModule } from '@qodalis/cli-core';
import { CliRegexCommandProcessor } from './lib';

const module: ICliModule = {
    name: '@qodalis/cli-regex',
    processors: [new CliRegexCommandProcessor()],
};

bootCliModule(module);
