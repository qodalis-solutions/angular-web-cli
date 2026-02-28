import { bootCliModule, ICliModule } from '@qodalis/cli-core';
import { CliPasswordGeneratorCommandProcessor } from './lib/processors/cli-password-generator-command-processor';

const module: ICliModule = {
    name: '@qodalis/cli-password-generator',
    processors: [new CliPasswordGeneratorCommandProcessor()],
};

bootCliModule(module);
