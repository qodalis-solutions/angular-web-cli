import {
    defineComponent,
    ref,
    onMounted,
    onBeforeUnmount,
    PropType,
    h,
    inject,
} from 'vue';
import { ICliCommandProcessor, ICliModule } from '@qodalis/cli-core';
import { CliEngine, CliEngineOptions } from '@qodalis/cli';
import { CliInjectionKey } from './cliInjection';

export const Cli = defineComponent({
    name: 'Cli',
    props: {
        modules: {
            type: Array as PropType<ICliModule[]>,
            default: undefined,
        },
        processors: {
            type: Array as PropType<ICliCommandProcessor[]>,
            default: undefined,
        },
        options: {
            type: Object as PropType<CliEngineOptions>,
            default: undefined,
        },
        services: {
            type: Object as PropType<Record<string, any>>,
            default: undefined,
        },
        style: {
            type: Object as PropType<Record<string, string>>,
            default: undefined,
        },
        class: {
            type: String,
            default: undefined,
        },
    },
    emits: ['ready'],
    setup(props, { emit }) {
        const containerRef = ref<HTMLElement | null>(null);
        const ctx = inject(CliInjectionKey, null);
        let engine: CliEngine | null = null;

        // If inside a CliProvider, don't create our own engine
        if (ctx) {
            return () => null;
        }

        onMounted(async () => {
            if (!containerRef.value) return;

            engine = new CliEngine(containerRef.value, props.options);

            engine.registerService('cli-framework', 'Vue');

            if (props.services) {
                for (const [token, value] of Object.entries(props.services)) {
                    engine.registerService(token, value);
                }
            }

            if (props.modules) {
                engine.registerModules(props.modules);
            }

            if (props.processors) {
                engine.registerProcessors(props.processors);
            }

            await engine.start();
            emit('ready', engine);
        });

        onBeforeUnmount(() => {
            engine?.destroy();
            engine = null;
        });

        return () =>
            h('div', {
                ref: containerRef,
                style: { height: '100%', ...props.style },
                class: props.class,
            });
    },
});
