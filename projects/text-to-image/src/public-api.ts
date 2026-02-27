/*
 * Public API Surface of text-to-image
 */

export * from './lib/processors/cli-text-to-image-command-processor';

import { ICliModule } from '@qodalis/cli-core';
import { CliTextToImageCommandProcessor } from './lib/processors/cli-text-to-image-command-processor';

export const textToImageModule: ICliModule = {
    name: '@qodalis/cli-text-to-image',
    processors: [new CliTextToImageCommandProcessor()],
};
