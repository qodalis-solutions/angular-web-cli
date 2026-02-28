import {
    CliProcessCommand,
    CliServerConfig,
    CliServerResponse,
    CliServerCommandDescriptor,
} from '@qodalis/cli-core';

export class CliServerConnection {
    private _connected = false;
    private _commands: CliServerCommandDescriptor[] = [];

    constructor(private readonly _config: CliServerConfig) {}

    get config(): CliServerConfig {
        return this._config;
    }

    get connected(): boolean {
        return this._connected;
    }

    get commands(): CliServerCommandDescriptor[] {
        return this._commands;
    }

    async connect(): Promise<void> {
        try {
            this._commands = await this.fetchCommands();
            this._connected = true;
        } catch {
            this._connected = false;
            this._commands = [];
        }
    }

    async fetchCommands(): Promise<CliServerCommandDescriptor[]> {
        const url = `${this.normalizeUrl(this._config.url)}/api/cli/commands`;
        const response = await this.fetch(url);

        if (!response.ok) {
            throw new Error(`Server ${this._config.name} returned ${response.status}`);
        }

        return response.json();
    }

    async execute(command: CliProcessCommand): Promise<CliServerResponse> {
        const url = `${this.normalizeUrl(this._config.url)}/api/cli/execute`;
        const response = await this.fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(command),
        });

        if (!response.ok) {
            return {
                exitCode: 1,
                outputs: [
                    {
                        type: 'text',
                        value: `Server error: ${response.status} ${response.statusText}`,
                        style: 'error',
                    },
                ],
            };
        }

        return response.json();
    }

    async ping(): Promise<boolean> {
        try {
            const url = `${this.normalizeUrl(this._config.url)}/api/cli/version`;
            const response = await this.fetch(url);
            return response.ok;
        } catch {
            return false;
        }
    }

    private fetch(url: string, init?: RequestInit): Promise<Response> {
        const timeout = this._config.timeout ?? 30000;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout);

        const headers: Record<string, string> = {
            ...(this._config.headers ?? {}),
            ...((init?.headers as Record<string, string>) ?? {}),
        };

        return fetch(url, {
            ...init,
            headers,
            signal: controller.signal,
        }).finally(() => clearTimeout(timer));
    }

    private normalizeUrl(url: string): string {
        return url.endsWith('/') ? url.slice(0, -1) : url;
    }
}
