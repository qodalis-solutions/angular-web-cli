import { useRef, useEffect, useState, RefObject } from 'react';
import { CliEngine, CliEngineOptions } from '@qodalis/cli';
import { ICliCommandProcessor } from '@qodalis/cli-core';

export interface UseCliEngineConfig {
    processors?: ICliCommandProcessor[];
    options?: CliEngineOptions;
}

export function useCliEngine(
    containerRef: RefObject<HTMLElement | null>,
    config?: UseCliEngineConfig,
): CliEngine | null {
    const [engine, setEngine] = useState<CliEngine | null>(null);
    const engineRef = useRef<CliEngine | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const e = new CliEngine(containerRef.current, config?.options);

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
