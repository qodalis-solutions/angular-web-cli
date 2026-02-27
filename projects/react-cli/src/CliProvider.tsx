import React, { useRef } from 'react';
import { ICliCommandProcessor } from '@qodalis/cli-core';
import { CliEngineOptions } from '@qodalis/cli';
import { CliContext } from './CliContext';
import { useCliEngine } from './useCliEngine';

export interface CliProviderProps {
    processors?: ICliCommandProcessor[];
    options?: CliEngineOptions;
    services?: Record<string, any>;
    children: React.ReactNode;
    style?: React.CSSProperties;
}

export function CliProvider({
    processors,
    options,
    services,
    children,
    style,
}: CliProviderProps): React.JSX.Element {
    const containerRef = useRef<HTMLDivElement>(null);
    const engine = useCliEngine(containerRef, { processors, options, services });

    return (
        <CliContext.Provider value={{ engine }}>
            <div ref={containerRef} style={{ height: '100%', ...style }} />
            {children}
        </CliContext.Provider>
    );
}
