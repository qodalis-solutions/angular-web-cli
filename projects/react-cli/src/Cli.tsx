import React, { useRef, useEffect } from 'react';
import { ICliCommandProcessor } from '@qodalis/cli-core';
import { CliEngine, CliEngineOptions } from '@qodalis/cli';
import { useCli } from './CliContext';
import { useCliEngine } from './useCliEngine';

export interface CliProps {
    processors?: ICliCommandProcessor[];
    options?: CliEngineOptions;
    onReady?: (engine: CliEngine) => void;
    style?: React.CSSProperties;
    className?: string;
}

export function Cli({
    processors,
    options,
    onReady,
    style,
    className,
}: CliProps): React.JSX.Element {
    const ctx = useCli();
    const containerRef = useRef<HTMLDivElement>(null);

    // If inside a CliProvider, the provider owns the engine.
    // Otherwise, this component creates its own.
    const standaloneEngine = ctx.engine
        ? null
        : useCliEngine(containerRef, { processors, options });

    const engine = ctx.engine ?? standaloneEngine;

    useEffect(() => {
        if (engine && onReady) {
            onReady(engine);
        }
    }, [engine, onReady]);

    // If inside a provider, render nothing (provider has the terminal div).
    if (ctx.engine) {
        return <></>;
    }

    return (
        <div
            ref={containerRef}
            style={{ height: '100%', ...style }}
            className={className}
        />
    );
}
