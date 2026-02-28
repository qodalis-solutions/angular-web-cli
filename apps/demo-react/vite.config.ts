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
            '@qodalis/cli-core': path.resolve(__dirname, '../../dist/core'),
            '@qodalis/cli': path.resolve(__dirname, '../../dist/cli'),
            '@qodalis/react-cli': path.resolve(__dirname, '../../packages/react-cli'),
            '@qodalis/cli-guid': path.resolve(__dirname, '../../dist/guid'),
            '@qodalis/cli-regex': path.resolve(__dirname, '../../dist/regex'),
            '@qodalis/cli-text-to-image': path.resolve(__dirname, '../../dist/text-to-image'),
            '@qodalis/cli-speed-test': path.resolve(__dirname, '../../dist/speed-test'),
            '@qodalis/cli-browser-storage': path.resolve(__dirname, '../../dist/browser-storage'),
            '@qodalis/cli-string': path.resolve(__dirname, '../../dist/string'),
            '@qodalis/cli-todo': path.resolve(__dirname, '../../dist/todo'),
            '@qodalis/cli-curl': path.resolve(__dirname, '../../dist/curl'),
            '@qodalis/cli-password-generator': path.resolve(__dirname, '../../dist/password-generator'),
            '@qodalis/cli-qr': path.resolve(__dirname, '../../dist/qr'),
            '@qodalis/cli-yesno': path.resolve(__dirname, '../../dist/yesno'),
            '@qodalis/cli-server-logs': path.resolve(__dirname, '../../dist/server-logs'),
            '@qodalis/cli-users': path.resolve(__dirname, '../../dist/users'),
            '@qodalis/cli-files': path.resolve(__dirname, '../../dist/files'),
        },
    },
});
