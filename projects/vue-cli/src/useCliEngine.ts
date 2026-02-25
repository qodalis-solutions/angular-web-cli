import { ref, onMounted, onBeforeUnmount, Ref, shallowRef } from 'vue';
import { CliEngine, CliEngineOptions } from '@qodalis/cli';
import { ICliCommandProcessor } from '@qodalis/cli-core';

export interface UseCliEngineConfig {
    processors?: ICliCommandProcessor[];
    options?: CliEngineOptions;
}

export function useCliEngine(
    containerRef: Ref<HTMLElement | null>,
    config?: UseCliEngineConfig,
): Ref<CliEngine | null> {
    const engine = shallowRef<CliEngine | null>(null);

    onMounted(async () => {
        if (!containerRef.value) return;

        const e = new CliEngine(containerRef.value, config?.options);

        e.registerService('cli-framework', 'Vue');

        if (config?.processors) {
            e.registerProcessors(config.processors);
        }

        await e.start();
        engine.value = e;
    });

    onBeforeUnmount(() => {
        engine.value?.destroy();
        engine.value = null;
    });

    return engine;
}
