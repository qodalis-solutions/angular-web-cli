import { bootCliModule, ICliModule } from '@qodalis/cli-core';
import { CliSpeedTestCommandProcessor } from './lib';

const module: ICliModule = {
    name: '@qodalis/cli-speed-test',
    processors: [new CliSpeedTestCommandProcessor()],
};

bootCliModule(module);
