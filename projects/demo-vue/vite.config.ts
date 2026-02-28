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
            '@qodalis/vue-cli': path.resolve(__dirname, '../vue-cli'),
        },
    },
});
