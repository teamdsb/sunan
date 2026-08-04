import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
var DEFAULT_CHUNK_BUDGET_KB = 500;
var HEIC_LAZY_CHUNK_BUDGET_KB = 1400;
function chunkSizeBudgetPlugin() {
    return {
        name: 'sunan-chunk-size-budget',
        generateBundle: function (_options, bundle) {
            var _this = this;
            Object.values(bundle).forEach(function (output) {
                if (output.type !== 'chunk')
                    return;
                var isHeicPreviewChunk = output.moduleIds.some(function (id) {
                    return id.includes('/heic2any/');
                });
                var budgetKb = isHeicPreviewChunk
                    ? HEIC_LAZY_CHUNK_BUDGET_KB
                    : DEFAULT_CHUNK_BUDGET_KB;
                var sizeKb = Buffer.byteLength(output.code, 'utf8') / 1000;
                if (sizeKb > budgetKb) {
                    _this.warn("".concat(output.fileName, " is ").concat(sizeKb.toFixed(2), " kB and exceeds its ").concat(budgetKb, " kB chunk budget."));
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
                manualChunks: function (id) {
                    if (!id.includes('node_modules')) {
                        return undefined;
                    }
                    if (id.includes('/react/') ||
                        id.includes('/react-dom/') ||
                        id.includes('/react-redux/') ||
                        id.includes('/react-router') ||
                        id.includes('/scheduler/')) {
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
