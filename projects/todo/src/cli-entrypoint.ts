import { bootCliModule, ICliModule } from '@qodalis/cli-core';
import { CliTodoCommandProcessor } from './lib/processors/cli-todo-command-processor';

const module: ICliModule = {
    name: '@qodalis/cli-todo',
    processors: [new CliTodoCommandProcessor()],
};

bootCliModule(module);
