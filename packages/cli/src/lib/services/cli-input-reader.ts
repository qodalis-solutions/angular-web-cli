import {
    ICliInputReader,
    CliSelectOption,
    CliMultiSelectOption,
} from '@qodalis/cli-core';

export type ActiveInputRequestType =
    | 'line'
    | 'password'
    | 'confirm'
    | 'select'
    | 'select-inline'
    | 'multi-select'
    | 'number';

export interface ActiveInputRequest {
    type: ActiveInputRequestType;
    promptText: string;
    resolve: (value: any) => void;
    buffer: string;
    cursorPosition: number;
    defaultValue?: boolean;
    options?: CliSelectOption[];
    selectedIndex?: number;
    onChange?: (value: string) => void;
    checkedIndices?: Set<number>;
    numberOptions?: { min?: number; max?: number; default?: number };
}

export interface CliInputReaderHost {
    readonly activeInputRequest: ActiveInputRequest | null;
    setActiveInputRequest(request: ActiveInputRequest | null): void;
    writeToTerminal(text: string): void;
}

export class CliInputReader implements ICliInputReader {
    constructor(private readonly host: CliInputReaderHost) {}

    readLine(prompt: string): Promise<string | null> {
        return this.createInputRequest('line', prompt);
    }

    readPassword(prompt: string): Promise<string | null> {
        return this.createInputRequest('password', prompt);
    }

    readConfirm(
        prompt: string,
        defaultValue: boolean = false,
    ): Promise<boolean | null> {
        const hint = defaultValue ? '(Y/n)' : '(y/N)';
        const displayPrompt = `${prompt} ${hint}: `;

        return new Promise<boolean | null>((resolve) => {
            if (this.host.activeInputRequest) {
                throw new Error('Another input request is already active');
            }

            this.host.writeToTerminal(displayPrompt);

            this.host.setActiveInputRequest({
                type: 'confirm',
                promptText: displayPrompt,
                resolve,
                buffer: '',
                cursorPosition: 0,
                defaultValue,
            });
        });
    }

    readSelect(
        prompt: string,
        options: CliSelectOption[],
        onChange?: (value: string) => void,
    ): Promise<string | null> {
        if (!options || options.length === 0) {
            return Promise.reject(
                new Error('readSelect requires at least one option'),
            );
        }

        return new Promise<string | null>((resolve) => {
            if (this.host.activeInputRequest) {
                throw new Error('Another input request is already active');
            }

            // Write prompt and render options
            this.host.writeToTerminal(prompt + '\r\n');
            this.renderSelectOptions(options, 0);

            // Fire onChange for the initial selection
            onChange?.(options[0].value);

            this.host.setActiveInputRequest({
                type: 'select',
                promptText: prompt,
                resolve,
                buffer: '',
                cursorPosition: 0,
                options,
                selectedIndex: 0,
                onChange,
            });
        });
    }

    readSelectInline(
        prompt: string,
        options: CliSelectOption[],
        onChange?: (value: string) => void,
    ): Promise<string | null> {
        if (!options || options.length === 0) {
            return Promise.reject(
                new Error('readSelectInline requires at least one option'),
            );
        }

        return new Promise<string | null>((resolve) => {
            if (this.host.activeInputRequest) {
                throw new Error('Another input request is already active');
            }

            // Write prompt + inline options on one line
            const inlineText = this.renderInlineSelectOptions(options, 0);
            this.host.writeToTerminal(`${prompt} ${inlineText}`);

            // Fire onChange for the initial selection
            onChange?.(options[0].value);

            this.host.setActiveInputRequest({
                type: 'select-inline',
                promptText: prompt,
                resolve,
                buffer: '',
                cursorPosition: 0,
                options,
                selectedIndex: 0,
                onChange,
            });
        });
    }

