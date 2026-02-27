import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { CliModule, resolveCliProviders } from '@qodalis/angular-cli';

@NgModule({
    declarations: [AppComponent],
    imports: [BrowserModule, CliModule],
    providers: [
        resolveCliProviders(),
    ],
    bootstrap: [AppComponent],
})
export class AppModule {}
