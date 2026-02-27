import { bootCliModule, ICliModule } from '@qodalis/cli-core';
import { CliStringCommandProcessor } from './lib/processors/cli-string-command-processor';

const module: ICliModule = {
    name: '@qodalis/cli-string',
    processors: [new CliStringCommandProcessor()],
};

bootCliModule(module);