    readMultiSelect(
        prompt: string,
        options: CliMultiSelectOption[],
    ): Promise<string[] | null> {
        if (!options || options.length === 0) {
            return Promise.reject(
                new Error('readMultiSelect requires at least one option'),
            );
        }

        return new Promise<string[] | null>((resolve) => {
            if (this.host.activeInputRequest) {
                throw new Error('Another input request is already active');
            }

            // Initialize checked indices from options with checked: true
            const checkedIndices = new Set<number>();
            options.forEach((opt, i) => {
                if (opt.checked) {
                    checkedIndices.add(i);
                }
            });

            // Write prompt and render checkbox options
            this.host.writeToTerminal(prompt + '\r\n');
            this.renderMultiSelectOptions(options, 0, checkedIndices);

            this.host.setActiveInputRequest({
                type: 'multi-select',
                promptText: prompt,
                resolve,
                buffer: '',
                cursorPosition: 0,
                options,
                selectedIndex: 0,
                checkedIndices,
            });
        });
    }

    readNumber(
        prompt: string,
        options?: { min?: number; max?: number; default?: number },
    ): Promise<number | null> {
        return new Promise<number | null>((resolve) => {
            if (this.host.activeInputRequest) {
                throw new Error('Another input request is already active');
            }

            // Build display prompt with bounds hint
            let displayPrompt = prompt;
            const hints: string[] = [];
            if (options?.min !== undefined || options?.max !== undefined) {
                const minStr =
                    options?.min !== undefined ? String(options.min) : '';
                const maxStr =
                    options?.max !== undefined ? String(options.max) : '';
                if (minStr && maxStr) {
                    hints.push(`${minStr}-${maxStr}`);
                } else if (minStr) {
                    hints.push(`>=${minStr}`);
                } else if (maxStr) {
                    hints.push(`<=${maxStr}`);
                }
            }
            if (options?.default !== undefined) {
                hints.push(`default: ${options.default}`);
            }
            if (hints.length > 0) {
                displayPrompt += ` (${hints.join(', ')}): `;
            } else {
                displayPrompt += ': ';
            }

            this.host.writeToTerminal(displayPrompt);

            this.host.setActiveInputRequest({
                type: 'number',
                promptText: displayPrompt,
                resolve,
                buffer: '',
                cursorPosition: 0,
                numberOptions: options,
            });
        });
    }

    renderSelectOptions(
        options: CliSelectOption[],
        selectedIndex: number,
    ): void {
        for (let i = 0; i < options.length; i++) {
            const prefix = i === selectedIndex ? '  \x1b[36m> ' : '    ';
            const suffix = i === selectedIndex ? '\x1b[0m' : '';
            this.host.writeToTerminal(
                `${prefix}${options[i].label}${suffix}\r\n`,
            );
        }
    }

    renderInlineSelectOptions(
        options: CliSelectOption[],
        selectedIndex: number,
    ): string {
        return options
            .map((opt, i) => {
                if (i === selectedIndex) {
                    return `\x1b[36m[ ${opt.label} ]\x1b[0m`;
                }
                return `  ${opt.label}  `;
            })
            .join('');
    }

    renderMultiSelectOptions(
        options: CliSelectOption[],
        selectedIndex: number,
        checkedIndices: Set<number>,
    ): void {
        for (let i = 0; i < options.length; i++) {
            const checkbox = checkedIndices.has(i) ? '[x]' : '[ ]';
            const prefix =
                i === selectedIndex
                    ? `  \x1b[36m> ${checkbox} `
                    : `    ${checkbox} `;
            const suffix = i === selectedIndex ? '\x1b[0m' : '';
            this.host.writeToTerminal(
                `${prefix}${options[i].label}${suffix}\r\n`,
            );
        }
    }

    private createInputRequest(
        type: 'line' | 'password',
        prompt: string,
    ): Promise<string | null> {
        return new Promise<string | null>((resolve) => {
            if (this.host.activeInputRequest) {
                throw new Error('Another input request is already active');
            }

            this.host.writeToTerminal(prompt);

            this.host.setActiveInputRequest({
                type,
                promptText: prompt,
                resolve,
                buffer: '',
                cursorPosition: 0,
            });
        });
    }
}
