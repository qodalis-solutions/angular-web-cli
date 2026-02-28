import {
    CliForegroundColor,
    CliProcessCommand,
    CliProcessorMetadata,
    CliStateConfiguration,
    ICliCommandAuthor,
    ICliCommandProcessor,
    ICliExecutionContext,
} from '@qodalis/cli-core';

import { DefaultLibraryAuthor } from '@qodalis/cli-core';
import { ITheme } from '@xterm/xterm';
import { themes, ThemeState } from './types';

/** Convert a hex color string (#RRGGBB) to {r, g, b}. Returns null on invalid input. */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const m = /^#?([0-9A-Fa-f]{6})$/.exec(hex);
    if (!m) return null;
    const n = parseInt(m[1], 16);
    return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}

/** Render a colored block (██) using 24-bit ANSI true color for the given hex value. */
function colorSwatch(hex: string | undefined): string {
    if (!hex) return '  ';
    const rgb = hexToRgb(hex);
    if (!rgb) return '  ';
    return `\x1b[48;2;${rgb.r};${rgb.g};${rgb.b}m  \x1b[0m`;
}

/** Render text with a 24-bit ANSI foreground color. */
function colorText(text: string, hex: string | undefined): string {
    if (!hex) return text;
    const rgb = hexToRgb(hex);
    if (!rgb) return text;
    return `\x1b[38;2;${rgb.r};${rgb.g};${rgb.b}m${text}\x1b[0m`;
}

/** The subset of ITheme color keys displayed as palette swatches. */
const PALETTE_KEYS: (keyof ITheme)[] = [
    'black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white',
    'brightBlack', 'brightRed', 'brightGreen', 'brightYellow',
    'brightBlue', 'brightMagenta', 'brightCyan', 'brightWhite',
];

export class CliThemeCommandProcessor implements ICliCommandProcessor {
    command = 'theme';

    aliases = ['themes'];

    description = 'Interact with the theme';

    author?: ICliCommandAuthor | undefined = DefaultLibraryAuthor;

    version?: string | undefined = '1.1.0';

    processors?: ICliCommandProcessor[] | undefined = [];

    metadata?: CliProcessorMetadata | undefined = {
        sealed: true,
        icon: '🎨',
        module: 'system',
    };

    stateConfiguration?: CliStateConfiguration | undefined = {
        initialState: {
            selectedTheme: 'default',
            customOptions: null,
        },
    };

    private themeOptions: string[] = Object.keys(themeOptions);

    private defaultTheme!: ITheme;

