import { describe, expect, it } from 'vitest';
import tsconfigSource from '../../tsconfig.app.json?raw';
import viteConfigSource from '../../vite.config.ts?raw';
import procurementPresentationSource from '../features/procurement/procurementReportPresentation.ts?raw';

describe('web build compatibility', () => {
  it('keeps the intentional HEIC lazy chunk inside a narrow build budget', () => {
    expect(viteConfigSource).toContain('HEIC_LAZY_CHUNK_BUDGET_KB = 1400');
    expect(viteConfigSource).toContain('DEFAULT_CHUNK_BUDGET_KB = 500');
    expect(viteConfigSource).toContain("name: 'sunan-chunk-size-budget'");
    expect(viteConfigSource).toContain(
      'chunkSizeWarningLimit: HEIC_LAZY_CHUNK_BUDGET_KB',
    );
  });

  it('keeps procurement presentation compatible with the configured ES2020 target', () => {
    const tsconfig = JSON.parse(tsconfigSource) as {
      compilerOptions?: { target?: string; lib?: string[] };
    };
    const unsupportedMethod = ['.', 'replaceAll('].join('');

    expect(tsconfig.compilerOptions?.target).toBe('ES2020');
    expect(tsconfig.compilerOptions?.lib).toContain('ES2020');
    expect(procurementPresentationSource).not.toContain(unsupportedMethod);
  });
});
