import { useRef, useEffect, useState, RefObject } from 'react';
import { CliEngine, CliEngineOptions } from '@qodalis/cli';
import { ICliCommandProcessor, ICliModule } from '@qodalis/cli-core';

export interface UseCliEngineConfig {
    modules?: ICliModule[];
    processors?: ICliCommandProcessor[];
    options?: CliEngineOptions;
    services?: Record<string, any>;
    disabled?: boolean;
}

export function useCliEngine(
    containerRef: RefObject<HTMLElement | null>,
    config?: UseCliEngineConfig,
): CliEngine | null {
    const [engine, setEngine] = useState<CliEngine | null>(null);
    const engineRef = useRef<CliEngine | null>(null);
    const mountedRef = useRef(false);

    useEffect(() => {
        if (config?.disabled || !containerRef.current) return;

        // Guard against StrictMode double-mount: skip the first mount
        // since React will immediately unmount and remount.
        if (!mountedRef.current) {
            mountedRef.current = true;
            return;
        }

        const e = new CliEngine(containerRef.current, config?.options);

        e.registerService('cli-framework', 'React');

        if (config?.services) {
            for (const [token, value] of Object.entries(config.services)) {
                e.registerService(token, value);
            }
        }

        if (config?.modules) {
            e.registerModules(config.modules);
        }

        if (config?.processors) {
            e.registerProcessors(config.processors);
        }

        engineRef.current = e;
        e.start().then(() => setEngine(e));

        return () => {
            e.destroy();
            engineRef.current = null;
            setEngine(null);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return engine;
}
