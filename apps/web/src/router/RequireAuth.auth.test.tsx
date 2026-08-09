import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const redirectToOAuth = vi.hoisted(() => vi.fn());
const hasCurrentOauthPermissionVersion = vi.hoisted(() => vi.fn());

vi.mock('../features/auth/oauth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../features/auth/oauth')>();
  return {
    ...actual,
    redirectToOAuth,
    hasCurrentOauthPermissionVersion,
  };
});

describe('RequireAuth auth mode', () => {
  beforeEach(() => {
    vi.resetModules();
    redirectToOAuth.mockReset();
    hasCurrentOauthPermissionVersion.mockReset();
    hasCurrentOauthPermissionVersion.mockReturnValue(false);
  });

  afterEach(() => {
    cleanup();
  });

  it('keeps the direct-entry path, query, and hash when starting oauth', async () => {
    const { createStore } = await import('../app/store');
    const { RequireAuth } = await import('./RequireAuth');
    const target = '/workbench/records/record-1?from=wecom#step-2';

    render(
      <Provider store={createStore()}>
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={[target]}>
          <Routes>
            <Route element={<RequireAuth />}>
              <Route
                path="/workbench/records/:recordId"
                element={<div>RECORD_DETAIL</div>}
              />
            </Route>
          </Routes>
        </MemoryRouter>
      </Provider>,
    );

    expect(
      await screen.findByText('正在跳转企业微信授权'),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(redirectToOAuth).toHaveBeenCalledWith(target);
    });
    expect(screen.queryByText('RECORD_DETAIL')).not.toBeInTheDocument();
  });

  it('reauthorizes a stored legacy session once for the private-information scope', async () => {
    const { createStore } = await import('../app/store');
    const { loginSucceeded } = await import('../features/auth/authSlice');
    const { RequireAuth } = await import('./RequireAuth');
    const store = createStore();
    store.dispatch(loginSucceeded({
      accessToken: 'legacy-token',
      expiresIn: 7200,
      user: {
        userId: 'member-1',
        name: '王工',
        department: ['船务部'],
        roles: ['all_authenticated', 'shipping'],
      },
    }));

    render(
      <Provider store={store}>
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={['/my']}>
          <Routes>
            <Route element={<RequireAuth />}>
              <Route path="/my" element={<div>MY_PAGE</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </Provider>,
    );

    expect(await screen.findByText('正在跳转企业微信授权')).toBeInTheDocument();
    await waitFor(() => {
      expect(redirectToOAuth).toHaveBeenCalledWith('/my');
    });
    expect(screen.queryByText('MY_PAGE')).not.toBeInTheDocument();
  });
});
