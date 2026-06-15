import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined;
          }

          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/react-redux/') ||
            id.includes('/react-router') ||
            id.includes('/scheduler/')
          ) {
            return 'vendor-react';
          }

          if (id.includes('/@reduxjs/') || id.includes('/redux')) {
            return 'vendor-state';
          }

          if (id.includes('/axios/')) {
            return 'vendor-http';
          }

          return undefined;
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    testTimeout: 20000,
    maxWorkers: 4,
    setupFiles: './src/test/setup.ts',
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
  },
});
