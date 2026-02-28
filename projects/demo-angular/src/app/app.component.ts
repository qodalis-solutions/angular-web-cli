import { Component } from '@angular/core';
import { ICliModule, CliOptions, CliLogLevel } from '@qodalis/cli-core';
import { guidModule } from '@qodalis/cli-guid';
import { regexModule } from '@qodalis/cli-regex';
import { textToImageModule } from '@qodalis/cli-text-to-image';
import { speedTestModule } from '@qodalis/cli-speed-test';
import { browserStorageModule } from '@qodalis/cli-browser-storage';
import { stringModule } from '@qodalis/cli-string';
import { todoModule } from '@qodalis/cli-todo';
import { curlModule } from '@qodalis/cli-curl';
import { passwordGeneratorModule } from '@qodalis/cli-password-generator';
import { qrModule } from '@qodalis/cli-qr';
import { yesnoModule } from '@qodalis/cli-yesno';
import { serverLogsModule } from '@qodalis/cli-server-logs';
import { usersModule } from '@qodalis/cli-users';
import { filesModule } from '@qodalis/cli-files';
import { CliInputDemoCommandProcessor } from './processors/cli-input-demo-command-processor';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: [],
})
export class AppComponent {
    modules: ICliModule[] = [
        filesModule,
        guidModule,
        regexModule,
        textToImageModule,
        speedTestModule,
        browserStorageModule,
        stringModule,
        todoModule,
        curlModule,
        passwordGeneratorModule,
        qrModule,
        yesnoModule,
        serverLogsModule,
        usersModule.configure({
            seedUsers: [
                { name: 'root1', email: 'root1@root.com', groups: ['admin'] },
            ],
            defaultPassword: 'root',
            requirePassword: true,
            //requirePasswordOnBoot: true,
        }),
        {
            name: 'input-demo',
            processors: [new CliInputDemoCommandProcessor()],
        },
    ];

    options: CliOptions = {
        logLevel: CliLogLevel.DEBUG,
        packageSources: {
            primary: 'local',
            sources: [
                { name: 'local', url: 'http://localhost:3000/', kind: 'file' },
            ],
        },
    };
}
