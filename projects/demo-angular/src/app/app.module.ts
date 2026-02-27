import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { CliModule, resolveCliProviders, ICliUsersStoreService_TOKEN } from '@qodalis/angular-cli';
import { CliCustomUsersStoreService } from './services/custom-users-store.service';

@NgModule({
    declarations: [AppComponent],
    imports: [BrowserModule, CliModule],
    providers: [
        resolveCliProviders(),
        {
            useClass: CliCustomUsersStoreService,
            provide: ICliUsersStoreService_TOKEN,
        },
    ],
    bootstrap: [AppComponent],
})
export class AppModule {}
