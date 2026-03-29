import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const redirectToOAuth = vi.hoisted(() => vi.fn());

vi.mock('../features/auth/oauth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../features/auth/oauth')>();
  return {
    ...actual,
    redirectToOAuth,
  };
});

describe('AppShell mock mode', () => {
  beforeEach(() => {
    vi.resetModules();
    redirectToOAuth.mockReset();
    vi.stubEnv('VITE_MOCK_MODE', 'true');
  });

  it('keeps the mock user and does not redirect on reauthorize', async () => {
    const { createStore } = await import('../app/store');
    const { bootstrapAuth } = await import('../features/auth/bootstrap');
    const { AppShell } = await import('./AppShell');
    const store = createStore();
    const user = userEvent.setup();

    await bootstrapAuth(store.dispatch);

    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/my']}>
          <AppShell />
        </MemoryRouter>
      </Provider>,
    );

    expect(screen.getByText('调试管理员')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '重新认证' }));
    expect(redirectToOAuth).not.toHaveBeenCalled();
    expect(screen.getByText('调试管理员')).toBeInTheDocument();
  });
});
