import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('redirectToOAuth mock mode', () => {
  beforeEach(() => {
    vi.resetModules();
    window.sessionStorage.clear();
    vi.stubEnv('VITE_MOCK_MODE', 'true');
  });

  it('does not persist redirect target or oauth state', async () => {
    const { redirectToOAuth } = await import('./oauth');

    redirectToOAuth('/my/settings');

    expect(window.sessionStorage.getItem('sunan_post_auth_redirect')).toBeNull();
    expect(window.sessionStorage.getItem('sunan_oauth_state')).toBeNull();
  });
});
