import {
    CliIcon,
    delay,
    ICliCommandChildProcessor,
    ICliCommandProcessor,
    ICliCommandProcessorRegistry,
    ICliUmdModule,
    initializeBrowserEnvironment,
    LIBRARY_VERSION as CORE_VERSION,
    satisfiesMinVersion,
} from '@qodalis/cli-core';
import { LIBRARY_VERSION as CLI_VERSION } from '../version';
import { CliExecutionContext } from '../context/cli-execution-context';
import { CliCommandExecutionContext } from '../context/cli-command-execution-context';

export class CliBoot {
    private initialized = false;
    private initializing = false;

    constructor(private readonly registry: ICliCommandProcessorRegistry) {}

    public async boot(
        context: CliExecutionContext,
        processors: ICliCommandProcessor[],
    ): Promise<void> {
        context.spinner?.show(CliIcon.Rocket + '  Booting...');

        if (this.initialized || this.initializing) {
            await this.bootShared(context);

            context.spinner?.hide();

            return;
        }

        this.initializing = true;

        initializeBrowserEnvironment({
            context,
            handlers: [
                async (module: ICliUmdModule) => {
                    await this.registerUmdModule(module, context);
                },
            ],
        });

        let filteredProcessors = processors;

        filteredProcessors = filteredProcessors.filter((p) => {
            const meta = p.metadata;
            if (
                meta?.requiredCoreVersion &&
                !satisfiesMinVersion(CORE_VERSION, meta.requiredCoreVersion)
            ) {
                context.writer.writeWarning(
                    `Plugin "${p.command}" requires cli-core >=${meta.requiredCoreVersion} but ${CORE_VERSION} is installed. Skipping.`,
                );
                return false;
            }
            if (
                meta?.requiredCliVersion &&
                !satisfiesMinVersion(CLI_VERSION, meta.requiredCliVersion)
            ) {
                context.writer.writeWarning(
                    `Plugin "${p.command}" requires angular-cli >=${meta.requiredCliVersion} but ${CLI_VERSION} is installed. Skipping.`,
                );
                return false;
            }
            return true;
        });

        filteredProcessors.forEach((impl) =>
            this.registry.registerProcessor(impl),
        );

        await this.bootShared(context);

        context.spinner?.hide();

        this.initialized = true;
    }

    private async bootShared(context: CliExecutionContext): Promise<void> {
        await this.initializeProcessorsInternal(
            context,
            this.registry.processors,
        );

        await delay(300);
    }

    private async initializeProcessorsInternal(
        context: CliExecutionContext,
        processors: ICliCommandProcessor[],
        parent?: ICliCommandProcessor,
    ): Promise<void> {
        for (const p of processors) {
            try {
                (p as ICliCommandChildProcessor).parent = parent;

                if (p.initialize) {
                    const processorContext = new CliCommandExecutionContext(
                        context,
                        p,
                    );

                    await processorContext.state.initialize();

                    await p.initialize(processorContext);
                }

                if (p.processors && p.processors.length > 0) {
                    await this.initializeProcessorsInternal(
                        context,
                        p.processors,
                        p,
                    );
                }
            } catch (e) {
                console.error(`Error initializing processor "${p.command}":`, e);
            }
        }
    }

    private async registerUmdModule(
        module: ICliUmdModule,
        context: CliExecutionContext,
    ): Promise<void> {
        const { logger } = context;
        if (!module) {
            return;
        }

        if (module.processors) {
            logger.info('Registering processors from module ' + module.name);
            for (const processor of module.processors) {
                this.registry.registerProcessor(processor);
            }

            await this.initializeProcessorsInternal(context, module.processors);
        } else {
            logger.warn(`Module ${module.name} has no processors`);
        }
    }
}
