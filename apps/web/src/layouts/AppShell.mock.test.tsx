import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
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

  function setViewport(width: number) {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: width,
    });
    window.dispatchEvent(new Event('resize'));
  }

  function LocationDisplay() {
    const location = useLocation();
    return <div data-testid="location-path">{location.pathname}</div>;
  }

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
    await user.click(screen.getAllByRole('button', { name: /重新认证/ }).at(-1)!);
    expect(redirectToOAuth).not.toHaveBeenCalled();
    expect(screen.getByText('调试管理员')).toBeInTheDocument();
  }, 10000);

  it('shows a mobile more menu that exposes navigation links on small screens', async () => {
    setViewport(375);

    const { createStore } = await import('../app/store');
    const { bootstrapAuth } = await import('../features/auth/bootstrap');
    const { AppShell } = await import('./AppShell');
    const store = createStore();
    const user = userEvent.setup();

    await bootstrapAuth(store.dispatch);

    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/my/reminders']}>
          <AppShell />
        </MemoryRouter>
      </Provider>,
    );

    expect(screen.getAllByRole('button', { name: /更多/ }).length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: '我的' })).toBeInTheDocument();
    expect(screen.queryByText('当前页面')).toBeNull();

    await user.click(screen.getAllByRole('button', { name: /更多/ }).at(-1)!);

    expect(screen.getAllByRole('button', { name: '我的' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: '办事' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: '采购管理' }).length).toBeGreaterThan(0);
  });

  it('navigates when tapping a mobile drawer button body', async () => {
    setViewport(375);

    const { createStore } = await import('../app/store');
    const { bootstrapAuth } = await import('../features/auth/bootstrap');
    const { AppShell } = await import('./AppShell');
    const store = createStore();
    const user = userEvent.setup();

    await bootstrapAuth(store.dispatch);

    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/my/reminders']}>
          <Routes>
            <Route element={<AppShell />}>
              <Route path="/my" element={<LocationDisplay />} />
              <Route path="/my/reminders" element={<LocationDisplay />} />
              <Route path="/office" element={<LocationDisplay />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </Provider>,
    );

    expect(screen.getByTestId('location-path')).toHaveTextContent('/my/reminders');

    await user.click(screen.getAllByRole('button', { name: /更多/ }).at(-1)!);
    await user.click(screen.getAllByRole('button', { name: '办事' }).at(-1)!);

    expect(screen.getByTestId('location-path')).toHaveTextContent('/office');
  });

  it('renders drawer navigation as lightweight text items without the default button fill class', async () => {
    setViewport(375);

    const { createStore } = await import('../app/store');
    const { bootstrapAuth } = await import('../features/auth/bootstrap');
    const { AppShell } = await import('./AppShell');
    const store = createStore();
    const user = userEvent.setup();

    await bootstrapAuth(store.dispatch);

    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/my/reminders']}>
          <AppShell />
        </MemoryRouter>
      </Provider>,
    );

    await user.click(screen.getAllByRole('button', { name: /更多/ }).at(-1)!);

    expect(screen.getAllByRole('button', { name: '我的' }).at(-1)).toHaveClass('shell-mobile-nav-item', 'is-active');
    expect(screen.getAllByRole('button', { name: '办事' }).at(-1)).toHaveClass('shell-mobile-nav-item');
  });
});
