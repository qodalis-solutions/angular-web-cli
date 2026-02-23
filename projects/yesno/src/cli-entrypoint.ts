import { bootUmdModule, ICliUmdModule } from '@qodalis/cli-core';
import { CliYesnoCommandProcessor } from './lib';

const module: ICliUmdModule = {
    name: '@qodalis/cli-yesno',
    processors: [new CliYesnoCommandProcessor()],
};

bootUmdModule(module);
