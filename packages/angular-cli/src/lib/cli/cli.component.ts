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
    ICliModule,
    ICliPingServerService,
} from '@qodalis/cli-core';
import { CliEngine, CliEngineOptions } from '@qodalis/cli';
import {
    CliCommandProcessor_TOKEN,
    CliModule_TOKEN,
    ICliPingServerService_TOKEN,
} from './tokens';

@Component({
    selector: 'cli',
    template: `<div
        #terminal
        [style.height]="height || '100%'"
        style="width: 100%;"
    ></div>`,
    styles: [],
    encapsulation: ViewEncapsulation.None,
})
export class CliComponent implements AfterViewInit, OnDestroy {
    @Input() options?: CliEngineOptions;
    @Input() processors?: ICliCommandProcessor[];
    @Input() modules?: ICliModule[];
    @Input() height?: string;

    @ViewChild('terminal', { static: true }) terminalDiv!: ElementRef;

    private engine?: CliEngine;

    constructor(
        @Optional()
        @Inject(CliCommandProcessor_TOKEN)
        private readonly diProcessors: ICliCommandProcessor[],
        @Optional()
        @Inject(CliModule_TOKEN)
        private readonly diModules: ICliModule[],
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

        // Identify the serving framework
        this.engine.registerService('cli-framework', 'Angular');

        // Bridge Angular DI services into the engine's service container
        if (this.pingServerService) {
            this.engine.registerService(
                'cli-ping-server-service',
                this.pingServerService,
            );
        }

        // Register processors provided via Angular DI (from resolveCommandProcessorProvider)
        if (this.diProcessors && this.diProcessors.length > 0) {
            this.engine.registerProcessors(this.diProcessors);
        }

        // Register processors provided via @Input
        if (this.processors && this.processors.length > 0) {
            this.engine.registerProcessors(this.processors);
        }

        // Register modules provided via Angular DI
        if (this.diModules && this.diModules.length > 0) {
            this.engine.registerModules(this.diModules);
        }

        // Register modules provided via @Input
        if (this.modules && this.modules.length > 0) {
            this.engine.registerModules(this.modules);
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
