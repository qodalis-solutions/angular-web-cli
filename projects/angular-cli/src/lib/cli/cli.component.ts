import {
    AfterViewInit,
    Component,
    ElementRef,
    Inject,
    Input,
    OnDestroy,
    Optional,
    ViewChild,
    ViewEncapsulation,
} from '@angular/core';
import {
    ICliCommandProcessor,
    ICliPingServerService,
    ICliUserSessionService,
    ICliUsersStoreService,
    CliOptions,
} from '@qodalis/cli-core';
import { CliEngine, CliEngineOptions } from '@qodalis/cli';
import {
    CliCommandProcessor_TOKEN,
    ICliPingServerService_TOKEN,
    ICliUserSessionService_TOKEN,
    ICliUsersStoreService_TOKEN,
} from './tokens';

@Component({
    selector: 'cli',
    template: `<div #terminal
        [style.height]="height || '100%'"
        style="width: 100%;">
    </div>`,
    styles: [],
    encapsulation: ViewEncapsulation.None,
})
export class CliComponent implements AfterViewInit, OnDestroy {
    @Input() options?: CliOptions;
    @Input() processors?: ICliCommandProcessor[];
    @Input() height?: string;

    @ViewChild('terminal', { static: true }) terminalDiv!: ElementRef;

    private engine?: CliEngine;

    constructor(
        @Optional()
        @Inject(CliCommandProcessor_TOKEN)
        private readonly diProcessors: ICliCommandProcessor[],
        @Optional()
        @Inject(ICliUserSessionService_TOKEN)
        private readonly userSessionService: ICliUserSessionService,
        @Optional()
        @Inject(ICliUsersStoreService_TOKEN)
        private readonly usersStoreService: ICliUsersStoreService,
        @Optional()
        @Inject(ICliPingServerService_TOKEN)
        private readonly pingServerService: ICliPingServerService,
    ) {}

    ngAfterViewInit(): void {
        const engineOptions: CliEngineOptions = {
            ...(this.options ?? {}),
        };

        this.engine = new CliEngine(
            this.terminalDiv.nativeElement,
            engineOptions,
        );

        // Bridge Angular DI services into the engine's service container
        if (this.userSessionService) {
            this.engine.registerService('cli-user-session-service', this.userSessionService);
        }
        if (this.usersStoreService) {
            this.engine.registerService('cli-users-store-service', this.usersStoreService);
        }
        if (this.pingServerService) {
            this.engine.registerService('cli-ping-server-service', this.pingServerService);
        }

        // Register processors provided via Angular DI (from resolveCommandProcessorProvider)
        if (this.diProcessors && this.diProcessors.length > 0) {
            this.engine.registerProcessors(this.diProcessors);
        }

        // Register processors provided via @Input
        if (this.processors && this.processors.length > 0) {
            this.engine.registerProcessors(this.processors);
        }

        this.engine.start();
    }

    ngOnDestroy(): void {
        this.engine?.destroy();
    }

    public focus(): void {
        this.engine?.focus();
    }
}