    constructor() {
        this.processors = [
            {
                command: 'list',
                description: 'List available themes with color previews',
                processCommand: async (
                    _: CliProcessCommand,
                    context: ICliExecutionContext,
                ) => {
                    const state = context.state.getState<ThemeState>();
                    const currentName = state.selectedTheme || '';

                    context.writer.writeln('Available themes:');
                    context.writer.writeln();

                    for (const name of Object.keys(themes)) {
                        const t = themes[name];
                        const active = name === currentName ? ' (active)' : '';
                        const swatches = PALETTE_KEYS
                            .map((k) => colorSwatch(t[k] as string))
                            .join('');
                        const label = context.writer.wrapInColor(
                            name,
                            CliForegroundColor.Cyan,
                        );
                        context.writer.writeln(
                            `  ${swatches} ${label}${active}`,
                        );
                    }

                    context.writer.writeln();
                    context.writer.writeInfo(
                        `Use ${context.writer.wrapInColor('theme apply <name>', CliForegroundColor.Cyan)} or ${context.writer.wrapInColor('theme apply', CliForegroundColor.Cyan)} to select interactively`,
                    );
                },
            },
            {
                command: 'current',
                description: 'Show the current theme with color swatches',
                processCommand: async (
                    _: CliProcessCommand,
                    context: ICliExecutionContext,
                ) => {
                    const state = context.state.getState<ThemeState>();
                    const themeName = state.selectedTheme || 'custom';
                    const currentTheme = context.terminal.options.theme!;

                    context.writer.writeln(
                        `Current theme: ${context.writer.wrapInColor(themeName, CliForegroundColor.Cyan)}`,
                    );
                    context.writer.writeln();

                    // Background and foreground
                    const bg = currentTheme.background as string | undefined;
                    const fg = currentTheme.foreground as string | undefined;
                    context.writer.writeln(
                        `  ${colorSwatch(bg)} background  ${bg || 'default'}`,
                    );
                    context.writer.writeln(
                        `  ${colorSwatch(fg)} foreground  ${fg || 'default'}`,
                    );
                    if (currentTheme.cursor) {
                        context.writer.writeln(
                            `  ${colorSwatch(currentTheme.cursor as string)} cursor      ${currentTheme.cursor}`,
                        );
                    }
                    context.writer.writeln();

                    // Color palette
                    context.writer.writeln('  Normal colors:');
                    const normal = PALETTE_KEYS.slice(0, 8);
                    for (const key of normal) {
                        const val = currentTheme[key] as string | undefined;
                        if (val) {
                            context.writer.writeln(
                                `    ${colorSwatch(val)} ${String(key).padEnd(10)} ${val}`,
                            );
                        }
                    }

                    context.writer.writeln();
                    context.writer.writeln('  Bright colors:');
                    const bright = PALETTE_KEYS.slice(8);
                    for (const key of bright) {
                        const val = currentTheme[key] as string | undefined;
                        if (val) {
                            context.writer.writeln(
                                `    ${colorSwatch(val)} ${String(key).padEnd(16)} ${val}`,
                            );
                        }
                    }

                    context.process.output({
                        theme: themeName,
                        colors: currentTheme,
                    });
                },
            },
            {
                command: 'preview',
                description: 'Preview a theme without applying it',
                valueRequired: true,
                processCommand: async (
                    command: CliProcessCommand,
                    context: ICliExecutionContext,
                ) => {
                    const name = command.value!;
                    const t = themes[name];
                    if (!t) {
                        context.writer.writeError(
                            `Theme not found: ${name}. Use ${context.writer.wrapInColor('theme list', CliForegroundColor.Cyan)} to see available themes.`,
                        );
                        return;
                    }

                    this.renderThemePreview(name, t, context);
                },
            },
            {
                command: 'apply',
                description: 'Apply a theme (interactive with live preview if no name given)',
                allowUnlistedCommands: true,
                processCommand: async (
                    command: CliProcessCommand,
                    context: ICliExecutionContext,
                ) => {
                    let themeName = command.value?.trim();

                    if (!themeName) {
                        // Interactive selection with live preview
                        const originalTheme = {
                            ...context.terminal.options.theme,
                        };
                        const options = Object.keys(themes).map((name) => ({
                            label: name,
                            value: name,
                        }));

                        const selected = await context.reader.readSelect(
                            'Select a theme (live preview):',
                            options,
                            (value) => {
                                // Live preview: apply theme as user navigates
                                if (themes[value]) {
                                    context.terminal.options.theme =
                                        themes[value];
                                    this.applyStyles(context);
                                }
                            },
                        );

                        if (!selected) {
                            // Cancelled — restore original theme
                            context.terminal.options.theme = originalTheme;
                            this.applyStyles(context);
                            context.writer.writeInfo('Theme selection cancelled');
                            return;
                        }
                        themeName = selected;
                    }

                    if (!themes[themeName]) {
                        context.writer.writeError(
                            `Theme not found: ${themeName}. Use ${context.writer.wrapInColor('theme list', CliForegroundColor.Cyan)} to see available themes.`,
                        );
                        return;
                    }

                    context.terminal.options.theme = themes[themeName];

                    context.state.updateState({
                        selectedTheme: themeName,
                        customOptions: null,
                    });

                    await context.state.persist();

                    this.applyStyles(context);

                    context.writer.writeSuccess(`Theme "${themeName}" applied`);
                },
            },
            {
                command: 'set',
                allowUnlistedCommands: true,
                description: 'Set a theme variable',
                parameters: [
                    {
                        name: 'save',
                        description: 'Save the theme settings',
                        type: 'boolean',
                        required: false,
                    },
                ],
                processCommand: async (
                    command: CliProcessCommand,
                    context: ICliExecutionContext,
                ) => {
                    const [key, value] = command.command.split(' ').slice(2);

                    if (!key || !value) {
                        context.writer.writeError(
                            `Usage: theme set <key> <value>`,
                        );
                        context.writer.writeln();
                        context.writer.writeInfo(
                            `Available keys: ${this.themeOptions.join(', ')}`,
                        );
                        return;
                    }

                    if (!this.themeOptions.includes(key)) {
                        context.writer.writeError(
                            `Unsupported key: ${key}`,
                        );
                        context.writer.writeln();
                        context.writer.writeInfo(
                            `Supported keys: ${this.themeOptions.join(', ')}`,
                        );
                        return;
                    }

                    context.terminal.options.theme = {
                        ...context.terminal.options.theme,
                        [key]: value,
                    };

                    context.state.updateState({
                        selectedTheme: null,
                        customOptions: context.terminal.options.theme,
                    });

                    const swatch = colorSwatch(value);
                    context.writer.writeSuccess(
                        `Set ${key} to ${swatch} ${value}`,
                    );

                    this.applyStyles(context);

                    if (command.args['save']) {
                        await this.saveTheme(context);
                    }
                },
            },
            {
                command: 'save',
                description: 'Save the current theme settings',
                processCommand: async (
                    _: CliProcessCommand,
                    context: ICliExecutionContext,
                ) => {
                    const state = context.state.getState<ThemeState>();

                    // If we have a named theme, persist that reference;
                    // otherwise persist the current terminal theme as custom options.
                    if (!state.selectedTheme) {
                        context.state.updateState({
                            selectedTheme: null,
                            customOptions: {
                                ...context.terminal.options.theme,
                            },
                        });
                    }

                    await this.saveTheme(context);
                },
            },
            {
                command: 'reset',
                description: 'Reset the theme to the default',
                processCommand: async (
                    _: CliProcessCommand,
                    context: ICliExecutionContext,
                ) => {
                    context.terminal.options.theme = { ...this.defaultTheme };
                    context.state.reset();
                    await context.state.persist();
                    this.applyStyles(context);
                    context.writer.writeSuccess('Theme reset to default');
                },
            },
        ];
    }

