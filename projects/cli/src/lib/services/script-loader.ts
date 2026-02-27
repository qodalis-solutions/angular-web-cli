export type CdnSourceName = string;

const BUILTIN_SOURCES: Record<string, string> = {
    unpkg: 'https://unpkg.com/',
    jsdelivr: 'https://cdn.jsdelivr.net/npm/',
};

export class ScriptLoaderService {
    private sources: Map<string, string> = new Map(Object.entries(BUILTIN_SOURCES));
    private primary: string = 'unpkg';

    constructor() {}

    /**
     * Registers a custom package source.
     */
    addSource(name: string, url: string): void {
        // Ensure trailing slash
        this.sources.set(name, url.endsWith('/') ? url : url + '/');
    }

    /**
     * Returns all registered source names.
     */
    getSources(): string[] {
        return Array.from(this.sources.keys());
    }

    /**
     * Returns the base URL for a given source name, or undefined if not found.
     */
    getSourceUrl(name: string): string | undefined {
        return this.sources.get(name);
    }

    /**
     * Sets the preferred CDN source. The other sources become fallbacks.
     */
    setCdnSource(preferred: CdnSourceName): void {
        if (this.sources.has(preferred)) {
            this.primary = preferred;
        }
    }

    /**
     * Returns the current preferred CDN source name.
     */
    getCdnSource(): CdnSourceName {
        return this.primary;
    }

    injectScript(src: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () =>
                reject(new Error(`Failed to load script: ${src}`));
            document.head.appendChild(script);
        });
    }

    getScript(
        src: string,
        options?: {
            onProgress?: (progress: number) => void;
            signal?: AbortSignal;
        },
    ): Promise<{
        xhr: XMLHttpRequest;
        content?: string;
        error?: any;
    }> {
        const { onProgress, signal } = options || {};

        let fetchProgress = 0;

        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', src, true);

            if (signal) {
                if (signal.aborted) {
                    reject(new Error('Aborted'));
                    return;
                }

                signal.addEventListener('abort', () => {
                    xhr.abort();
                    reject(new Error('Aborted'));
                });
            }

            xhr.onprogress = (event) => {
                if (event.lengthComputable) {
                    const progress = Math.round(
                        (event.loaded / event.total) * 100,
                    );
                    fetchProgress = progress;

                    onProgress?.(progress);
                } else {
                    fetchProgress += 20;
                    onProgress?.(fetchProgress);
                }
            };

            xhr.onload = () => {
                if (xhr.status === 200) {
                    onProgress?.(100);
                    fetchProgress = 100;
                    resolve({
                        xhr,
                        content: xhr.responseText,
                    });
                } else {
                    reject(
                        new Error(
                            `Failed to load package: ${src}, Status: ${xhr.status}, Message: ${xhr.responseText}`,
                        ),
                    );
                }
            };

            xhr.onerror = () => {
                reject(new Error(`Failed to load package: ${src}`));
            };

            xhr.send();
        });
    }

    injectBodyScript(code: string): void {
        const script = document.createElement('script');
        script.text = code;
        document.head.appendChild(script);
    }

    /**
     * Returns CDN URLs for a given npm package path.
     * The first entry is the primary source, the rest are fallbacks.
     */
    getCdnUrls(packagePath: string): string[] {
        const urls: string[] = [];
        const primaryUrl = this.sources.get(this.primary);
        if (primaryUrl) {
            urls.push(`${primaryUrl}${packagePath}`);
        }
        for (const [name, baseUrl] of this.sources) {
            if (name !== this.primary) {
                urls.push(`${baseUrl}${packagePath}`);
            }
        }
        return urls;
    }

    /**
     * Tries to fetch a script from multiple CDN sources, falling back on failure.
     */
    getScriptWithFallback(
        packagePath: string,
        options?: {
            onProgress?: (progress: number) => void;
            signal?: AbortSignal;
        },
    ): Promise<{
        xhr: XMLHttpRequest;
        content?: string;
        error?: any;
    }> {
        const urls = this.getCdnUrls(packagePath);
        return this.getScriptFromUrls(urls, options);
    }

    /**
     * Tries to inject a script tag from multiple CDN sources, falling back on failure.
     */
    injectScriptWithFallback(packagePath: string): Promise<void> {
        const urls = this.getCdnUrls(packagePath);
        return this.injectScriptFromUrls(urls);
    }

    private async getScriptFromUrls(
        urls: string[],
        options?: {
            onProgress?: (progress: number) => void;
            signal?: AbortSignal;
        },
    ): Promise<{
        xhr: XMLHttpRequest;
        content?: string;
        error?: any;
    }> {
        let lastError: any;
        for (const url of urls) {
            try {
                return await this.getScript(url, options);
            } catch (e: any) {
                if (e?.message === 'Aborted') throw e;
                lastError = e;
            }
        }
        throw lastError;
    }

    private async injectScriptFromUrls(urls: string[]): Promise<void> {
        let lastError: any;
        for (const url of urls) {
            try {
                return await this.injectScript(url);
            } catch (e) {
                lastError = e;
            }
        }
        throw lastError;
    }
}
