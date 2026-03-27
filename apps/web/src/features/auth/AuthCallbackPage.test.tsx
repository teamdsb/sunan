import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthCallbackPage } from './AuthCallbackPage';
import { authReducer } from './authSlice';
import { myUiReducer } from '../ui/myUiSlice';
import { baseApi } from '../../app/baseApi';

const mockCallback = vi.fn();
const mockGetCurrentUser = vi.fn();

vi.mock('./authApi', () => ({
  useLazyWecomCallbackQuery: () => [mockCallback],
  useLazyGetCurrentUserQuery: () => [mockGetCurrentUser],
}));

function renderPage(initialEntry: string) {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      myUi: myUiReducer,
      [baseApi.reducerPath]: baseApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(baseApi.middleware),
  });

  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/my" element={<div>MY_PAGE</div>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
}

describe('AuthCallbackPage', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
    mockCallback.mockReset();
    mockGetCurrentUser.mockReset();
    window.sessionStorage.setItem('sunan_oauth_state', 'safe-state');
    window.sessionStorage.setItem('sunan_post_auth_redirect', '/my');
  });

  it('completes callback flow and redirects', async () => {
    mockCallback.mockReturnValue({
      unwrap: () =>
        Promise.resolve({
          data: {
            accessToken: 'token-1',
            expiresIn: 7200,
            user: {
              userId: 'u1',
              name: '张三',
              department: ['总经办'],
              roles: ['admin'],
            },
          },
        }),
    });
    mockGetCurrentUser.mockReturnValue({
      unwrap: () =>
        Promise.resolve({
          data: {
            userId: 'u1',
            name: '张三',
            department: ['总经办'],
            roles: ['admin'],
          },
        }),
    });

    renderPage('/auth/callback?code=abc&state=safe-state');

    await waitFor(() => {
      expect(screen.getByText('MY_PAGE')).toBeInTheDocument();
    });
    expect(window.localStorage.getItem('sunan_token')).toBe('token-1');
  });

  it('shows error when state verification fails', async () => {
    renderPage('/auth/callback?code=abc&state=wrong');

    await waitFor(() => {
      expect(screen.getByText('认证未完成')).toBeInTheDocument();
    });
  });
});
