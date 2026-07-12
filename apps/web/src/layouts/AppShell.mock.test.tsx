import { render, screen, within } from '@testing-library/react';
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
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={['/my']}>
          <AppShell />
        </MemoryRouter>
      </Provider>,
    );

    expect(screen.getByText('调试管理员')).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: /重新认证/ }).at(-1)!);
    expect(redirectToOAuth).not.toHaveBeenCalled();
    expect(screen.getByText('调试管理员')).toBeInTheDocument();
  }, 20000);

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
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={['/my/reminders']}>
          <AppShell />
        </MemoryRouter>
      </Provider>,
    );

    expect(screen.getAllByRole('button', { name: /更多/ }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('heading', { name: '苏南船舶管理' }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('navigation', { name: '移动模块导航' })).toBeNull();
    expect(screen.getByRole('navigation', { name: '底部模块导航' })).toBeInTheDocument();
    expect(screen.queryByText('当前页面')).toBeNull();

    await user.click(screen.getAllByRole('button', { name: /更多/ }).at(-1)!);

    const drawer = document.querySelector('.shell-mobile-drawer') as HTMLElement;
    expect(within(drawer).getByRole('button', { name: '我的' })).toBeInTheDocument();
    expect(within(drawer).getByRole('button', { name: '办事中心' })).toBeInTheDocument();
    expect(within(drawer).getByRole('button', { name: '采购管理' })).toBeInTheDocument();
    expect(within(drawer).getByRole('button', { name: '证书提醒' })).toBeInTheDocument();
    expect(within(drawer).getByRole('button', { name: '办事治理台' })).toBeInTheDocument();
    expect(within(drawer).getByRole('button', { name: '采购报表' })).toBeInTheDocument();
    expect(within(drawer).getByRole('button', { name: '考勤统计' })).toBeInTheDocument();
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
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={['/my/reminders']}>
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
    const drawer = document.querySelector('.shell-mobile-drawer') as HTMLElement;
    await user.click(within(drawer).getByRole('button', { name: '办事首页' }));

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
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={['/my/reminders']}>
          <AppShell />
        </MemoryRouter>
      </Provider>,
    );

    await user.click(screen.getAllByRole('button', { name: /更多/ }).at(-1)!);

    expect(document.querySelector('.shell-mobile-drawer .shell-mobile-nav-item.is-active')).toHaveTextContent('证书提醒');
    expect(document.querySelector('.shell-mobile-drawer .shell-mobile-nav-item:not(.is-active)')).toHaveClass('shell-mobile-nav-item');
  });

  it('renders collapsible desktop sidebar navigation', async () => {
    setViewport(1280);

    const { createStore } = await import('../app/store');
    const { bootstrapAuth } = await import('../features/auth/bootstrap');
    const { AppShell } = await import('./AppShell');
    const store = createStore();
    const user = userEvent.setup();

    await bootstrapAuth(store.dispatch);

    render(
      <Provider store={store}>
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={['/procurement']}>
          <AppShell />
        </MemoryRouter>
      </Provider>,
    );

    const sidebar = screen.getByRole('complementary', { name: '桌面模块导航' });

    expect(sidebar).toBeInTheDocument();
    expect(within(sidebar).getByRole('button', { name: '采购管理' })).toHaveClass('shell-sidebar-group-trigger', 'is-active');
    expect(within(sidebar).getByRole('button', { name: '采购管理' })).toHaveAttribute('aria-expanded', 'true');
    expect(within(sidebar).getByRole('button', { name: '我的' })).toHaveAttribute('aria-expanded', 'false');
    expect(within(sidebar).getByRole('button', { name: '采购单列表' })).toHaveClass('shell-sidebar-subitem', 'is-active');
    expect(within(sidebar).getByRole('button', { name: '采购报表' })).toBeInTheDocument();

    await user.click(within(sidebar).getByRole('button', { name: '办事中心' }));

    expect(within(sidebar).getByRole('button', { name: '采购管理' })).toHaveAttribute('aria-expanded', 'false');
    expect(within(sidebar).getByRole('button', { name: '办事中心' })).toHaveAttribute('aria-expanded', 'true');

    await user.click(within(sidebar).getByRole('button', { name: '我的' }));

    expect(within(sidebar).getByRole('button', { name: '办事中心' })).toHaveAttribute('aria-expanded', 'false');
    expect(within(sidebar).getByRole('button', { name: '我的' })).toHaveAttribute('aria-expanded', 'true');

    await user.click(screen.getByRole('button', { name: '收起左侧导航' }));

    expect(document.querySelector('.shell-main-layout')).toHaveClass('is-sidebar-collapsed');
    expect(screen.getByRole('button', { name: '展开左侧导航' })).toBeInTheDocument();
  });
});
