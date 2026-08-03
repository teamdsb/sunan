import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
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
    vi.mocked(useGetCurrentUserQuery).mockReturnValue({
      data: {
        data: {
          userId: 'aisolate',
          name: '李富悦',
          department: ['钦州市苏南船舶服务有限公司'],
          roles: ['all_authenticated', 'system_admin'],
        },
      },
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
  });
});
