import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [
        laravel({
            input: 'resources/js/app.jsx',
            refresh: true,
        }),
        react(),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './resources/js'),
        },
    },
    build: {
        manifest: 'manifest.json',
        rolldownOptions: {
            external: [],
        },
        commonjsOptions: {
            include: [/node_modules/],
        },
    },
    optimizeDeps: {
        include: [
            'recharts',
            'react-is',
            'framer-motion',
            'lucide-react',
            'react-hot-toast',
            '@headlessui/react',
            '@inertiajs/react',
        ],
    },
});
