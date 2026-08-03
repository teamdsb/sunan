import { beforeEach, describe, expect, it } from 'vitest';
import { createStore } from '../../app/store';
import { bootstrapAuth } from './bootstrap';

describe('bootstrapAuth', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('restores a persisted real access token', () => {
    window.localStorage.setItem('sunan_token', 'jwt-token');
    window.localStorage.setItem(
      'sunan_token_expires_at',
      '2099-01-01T00:00:00.000Z',
    );
    const store = createStore();

    bootstrapAuth(store.dispatch);

    const state = store.getState().auth;
    expect(state.token).toBe('jwt-token');
    expect(state.authStatus).toBe('authenticated');
  });

  it('keeps the session unauthenticated when no token exists', () => {
    const store = createStore();

    bootstrapAuth(store.dispatch);

    expect(store.getState().auth).toMatchObject({
      token: null,
      currentUser: null,
      authStatus: 'unauthenticated',
    });
  });
});
