/*
 * Public API Surface of todo
 */

export * from './lib/processors/cli-todo-command-processor';

import { ICliModule } from '@qodalis/cli-core';
import { CliTodoCommandProcessor } from './lib/processors/cli-todo-command-processor';

export const todoModule: ICliModule = {
    name: '@qodalis/cli-todo',
    processors: [new CliTodoCommandProcessor()],
};
