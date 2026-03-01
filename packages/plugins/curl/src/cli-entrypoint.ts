import { bootCliModule, ICliModule } from '@qodalis/cli-core';
import { CliCurlCommandProcessor } from './lib/processors/cli-curl-command-processor';

const module: ICliModule = {
    name: '@qodalis/cli-curl',
    processors: [new CliCurlCommandProcessor()],
};

bootCliModule(module);
