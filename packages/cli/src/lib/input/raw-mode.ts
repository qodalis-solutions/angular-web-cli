import { IInputMode } from './input-mode';
import { ICliCommandProcessor, ICliExecutionContext } from '@qodalis/cli-core';

/**
 * Input mode for full-screen command processors (nano editor, pager, etc.).
 * Bypasses all default key handling — routes everything to the processor's onData.
 */
export class RawMode implements IInputMode {
    constructor(
        private readonly processor: ICliCommandProcessor,
        private readonly context: ICliExecutionContext,
    ) {}

    async handleInput(data: string): Promise<void> {
        if (this.processor.onData) {
            await this.processor.onData(data, this.context);
        }
    }

    handleKeyEvent(event: KeyboardEvent): boolean {
        // Prevent browser defaults for Ctrl key combos (Ctrl+S, Ctrl+Q, etc.)
        if (event.ctrlKey) {
            event.preventDefault();
        }
        // Let all keys pass through to onData
        return true;
    }
}
