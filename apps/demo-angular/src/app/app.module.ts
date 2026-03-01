import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import {
    CliModule,
    resolveCliProviders,
    resolveCliModuleProvider,
} from '@qodalis/angular-cli';
import { guidModule } from '@qodalis/cli-guid';
import { regexModule } from '@qodalis/cli-regex';
import { textToImageModule } from '@qodalis/cli-text-to-image';
import { speedTestModule } from '@qodalis/cli-speed-test';
import { browserStorageModule } from '@qodalis/cli-browser-storage';
import { stringModule } from '@qodalis/cli-string';
import { todoModule } from '@qodalis/cli-todo';
import { usersModule } from '@qodalis/cli-users';

// Demonstrates registering CLI modules via Angular DI (NgModule providers).
// These modules are injected into CliComponent via CliModule_TOKEN automatically.
// Works with .configure() too — usersModule.configure() returns an ICliModule.
@NgModule({
    declarations: [AppComponent],
    imports: [BrowserModule, CliModule],
    providers: [
        resolveCliProviders(),
        resolveCliModuleProvider(guidModule),
        resolveCliModuleProvider(regexModule),
        resolveCliModuleProvider(textToImageModule),
        resolveCliModuleProvider(speedTestModule),
        resolveCliModuleProvider(browserStorageModule),
        resolveCliModuleProvider(stringModule),
        resolveCliModuleProvider(todoModule),
        resolveCliModuleProvider(
            usersModule.configure({
                seedUsers: [
                    {
                        name: 'root1',
                        email: 'root1@root.com',
                        groups: ['admin'],
                    },
                ],
                defaultPassword: 'root',
                requirePassword: true,
            }),
        ),
    ],
    bootstrap: [AppComponent],
})
export class AppModule {}
