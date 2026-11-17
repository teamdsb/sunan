import react from '@vitejs/plugin-react';
import { loadEnv, type Plugin } from 'vite';
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

const productionWebEnv = [
  'VITE_API_BASE_URL',
  'VITE_WECOM_CORP_ID',
  'VITE_WECOM_AGENT_ID',
  'VITE_WECOM_REDIRECT_URI',
] as const;

function productionBuildGuard(values: Record<string, string>): Plugin {
  return {
    name: 'sunan-production-build-guard',
    apply: 'build',
    configResolved() {
      if (values.SUNAN_WEB_BUILD_TARGET !== 'production') return;

      const errors: string[] = [];
      for (const key of productionWebEnv) {
        if (!values[key]?.trim()) errors.push(`${key} is required`);
      }

      const apiBaseUrl = values.VITE_API_BASE_URL?.trim();
      const redirectUri = values.VITE_WECOM_REDIRECT_URI?.trim();
      for (const [key, value] of [
        ['VITE_API_BASE_URL', apiBaseUrl],
        ['VITE_WECOM_REDIRECT_URI', redirectUri],
      ] as const) {
        if (!value) continue;
        try {
          if (new URL(value).protocol !== 'https:') {
            errors.push(`${key} must use HTTPS`);
          }
        } catch {
          errors.push(`${key} must be a valid URL`);
        }
      }

      if (
        apiBaseUrl?.includes('localhost') ||
        apiBaseUrl?.includes('127.0.0.1')
      ) {
        errors.push('VITE_API_BASE_URL must not point to localhost');
      }
      if (
        redirectUri?.includes('localhost') ||
        redirectUri?.includes('127.0.0.1')
      ) {
        errors.push('VITE_WECOM_REDIRECT_URI must not point to localhost');
      }
      if (
        /^(?:ww-?test|ww1234567890|test|example|replace|mock|demo)/i.test(
          values.VITE_WECOM_CORP_ID ?? '',
        )
      ) {
        errors.push('VITE_WECOM_CORP_ID contains a test or placeholder value');
      }
      if (!/^\d+$/.test(values.VITE_WECOM_AGENT_ID ?? '')) {
        errors.push('VITE_WECOM_AGENT_ID must be numeric');
      }
      if (values.VITE_LOCAL_BYPASS_AUTH) {
        errors.push('VITE_LOCAL_BYPASS_AUTH is forbidden in production builds');
      }

      if (errors.length) {
        throw new Error(
          `Production web build configuration invalid: ${errors.join('; ')}`,
        );
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const values = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), productionBuildGuard(values), chunkSizeBudgetPlugin()],
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
  };
});
