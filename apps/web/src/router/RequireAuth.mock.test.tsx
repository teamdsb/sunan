import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const redirectToOAuth = vi.hoisted(() => vi.fn());

vi.mock('../features/auth/oauth', () => ({
  redirectToOAuth,
}));

describe('RequireAuth mock mode', () => {
  beforeEach(() => {
    vi.resetModules();
    redirectToOAuth.mockReset();
    vi.stubEnv('VITE_MOCK_MODE', 'true');
  });

  it('renders protected content without oauth redirect', async () => {
    const { createStore } = await import('../app/store');
    const { RequireAuth } = await import('./RequireAuth');

    render(
      <Provider store={createStore()}>
        <MemoryRouter initialEntries={['/my']}>
          <Routes>
            <Route element={<RequireAuth />}>
              <Route path="/my" element={<div>MY_PAGE</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </Provider>,
    );

    expect(await screen.findByText('MY_PAGE')).toBeInTheDocument();
    expect(redirectToOAuth).not.toHaveBeenCalled();
  });
});
