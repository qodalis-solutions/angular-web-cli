import { NgModule } from '@angular/core';
import { resolveCommandProcessorProvider } from '@qodalis/angular-cli';
import { CliYesnoCommandProcessor } from './processors/cli-yesno-command-processor';

@NgModule({
    declarations: [],
    imports: [],
    exports: [],
    providers: [resolveCommandProcessorProvider(CliYesnoCommandProcessor)],
})
export class CliYesnoModule {}
