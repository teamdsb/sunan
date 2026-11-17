import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
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
var productionWebEnv = [
    'VITE_API_BASE_URL',
    'VITE_WECOM_CORP_ID',
    'VITE_WECOM_AGENT_ID',
    'VITE_WECOM_REDIRECT_URI',
];
function productionBuildGuard(values) {
    return {
        name: 'sunan-production-build-guard',
        apply: 'build',
        configResolved: function () {
            var _a, _b, _c, _d, _e;
            if (values.SUNAN_WEB_BUILD_TARGET !== 'production')
                return;
            var errors = [];
            for (var _i = 0, productionWebEnv_1 = productionWebEnv; _i < productionWebEnv_1.length; _i++) {
                var key = productionWebEnv_1[_i];
                if (!((_a = values[key]) === null || _a === void 0 ? void 0 : _a.trim()))
                    errors.push("".concat(key, " is required"));
            }
            var apiBaseUrl = (_b = values.VITE_API_BASE_URL) === null || _b === void 0 ? void 0 : _b.trim();
            var redirectUri = (_c = values.VITE_WECOM_REDIRECT_URI) === null || _c === void 0 ? void 0 : _c.trim();
            for (var _f = 0, _g = [
                ['VITE_API_BASE_URL', apiBaseUrl],
                ['VITE_WECOM_REDIRECT_URI', redirectUri],
            ]; _f < _g.length; _f++) {
                var _h = _g[_f], key = _h[0], value = _h[1];
                if (!value)
                    continue;
                try {
                    if (new URL(value).protocol !== 'https:') {
                        errors.push("".concat(key, " must use HTTPS"));
                    }
                }
                catch (_j) {
                    errors.push("".concat(key, " must be a valid URL"));
                }
            }
            if ((apiBaseUrl === null || apiBaseUrl === void 0 ? void 0 : apiBaseUrl.includes('localhost')) ||
                (apiBaseUrl === null || apiBaseUrl === void 0 ? void 0 : apiBaseUrl.includes('127.0.0.1'))) {
                errors.push('VITE_API_BASE_URL must not point to localhost');
            }
            if ((redirectUri === null || redirectUri === void 0 ? void 0 : redirectUri.includes('localhost')) ||
                (redirectUri === null || redirectUri === void 0 ? void 0 : redirectUri.includes('127.0.0.1'))) {
                errors.push('VITE_WECOM_REDIRECT_URI must not point to localhost');
            }
            if (/^(?:ww-?test|ww1234567890|test|example|replace|mock|demo)/i.test((_d = values.VITE_WECOM_CORP_ID) !== null && _d !== void 0 ? _d : '')) {
                errors.push('VITE_WECOM_CORP_ID contains a test or placeholder value');
            }
            if (!/^\d+$/.test((_e = values.VITE_WECOM_AGENT_ID) !== null && _e !== void 0 ? _e : '')) {
                errors.push('VITE_WECOM_AGENT_ID must be numeric');
            }
            if (values.VITE_LOCAL_BYPASS_AUTH) {
                errors.push('VITE_LOCAL_BYPASS_AUTH is forbidden in production builds');
            }
            if (errors.length) {
                throw new Error("Production web build configuration invalid: ".concat(errors.join('; ')));
            }
        },
    };
}
export default defineConfig(function (_a) {
    var mode = _a.mode;
    var values = loadEnv(mode, process.cwd(), '');
    return {
        plugins: [react(), productionBuildGuard(values), chunkSizeBudgetPlugin()],
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
    };
});
