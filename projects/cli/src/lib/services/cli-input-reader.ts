import { ICliInputReader, CliSelectOption } from '@qodalis/cli-core';

export type ActiveInputRequestType = 'line' | 'password' | 'confirm' | 'select';

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

    readConfirm(prompt: string, defaultValue: boolean = false): Promise<boolean | null> {
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
            return Promise.reject(new Error('readSelect requires at least one option'));
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

    renderSelectOptions(options: CliSelectOption[], selectedIndex: number): void {
        for (let i = 0; i < options.length; i++) {
            const prefix = i === selectedIndex ? '  \x1b[36m> ' : '    ';
            const suffix = i === selectedIndex ? '\x1b[0m' : '';
            this.host.writeToTerminal(`${prefix}${options[i].label}${suffix}\r\n`);
        }
    }

    private createInputRequest(type: 'line' | 'password', prompt: string): Promise<string | null> {
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
