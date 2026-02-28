import { bootCliModule, ICliModule } from '@qodalis/cli-core';
import { CliYesnoCommandProcessor } from './lib';

const module: ICliModule = {
    name: '@qodalis/cli-yesno',
    processors: [new CliYesnoCommandProcessor()],
};

bootCliModule(module);
