import { describe, expect, it, beforeEach } from 'vitest';
import {
  authReducer,
  bootstrapFromStorage,
  bootstrapMockAuth,
  loginSucceeded,
  logout,
} from './authSlice';
import { clearToken, createOauthState, verifyOauthState } from './oauth';
import type { AuthState } from './types';

const initialState: AuthState = {
  token: null,
  tokenExpiresAt: null,
  currentUser: null,
  authStatus: 'idle',
  jssdkStatus: 'idle',
};

describe('authSlice', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    clearToken();
  });

  it('restores token from localStorage', () => {
    window.localStorage.setItem('sunan_token', 'jwt-token');
    window.localStorage.setItem('sunan_token_expires_at', '2099-01-01T00:00:00.000Z');

    const state = authReducer(initialState, bootstrapFromStorage());

    expect(state.token).toBe('jwt-token');
    expect(state.tokenExpiresAt).toBe('2099-01-01T00:00:00.000Z');
    expect(state.authStatus).toBe('authenticated');
  });

  it('persists token and user on login', () => {
    const state = authReducer(
      initialState,
      loginSucceeded({
        accessToken: 'token-1',
        expiresIn: 7200,
        user: {
          userId: 'u1',
          name: '张三',
          department: ['总经办'],
          roles: ['admin'],
        },
      }),
    );

    expect(state.token).toBe('token-1');
    expect(state.currentUser?.name).toBe('张三');
    expect(window.localStorage.getItem('sunan_token')).toBe('token-1');
    expect(window.localStorage.getItem('sunan_token_expires_at')).toMatch(/T/);
  });

  it('bootstraps mock auth without persisting token', () => {
    const state = authReducer(
      initialState,
      bootstrapMockAuth({
        accessToken: 'mock-access-token',
        expiresIn: 3600,
        user: {
          userId: 'mock-admin',
          name: '调试管理员',
          department: ['苏南船舶管理'],
          roles: ['system_admin', 'business'],
        },
      }),
    );

    expect(state.token).toBe('mock-access-token');
    expect(state.currentUser?.roles).toContain('system_admin');
    expect(window.localStorage.getItem('sunan_token')).toBeNull();
  });

  it('clears auth state on logout', () => {
    window.localStorage.setItem('sunan_token', 'token-1');
    window.localStorage.setItem('sunan_token_expires_at', '2099-01-01T00:00:00.000Z');

    const state = authReducer(
      {
        ...initialState,
        token: 'token-1',
        tokenExpiresAt: '2099-01-01T00:00:00.000Z',
        authStatus: 'authenticated',
      },
      logout(),
    );

    expect(state.token).toBeNull();
    expect(state.currentUser).toBeNull();
    expect(state.authStatus).toBe('unauthenticated');
    expect(window.localStorage.getItem('sunan_token')).toBeNull();
  });

  it('fails oauth state verification on mismatch', () => {
    createOauthState();

    expect(verifyOauthState('wrong-state')).toBe(false);
    expect(window.sessionStorage.getItem('sunan_oauth_state')).toBe('uuid-test');
  });
});
