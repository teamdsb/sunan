import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createStore } from '../app/store';
import { bootstrapFromStorage } from '../features/auth/authSlice';
import { useGetCurrentUserQuery } from '../features/auth/authApi';

vi.mock('../features/auth/authApi', () => ({
  useGetCurrentUserQuery: vi.fn(),
}));

describe('AppShell auth recovery', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.mocked(useGetCurrentUserQuery).mockReset();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('restores the current user from /auth/me when a stored token exists', async () => {
    const refetch = vi.fn();
    vi.mocked(useGetCurrentUserQuery).mockReturnValue({
      data: {
        data: {
          userId: 'aisolate',
          name: '李富悦',
          department: ['钦州市苏南船舶服务有限公司'],
          roles: ['all_authenticated', 'system_admin'],
        },
      },
      refetch,
    } as never);
    window.localStorage.setItem('sunan_token', 'jwt-token');
    const store = createStore();
    store.dispatch(bootstrapFromStorage());
    const { AppShell } = await import('./AppShell');

    render(
      <Provider store={store}>
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={['/my']}>
          <AppShell />
        </MemoryRouter>
      </Provider>,
    );

    expect(await screen.findByText('李富悦')).toBeInTheDocument();
    expect(vi.mocked(useGetCurrentUserQuery)).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({ skip: false }),
    );
    expect(refetch).not.toHaveBeenCalled();
  });

  it('does not refetch identity just because the route changes', async () => {
    const refetch = vi.fn();
    vi.mocked(useGetCurrentUserQuery).mockReturnValue({
      data: {
        data: {
          userId: 'route-stable',
          name: '路由稳定用户',
          department: ['总经办'],
          roles: ['all_authenticated'],
        },
      },
      refetch,
    } as never);
    window.localStorage.setItem('sunan_token', 'jwt-token');
    const store = createStore();
    store.dispatch(bootstrapFromStorage());
    const { AppShell } = await import('./AppShell');
    const user = userEvent.setup();

    render(
      <Provider store={store}>
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={['/my']}>
          <Routes>
            <Route element={<AppShell />}>
              <Route path="/my" element={<div>首页</div>} />
              <Route path="/my/enterprise-profile" element={<div>企业资料页</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </Provider>,
    );

    await user.click(screen.getByRole('button', { name: '企业资料' }));
    expect(await screen.findByText('企业资料页')).toBeInTheDocument();
    expect(refetch).not.toHaveBeenCalled();
  });

  it('coalesces repeated mobile focus events into one identity refresh', async () => {
    const refetch = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useGetCurrentUserQuery).mockReturnValue({
      data: {
        data: {
          userId: 'focus-stable',
          name: '焦点稳定用户',
          department: ['总经办'],
          roles: ['all_authenticated'],
        },
      },
      refetch,
    } as never);
    window.localStorage.setItem('sunan_token', 'jwt-token');
    const store = createStore();
    store.dispatch(bootstrapFromStorage());
    const { AppShell } = await import('./AppShell');

    render(
      <Provider store={store}>
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={['/workbench']}>
          <AppShell />
        </MemoryRouter>
      </Provider>,
    );

    window.dispatchEvent(new Event('focus'));
    window.dispatchEvent(new Event('focus'));
    window.dispatchEvent(new Event('online'));
    document.dispatchEvent(new Event('visibilitychange'));

    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
