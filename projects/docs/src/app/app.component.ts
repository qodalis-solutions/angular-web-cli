import { Component, ViewChild, ElementRef } from '@angular/core';
import { CliLogLevel, CliOptions, ICliCommandProcessor } from '@qodalis/cli-core';
import { CliGuidCommandProcessor } from '@qodalis/cli-guid';
import { CliRegexCommandProcessor } from '@qodalis/cli-regex';
import { CliTextToImageCommandProcessor } from '@qodalis/cli-text-to-image';
import { CliSpeedTestCommandProcessor } from '@qodalis/cli-speed-test';
import { CliCookiesCommandProcessor, CliLocalStorageCommandProcessor } from '@qodalis/cli-browser-storage';
import { CliStringCommandProcessor } from '@qodalis/cli-string';
import { CliTodoCommandProcessor } from '@qodalis/cli-todo';
import { CliCurlCommandProcessor } from '@qodalis/cli-curl';
import { CliPasswordGeneratorCommandProcessor } from '@qodalis/cli-password-generator';
import { CliQrCommandProcessor } from '@qodalis/cli-qr';
import { CliYesnoCommandProcessor } from '@qodalis/cli-yesno';
import { CliLogsCommandProcessor } from '@qodalis/cli-server-logs';
import { CliDemoCommandProcessor } from './processors/cli-demo-command-processor';

interface Feature {
    icon: string;
    title: string;
    description: string;
}

interface PluginInfo {
    name: string;
    command: string;
    description: string;
}

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.sass'],
})
export class AppComponent {
    title = 'Qodalis CLI';

    @ViewChild('terminalSection') terminalSection!: ElementRef;

    processors: ICliCommandProcessor[] = [
        new CliGuidCommandProcessor(),
        new CliRegexCommandProcessor(),
        new CliTextToImageCommandProcessor(),
        new CliSpeedTestCommandProcessor(),
        new CliCookiesCommandProcessor(),
        new CliLocalStorageCommandProcessor(),
        new CliStringCommandProcessor(),
        new CliTodoCommandProcessor(),
        new CliCurlCommandProcessor(),
        new CliPasswordGeneratorCommandProcessor(),
        new CliQrCommandProcessor(),
        new CliYesnoCommandProcessor(),
        new CliLogsCommandProcessor(),
        new CliDemoCommandProcessor(),
    ];

    options: CliOptions = {
        welcomeMessage: {
            show: 'always',
        },
        usersModule: {
            enabled: true,
        },
        logLevel: CliLogLevel.DEBUG,
    };

    features: Feature[] = [
        {
            icon: '\u29C9',
            title: 'Plugin Ecosystem',
            description:
                'Extend functionality with drop-in Angular modules. GUID, regex, QR codes, speed tests, and more.',
        },
        {
            icon: '\u2261',
            title: 'Tabs & Split Panes',
            description:
                'Multiple terminals in tabs with draggable split panes. Rename, duplicate, and manage sessions.',
        },
        {
            icon: '\u25D0',
            title: 'Fully Themeable',
            description:
                'CSS custom properties for every surface. Match your app\'s design system with zero friction.',
        },
        {
            icon: '\u21E5',
            title: 'Autocomplete & History',
            description:
                'Tab completion, command history navigation, and inline suggestions out of the box.',
        },
    ];

    plugins: PluginInfo[] = [
        { name: 'GUID', command: 'guid generate', description: 'Generate and validate UUIDs' },
        { name: 'Regex', command: 'regex test', description: 'Test and debug regular expressions' },
        { name: 'QR Code', command: 'qr generate', description: 'Generate QR codes from text' },
        { name: 'Speed Test', command: 'speed-test', description: 'Measure network performance' },
        { name: 'cURL', command: 'curl', description: 'Make HTTP requests from the terminal' },
        { name: 'Password', command: 'password generate', description: 'Generate secure passwords' },
        { name: 'String', command: 'string', description: 'Encode, decode, and transform text' },
        { name: 'Todo', command: 'todo', description: 'Manage tasks from the command line' },
        { name: 'Storage', command: 'storage', description: 'Inspect browser local/session storage' },
        { name: 'Text to Image', command: 'text-to-image', description: 'Render text as images' },
    ];

    installCommand = 'npm install @qodalis/angular-cli';
    copied = false;

    scrollToTerminal(): void {
        this.terminalSection?.nativeElement.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
        });
    }

    copyInstall(): void {
        navigator.clipboard.writeText(this.installCommand).then(() => {
            this.copied = true;
            setTimeout(() => (this.copied = false), 2000);
        });
    }
}
