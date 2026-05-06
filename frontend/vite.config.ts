import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendOrigin = env.VITE_DEV_BACKEND_ORIGIN || 'http://localhost:3000';

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      strictPort: false,
      proxy: {
        '/api': {
          target: backendOrigin,
          changeOrigin: true,
          secure: false,
        },
        '/uploads': {
          target: backendOrigin,
          changeOrigin: true,
          secure: false,
        },
        '/socket.io': {
          target: backendOrigin,
          changeOrigin: true,
          secure: false,
          ws: true,
        },
      },
    },
    preview: {
      port: 4173,
      strictPort: false,
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            charts: ['recharts'],
            i18n: [
              'i18next',
              'i18next-browser-languagedetector',
              'react-i18next',
            ],
            react: ['react', 'react-dom', 'react-router-dom'],
            ui: ['clsx', 'lucide-react', 'react-hot-toast', 'zustand'],
          },
        },
      },
    },
  };
});
