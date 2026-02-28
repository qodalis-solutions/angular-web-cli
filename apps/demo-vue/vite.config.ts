import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
    plugins: [vue()],
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
        preserveSymlinks: true,
        alias: {
            '@qodalis/cli-core': path.resolve(__dirname, '../../dist/core'),
            '@qodalis/cli': path.resolve(__dirname, '../../dist/cli'),
            '@qodalis/vue-cli': path.resolve(__dirname, '../../packages/vue-cli'),
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
