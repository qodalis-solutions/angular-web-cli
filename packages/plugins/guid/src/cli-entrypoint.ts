import { bootCliModule, ICliModule } from '@qodalis/cli-core';
import { CliGuidCommandProcessor } from './lib';

const module: ICliModule = {
    name: '@qodalis/cli-guid',
    processors: [new CliGuidCommandProcessor()],
};

bootCliModule(module);
