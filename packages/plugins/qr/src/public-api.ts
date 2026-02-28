/*
 * Public API Surface of qr
 */

export * from './lib/processors/cli-qr-command-processor';

export * from './lib/version';

import { ICliModule } from '@qodalis/cli-core';
import { CliQrCommandProcessor } from './lib/processors/cli-qr-command-processor';

export const qrModule: ICliModule = {
    name: '@qodalis/cli-qr',
    processors: [new CliQrCommandProcessor()],
};