    async initialize(context: ICliExecutionContext): Promise<void> {
        this.defaultTheme = context.terminal.options.theme!;
        const state = context.state.getState<ThemeState>();

        if (state.selectedTheme && state.selectedTheme !== 'default') {
            const theme = themes[state.selectedTheme];
            if (theme) {
                context.terminal.options.theme = theme;
            }
        } else if (state.customOptions) {
            context.terminal.options.theme = state.customOptions;
        }

        this.applyStyles(context);
    }

    async processCommand(
        command: CliProcessCommand,
        context: ICliExecutionContext,
    ): Promise<void> {
        context.executor.showHelp(command, context);
    }

    private renderThemePreview(
        name: string,
        theme: ITheme,
        context: ICliExecutionContext,
    ): void {
        const { writer } = context;
        const bg = theme.background as string | undefined;
        const fg = theme.foreground as string | undefined;

        writer.writeln(
            `Theme: ${writer.wrapInColor(name, CliForegroundColor.Cyan)}`,
        );
        writer.writeln();

        // Background/foreground preview
        if (bg && fg) {
            const rgb = hexToRgb(bg);
            const frgb = hexToRgb(fg);
            if (rgb && frgb) {
                const sample = `\x1b[48;2;${rgb.r};${rgb.g};${rgb.b}m\x1b[38;2;${frgb.r};${frgb.g};${frgb.b}m  ${name.padEnd(20)} Sample text  \x1b[0m`;
                writer.writeln(`  ${sample}`);
                writer.writeln();
            }
        }

        // Color palette
        writer.writeln('  Normal:');
        const normal: (keyof ITheme)[] = [
            'black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white',
        ];
        let row = '    ';
        for (const key of normal) {
            const val = theme[key] as string | undefined;
            row += colorSwatch(val) + ' ';
        }
        writer.writeln(row);
        row = '    ';
        for (const key of normal) {
            const val = theme[key] as string | undefined;
            row += colorText(String(key).slice(0, 2).padEnd(2), val) + ' ';
        }
        writer.writeln(row);

        writer.writeln();
        writer.writeln('  Bright:');
        const bright: (keyof ITheme)[] = [
            'brightBlack', 'brightRed', 'brightGreen', 'brightYellow',
            'brightBlue', 'brightMagenta', 'brightCyan', 'brightWhite',
        ];
        row = '    ';
        for (const key of bright) {
            const val = theme[key] as string | undefined;
            row += colorSwatch(val) + ' ';
        }
        writer.writeln(row);
        row = '    ';
        for (const key of bright) {
            const val = theme[key] as string | undefined;
            // Show abbreviated label: "bk", "rd", "gr", "yl", "bl", "mg", "cy", "wh"
            const label = String(key).replace('bright', '').slice(0, 2).toLowerCase();
            row += colorText(label.padEnd(2), val) + ' ';
        }
        writer.writeln(row);

        writer.writeln();
        writer.writeln(`  ${colorSwatch(bg)} background  ${bg || 'default'}`);
        writer.writeln(`  ${colorSwatch(fg)} foreground  ${fg || 'default'}`);
        if (theme.cursor) {
            writer.writeln(
                `  ${colorSwatch(theme.cursor as string)} cursor      ${theme.cursor}`,
            );
        }
    }

