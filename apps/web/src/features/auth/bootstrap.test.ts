import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createStore } from '../../app/store';
import { bootstrapAuth } from './bootstrap';

describe('bootstrapAuth', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    vi.unstubAllEnvs();
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:3000/api/v1');
    vi.stubEnv('VITE_WECOM_CORP_ID', 'ww-test');
    vi.stubEnv('VITE_WECOM_AGENT_ID', '1000002');
    vi.stubEnv('VITE_WECOM_REDIRECT_URI', 'http://localhost:5173/auth/callback');
  });

  it('creates a local demo session when auth bypass is enabled and no token exists', () => {
    vi.stubEnv('VITE_LOCAL_BYPASS_AUTH', 'true');
    const store = createStore();

    bootstrapAuth(store.dispatch);

    const state = store.getState().auth;
    expect(state.token).toBe('local-preview-token');
    expect(state.currentUser?.userId).toBe('local-preview-user');
    expect(state.authStatus).toBe('authenticated');
  });
});
