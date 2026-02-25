import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AppComponent } from './app.component';
import {
    CliCanViewService,
    CliModule,
    ICliUsersStoreService_TOKEN,
} from '@qodalis/angular-cli';
import { CliCustomUsersStoreService } from './services/custom-users-store.service';
import { CustomCliCanViewService } from './services/custom-cli-can-view.service';

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
        {
            useClass: CustomCliCanViewService,
            provide: CliCanViewService,
        },
    ],
    bootstrap: [AppComponent],
})
export class AppModule {}
