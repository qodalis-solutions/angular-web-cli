import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AppComponent } from './app.component';
import {
    CliModule,
    ICliUsersStoreService_TOKEN,
} from '@qodalis/angular-cli';
import { CliCustomUsersStoreService } from './services/custom-users-store.service';

@NgModule({
    declarations: [AppComponent],
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        CliModule,
    ],
    providers: [
        {
            useClass: CliCustomUsersStoreService,
            provide: ICliUsersStoreService_TOKEN,
        },
    ],
    bootstrap: [AppComponent],
})
export class AppModule {}
