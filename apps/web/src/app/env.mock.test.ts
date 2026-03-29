import { readFileSync } from 'node:fs';

import { describe, expect, it, vi } from 'vitest';

function readText(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8');
}

describe('env mock mode', () => {
  it('documents the dedicated mock entry files', () => {
    const mockEnvFile = readText('../../.env.mock.local');
    expect(mockEnvFile).toContain('VITE_API_BASE_URL=http://localhost:3000/api/v1');
    expect(mockEnvFile).toContain('VITE_MOCK_MODE=true');

    const rootPackage = JSON.parse(readText('../../../../package.json')) as {
      scripts?: Record<string, string>;
    };
    expect(rootPackage.scripts?.['dev:web:mock']).toBe('pnpm --filter web dev --mode mock');
  });

  it('reads VITE_MOCK_MODE from vite env', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:3000/api/v1');
    vi.stubEnv('VITE_WECOM_CORP_ID', 'ww-test');
    vi.stubEnv('VITE_WECOM_AGENT_ID', '1000002');
    vi.stubEnv('VITE_WECOM_REDIRECT_URI', 'http://localhost:5173/auth/callback');
    vi.stubEnv('VITE_MOCK_MODE', 'true');

    const { env } = await import('./env');

    expect(env.mockMode).toBe(true);
  });
});
