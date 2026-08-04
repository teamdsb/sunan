import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

const DEFAULT_CHUNK_BUDGET_KB = 500;
const HEIC_LAZY_CHUNK_BUDGET_KB = 1400;

function chunkSizeBudgetPlugin(): Plugin {
  return {
    name: 'sunan-chunk-size-budget',
    generateBundle(_options, bundle) {
      Object.values(bundle).forEach((output) => {
        if (output.type !== 'chunk') return;
        const isHeicPreviewChunk = output.moduleIds.some((id) =>
          id.includes('/heic2any/'),
        );
        const budgetKb = isHeicPreviewChunk
          ? HEIC_LAZY_CHUNK_BUDGET_KB
          : DEFAULT_CHUNK_BUDGET_KB;
        const sizeKb = Buffer.byteLength(output.code, 'utf8') / 1000;
        if (sizeKb > budgetKb) {
          this.warn(
            `${output.fileName} is ${sizeKb.toFixed(2)} kB and exceeds its ${budgetKb} kB chunk budget.`,
          );
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), chunkSizeBudgetPlugin()],
  build: {
    // heic2any is an isolated, on-demand preview chunk (~1.35 MB minified,
    // ~341 KB gzip). Keep the budget narrowly above it so larger regressions
    // elsewhere still produce a build warning.
    chunkSizeWarningLimit: HEIC_LAZY_CHUNK_BUDGET_KB,
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
