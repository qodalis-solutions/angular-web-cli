import { bootCliModule, ICliModule } from '@qodalis/cli-core';
import { CliQrCommandProcessor } from './lib/processors/cli-qr-command-processor';

const module: ICliModule = {
    name: '@qodalis/cli-qr',
    processors: [new CliQrCommandProcessor()],
};

bootCliModule(module);
