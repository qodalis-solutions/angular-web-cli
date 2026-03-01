import {
    ICliCompletionProvider,
    ICliCompletionContext,
    ICliCommandProcessorRegistry,
    ICliCommandProcessor,
} from '@qodalis/cli-core';

/**
 * Provides tab-completion for command names and sub-command names.
 * Priority 100 (default).
 */
export class CliCommandCompletionProvider implements ICliCompletionProvider {
    priority = 100;

    constructor(private readonly registry: ICliCommandProcessorRegistry) {}

    getCompletions(context: ICliCompletionContext): string[] {
        const { tokens, tokenIndex, token } = context;

        if (tokenIndex === 0) {
            // Complete top-level command names + aliases
            return this.getCommandNames(this.registry.processors, token);
        }

        // Complete sub-commands: find the parent processor
        const mainCommand = tokens[0];
        const processor = this.registry.findProcessor(mainCommand, []);
        if (!processor?.processors?.length) {
            return [];
        }

        // Walk the chain for nested sub-commands
        let current: ICliCommandProcessor = processor;
        for (let i = 1; i < tokenIndex; i++) {
            const sub = current.processors?.find(
                (p) => p.command === tokens[i],
            );
            if (!sub?.processors?.length) {
                return [];
            }
            current = sub;
        }

        return this.getCommandNames(current.processors ?? [], token);
    }

    private getCommandNames(
        processors: ICliCommandProcessor[],
        prefix: string,
    ): string[] {
        const names: string[] = [];
        const lowerPrefix = prefix.toLowerCase();

        for (const p of processors) {
            if (p.command.toLowerCase().startsWith(lowerPrefix)) {
                names.push(p.command);
            }
            if (p.aliases) {
                for (const alias of p.aliases) {
                    if (alias.toLowerCase().startsWith(lowerPrefix)) {
                        names.push(alias);
                    }
                }
            }
        }

        return names.sort();
    }
}
