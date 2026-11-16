import { describe, expect, it, beforeEach, vi } from 'vitest';
import type { BaseQueryApi } from '@reduxjs/toolkit/query';
import { createAxiosBaseQuery } from './baseApi';

function createApiStub(): BaseQueryApi {
  return {
    signal: new AbortController().signal,
    abort: vi.fn(),
    dispatch: vi.fn(),
    getState: vi.fn(),
    extra: undefined,
    endpoint: 'test',
    type: 'query',
    forced: false,
    queryCacheKey: 'key',
  };
}

describe('createAxiosBaseQuery', () => {
  const onAuthFailure = vi.fn();

  beforeEach(() => {
    onAuthFailure.mockReset();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('attaches authorization header', async () => {
    window.localStorage.setItem('sunan_token', 'jwt-token');
    const request = vi.fn().mockResolvedValue({ data: { data: { ok: true } } });
    const baseQuery = createAxiosBaseQuery({
      client: { request, post: vi.fn() } as never,
      onAuthFailure,
    });

    await baseQuery({ url: '/auth/me' }, createApiStub(), {});

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer jwt-token',
        }),
      }),
    );
  });

  it('refreshes once after 401 and retries original request', async () => {
    window.localStorage.setItem('sunan_token', 'expired-token');
    const request = vi
      .fn()
      .mockRejectedValueOnce({ response: { status: 401 }, message: 'Unauthorized' })
      .mockResolvedValueOnce({ data: { data: { ok: true } } });
    const post = vi.fn().mockResolvedValue({
      data: {
        data: {
          accessToken: 'fresh-token',
          expiresIn: 7200,
          user: {
            userId: 'u1',
            name: '张三',
            department: ['总经办'],
            roles: ['admin'],
          },
        },
      },
    });
    const api = createApiStub();
    const baseQuery = createAxiosBaseQuery({
      client: { request, post } as never,
      onAuthFailure,
    });

    const result = await baseQuery({ url: '/auth/me' }, api, {});

    expect(post).toHaveBeenCalledOnce();
    expect(request).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ data: { data: { ok: true } } });
    expect(window.localStorage.getItem('sunan_token')).toBe('fresh-token');
    expect(api.dispatch).toHaveBeenCalled();
  });

  it('clears token and triggers oauth redirect when refresh fails', async () => {
    window.localStorage.setItem('sunan_token', 'expired-token');
    const request = vi
      .fn()
      .mockRejectedValueOnce({ response: { status: 401 }, message: 'Unauthorized' });
    const post = vi.fn().mockRejectedValue(new Error('refresh failed'));
    const api = createApiStub();
    const baseQuery = createAxiosBaseQuery({
      client: { request, post } as never,
      onAuthFailure,
    });

    await baseQuery({ url: '/auth/me' }, api, {});

    expect(window.localStorage.getItem('sunan_token')).toBeNull();
    expect(onAuthFailure).toHaveBeenCalledWith(expect.stringContaining('/'));
    expect(api.dispatch).toHaveBeenCalled();
  });

  it('clears the session when /auth/me returns a forbidden response', async () => {
    window.localStorage.setItem('sunan_token', 'disabled-token');
    const request = vi.fn().mockRejectedValue({ response: { status: 403 }, message: 'Forbidden' });
    const api = createApiStub();
    const baseQuery = createAxiosBaseQuery({
      client: { request, post: vi.fn() } as never,
      onAuthFailure,
    });

    await baseQuery({ url: '/auth/me' }, api, {});

    expect(window.localStorage.getItem('sunan_token')).toBeNull();
    expect(onAuthFailure).toHaveBeenCalledWith(expect.stringContaining('/'));
    expect(api.dispatch).toHaveBeenCalled();
  });

  it('invalidates current identity after a business forbidden response without redirecting', async () => {
    window.localStorage.setItem('sunan_token', 'stale-token');
    const request = vi.fn().mockRejectedValue({ response: { status: 403 }, message: 'Forbidden' });
    const api = createApiStub();
    const baseQuery = createAxiosBaseQuery({
      client: { request, post: vi.fn() } as never,
      onAuthFailure,
    });

    await baseQuery({ url: '/procurement/orders' }, api, {});

    expect(window.localStorage.getItem('sunan_token')).toBe('stale-token');
    expect(onAuthFailure).not.toHaveBeenCalled();
    expect(api.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: ['CurrentUser'],
      }),
    );
  });

  it('shares one refresh request across concurrent expired-token requests', async () => {
    window.localStorage.setItem('sunan_token', 'expired-token');
    const request = vi
      .fn()
      .mockRejectedValueOnce({ response: { status: 401 }, message: 'Unauthorized' })
      .mockRejectedValueOnce({ response: { status: 401 }, message: 'Unauthorized' })
      .mockResolvedValue({ data: { data: { ok: true } } });
    const post = vi.fn().mockResolvedValue({
      data: {
        data: {
          accessToken: 'fresh-token',
          expiresIn: 7200,
          user: { userId: 'u1', name: '张三', department: [], roles: [] },
        },
      },
    });
    const baseQuery = createAxiosBaseQuery({
      client: { request, post } as never,
      onAuthFailure,
    });

    await Promise.all([
      baseQuery({ url: '/procurement/orders' }, createApiStub(), {}),
      baseQuery({ url: '/workbench/tasks' }, createApiStub(), {}),
    ]);

    expect(post).toHaveBeenCalledOnce();
    expect(request).toHaveBeenCalledTimes(4);
  });

  it('handles a forbidden response after a successful token refresh', async () => {
    window.localStorage.setItem('sunan_token', 'expired-token');
    const request = vi
      .fn()
      .mockRejectedValueOnce({ response: { status: 401 }, message: 'Unauthorized' })
      .mockRejectedValueOnce({ response: { status: 403 }, message: 'Forbidden' });
    const post = vi.fn().mockResolvedValue({
      data: {
        data: {
          accessToken: 'fresh-token',
          expiresIn: 7200,
          user: { userId: 'u1', name: '张三', department: [], roles: [] },
        },
      },
    });
    const api = createApiStub();
    const baseQuery = createAxiosBaseQuery({
      client: { request, post } as never,
      onAuthFailure,
    });

    await baseQuery({ url: '/procurement/orders' }, api, {});

    expect(onAuthFailure).not.toHaveBeenCalled();
    expect(api.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ payload: ['CurrentUser'] }),
    );
  });
});
