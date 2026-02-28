import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        proxy: {
            '/api/cli': {
                target: 'http://localhost:8046',
                changeOrigin: true,
            },
            '/ws/cli': {
                target: 'http://localhost:8046',
                changeOrigin: true,
                ws: true,
            },
        },
    },
    resolve: {
        // Resolve symlinked local packages from the demo-react node_modules
        // so that transitive imports (e.g. @qodalis/cli -> @qodalis/cli-core)
        // are found correctly.
        preserveSymlinks: false,
        alias: {
            '@qodalis/cli-core': path.resolve(
                __dirname,
                'node_modules/@qodalis/cli-core',
            ),
            '@qodalis/cli': path.resolve(
                __dirname,
                'node_modules/@qodalis/cli',
            ),
        },
    },
});