    private applyStyles(context: ICliExecutionContext) {
        const parents = document.getElementsByClassName('terminal-container');

        for (const parent of Array.from(parents)) {
            (parent as HTMLElement).style.background =
                context.terminal.options.theme?.background ||
                this.defaultTheme.background!;
        }
    }

    private async saveTheme(context: ICliExecutionContext): Promise<void> {
        await context.state.persist();

        context.writer.writeSuccess('Theme saved');
    }

    writeDescription?(context: ICliExecutionContext): void {
        const { writer } = context;
        writer.writeln('Customize the terminal appearance with themes and colors');
        writer.writeln();
        writer.writeln('Usage:');
        writer.writeln(`  ${writer.wrapInColor('theme list', CliForegroundColor.Cyan)}                     List themes with color previews`);
        writer.writeln(`  ${writer.wrapInColor('theme apply', CliForegroundColor.Cyan)}                    Select a theme interactively`);
        writer.writeln(`  ${writer.wrapInColor('theme apply <name>', CliForegroundColor.Cyan)}             Apply a theme by name`);
        writer.writeln(`  ${writer.wrapInColor('theme preview <name>', CliForegroundColor.Cyan)}           Preview a theme without applying`);
        writer.writeln(`  ${writer.wrapInColor('theme current', CliForegroundColor.Cyan)}                  Show active theme with swatches`);
        writer.writeln(`  ${writer.wrapInColor('theme set <key> <value>', CliForegroundColor.Cyan)}        Set a theme variable`);
        writer.writeln(`  ${writer.wrapInColor('theme save', CliForegroundColor.Cyan)}                     Save current settings`);
        writer.writeln(`  ${writer.wrapInColor('theme reset', CliForegroundColor.Cyan)}                    Reset to default`);
        writer.writeln();
        writer.writeln('Examples:');
        writer.writeln(`  theme apply dracula              ${writer.wrapInColor('# Apply the Dracula theme', CliForegroundColor.Green)}`);
        writer.writeln(`  theme preview nord               ${writer.wrapInColor('# Preview Nord palette', CliForegroundColor.Green)}`);
        writer.writeln(`  theme set background #1a1a2e     ${writer.wrapInColor('# Change background color', CliForegroundColor.Green)}`);
        writer.writeln(`  theme set foreground #e0e0e0     ${writer.wrapInColor('# Change text color', CliForegroundColor.Green)}`);
        writer.writeln();
        writer.writeln(
            `Available options: ${writer.wrapInColor(this.themeOptions.join(', ') ?? '', CliForegroundColor.Blue)}`,
        );
    }
}

const themeOptions: ITheme = {
    background: '',
    foreground: '',
    black: '',
    blue: '',
    brightBlack: '',
    brightBlue: '',
    brightCyan: '',
    brightGreen: '',
    brightMagenta: '',
    brightRed: '',
    brightWhite: '',
    brightYellow: '',
    cyan: '',
    green: '',
    magenta: '',
    red: '',
    white: '',
    yellow: '',
    cursor: '',
    cursorAccent: '',
    selectionBackground: '',
    selectionForeground: '',
    selectionInactiveBackground: '',
};
