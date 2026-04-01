import { describe, expect, it, vi, beforeEach } from 'vitest';

describe('bootstrapAuth mock mode', () => {
  beforeEach(() => {
    vi.resetModules();
    window.localStorage.clear();
    window.sessionStorage.clear();
    vi.stubEnv('VITE_MOCK_MODE', 'true');
  });

  it('injects mock auth state without reading enterprise wecom flow', async () => {
    const { createStore } = await import('../../app/store');
    const { bootstrapAuth } = await import('./bootstrap');
    const store = createStore();

    await bootstrapAuth(store.dispatch);

    const state = store.getState().auth;
    expect(state.authStatus).toBe('authenticated');
    expect(state.currentUser?.userId).toBe('mock-admin');
    expect(state.token).toBe('mock-access-token');
    expect(window.localStorage.getItem('sunan_token')).toBeNull();
  });

  it('injects mock auth state outside dev builds as well', async () => {
    vi.stubEnv('DEV', 'false');

    const { createStore } = await import('../../app/store');
    const { bootstrapAuth } = await import('./bootstrap');
    const store = createStore();

    await bootstrapAuth(store.dispatch);

    const state = store.getState().auth;
    expect(state.authStatus).toBe('authenticated');
    expect(state.currentUser?.userId).toBe('mock-admin');
    expect(state.token).toBe('mock-access-token');
    expect(window.localStorage.getItem('sunan_token')).toBeNull();
  });
});
