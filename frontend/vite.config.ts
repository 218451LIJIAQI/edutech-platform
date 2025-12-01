import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // 核心 React 库
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // UI 相关库
          'vendor-ui': ['lucide-react', 'react-hot-toast', 'clsx'],
          // 图表库
          'vendor-charts': ['recharts'],
          // Stripe 支付
          'vendor-stripe': ['@stripe/stripe-js', '@stripe/react-stripe-js'],
          // 工具库
          'vendor-utils': ['axios', 'date-fns', 'zustand'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
});

