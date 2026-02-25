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
import { ICliCommandProcessor, CliOptions } from '@qodalis/cli-core';
import { CliEngine, CliEngineOptions } from '@qodalis/cli';
import { CliCommandProcessor_TOKEN } from './tokens';
import { builtinProcessors } from '../index';

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
    ) {}

    ngAfterViewInit(): void {
        const engineOptions: CliEngineOptions = {
            ...(this.options ?? {}),
        };

        this.engine = new CliEngine(
            this.terminalDiv.nativeElement,
            engineOptions,
        );

        // Register built-in system processors (plain class instances, no Angular DI)
        this.engine.registerProcessors(builtinProcessors);

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
