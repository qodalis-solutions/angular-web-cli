import { LIBRARY_VERSION } from '../version';
import { getCliNameArt } from '../constants';
import { CliForegroundColor, ICliExecutionContext, ICliModule } from '@qodalis/cli-core';
import { getGreetingBasedOnTime } from '../utils';

export interface CliWelcomeMessageConfig {
    /** Custom message to display instead of the default */
    message?: string;
    /** When to show the welcome message (default: 'always') */
    show?: 'always' | 'once' | 'daily' | 'never';
}

interface ICliWelcomeModule extends ICliModule {
    configure(config: CliWelcomeMessageConfig): ICliModule;
}

export const welcomeModule: ICliWelcomeModule = {
    name: '@qodalis/cli-welcome',
    priority: -1,

    configure(config: CliWelcomeMessageConfig): ICliModule {
        return { ...this, config };
    },

    async onAfterBoot(context) {
        const config = (this.config || {}) as CliWelcomeMessageConfig;

        // Prefer the persisted setting from `configure` over the module-level config
        const showOption = context.options?.welcomeMessage?.show
            || config.show;

        if (showOption) {
            if (!shouldDisplayWelcomeMessage(showOption)) {
                context.showPrompt();
                return;
            }
        }

        if (config.message) {
            context.terminal.writeln(config.message);
        } else {
            const lines = [
                `🚀 Welcome to Web CLI [Version ${context.writer.wrapInColor(LIBRARY_VERSION, CliForegroundColor.Green)}]`,
                `(c) ${new Date().getFullYear()} Qodalis Solutions. All rights reserved.`,
                getCliNameArt(context.terminal.cols),
                '',
                `📖 ${context.writer.wrapInColor('Documentation:', CliForegroundColor.Green)} https://cli.qodalis.com/docs/`,
                '',
                `💡 Type ${context.writer.wrapInColor('\'help\'', CliForegroundColor.Cyan)} to see available commands`,
                '',
            ];

            lines.forEach(line => {
                context.terminal.write(line + '\r\n');
            });
        }

        recordWelcomeMessageDisplay();
        context.showPrompt();
        await context.textAnimator?.showText(getGreetingBasedOnTime(), {
            speed: 60,
            removeAfterTyping: true,
        });
    },
};

function shouldDisplayWelcomeMessage(
    showOption: 'always' | 'once' | 'daily' | 'never',
): boolean {
    const lastDisplayed = localStorage.getItem('cliWelcomeMessageLastDisplayed');

    switch (showOption) {
        case 'always':
            return true;
        case 'once':
            return !lastDisplayed;
        case 'daily':
            if (!lastDisplayed) return true;
            const now = new Date();
            const lastDate = new Date(lastDisplayed);
            return now.toDateString() !== lastDate.toDateString();
        case 'never':
            return false;
        default:
            return true;
    }
}

function recordWelcomeMessageDisplay(): void {
    localStorage.setItem(
        'cliWelcomeMessageLastDisplayed',
        new Date().toISOString(),
    );
}
