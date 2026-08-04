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

async function createAuthenticatedStore() {
  const { createStore } = await import('../app/store');
  const { loginSucceeded } = await import('../features/auth/authSlice');
  const store = createStore();
  store.dispatch(
    loginSucceeded({
      accessToken: 'jwt-token',
      expiresIn: 3600,
      user: {
        userId: 'u-navigation',
        name: '导航测试用户',
        avatar: 'https://avatar.example.com/navigation.png',
        departmentIds: [1, 3],
        department: ['公司成员', '总经办'],
        roles: ['all_authenticated', 'system_admin'],
      },
    }),
  );
  return store;
}

describe('AppShell navigation', () => {
  beforeEach(() => {
    vi.resetModules();
    redirectToOAuth.mockReset();
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
    return (
      <>
        <div data-testid="location-path">{location.pathname}</div>
        <div data-testid="location-search">{location.search}</div>
      </>
    );
  }

  it('clears the current session and redirects when reauthorizing', async () => {
    const { AppShell } = await import('./AppShell');
    const store = await createAuthenticatedStore();
    const user = userEvent.setup();

    render(
      <Provider store={store}>
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={['/my']}>
          <AppShell />
        </MemoryRouter>
      </Provider>,
    );

    expect(screen.getByText('导航测试用户')).toBeInTheDocument();
    expect(
      screen.getAllByRole('img', { name: '导航测试用户的头像' }).length,
    ).toBeGreaterThan(0);
    await user.click(screen.getAllByRole('button', { name: /重新认证/ }).at(-1)!);
    expect(redirectToOAuth).toHaveBeenCalledWith('/my');
    expect(store.getState().auth.token).toBeNull();
  }, 20000);

  it('shows a mobile more menu that exposes navigation links on small screens', async () => {
    setViewport(375);

    const { AppShell } = await import('./AppShell');
    const store = await createAuthenticatedStore();
    const user = userEvent.setup();

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

    const { AppShell } = await import('./AppShell');
    const store = await createAuthenticatedStore();
    const user = userEvent.setup();

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

  it('shows a mobile back button on secondary pages and returns to the module home', async () => {
    setViewport(375);

    const { AppShell } = await import('./AppShell');
    const store = await createAuthenticatedStore();
    const user = userEvent.setup();

    render(
      <Provider store={store}>
        <MemoryRouter
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
          initialEntries={['/my', '/my/enterprise-profile']}
          initialIndex={1}
        >
          <Routes>
            <Route element={<AppShell />}>
              <Route path="/my" element={<LocationDisplay />} />
              <Route path="/my/enterprise-profile" element={<LocationDisplay />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </Provider>,
    );

    expect(screen.getByTestId('location-path')).toHaveTextContent('/my/enterprise-profile');

    await user.click(screen.getByRole('button', { name: '返回' }));

    expect(screen.getByTestId('location-path')).toHaveTextContent('/my');
    expect(screen.queryByRole('button', { name: '返回' })).toBeNull();
  });

  it('returns to the module home even when a backTo query preserves a list state', async () => {
    setViewport(375);

    const { AppShell } = await import('./AppShell');
    const store = await createAuthenticatedStore();
    const user = userEvent.setup();
    const backTo = encodeURIComponent(
      '/my/certificates?page=1&pageSize=10&ownerType=vehicle&groupBy=owner&status=active',
    );

    render(
      <Provider store={store}>
        <MemoryRouter
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
          initialEntries={[`/my/certificates/c1?backTo=${backTo}`]}
        >
          <Routes>
            <Route element={<AppShell />}>
              <Route path="/my" element={<LocationDisplay />} />
              <Route path="/my/certificates" element={<LocationDisplay />} />
              <Route path="/my/certificates/:id" element={<LocationDisplay />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </Provider>,
    );

    expect(screen.getByTestId('location-path')).toHaveTextContent('/my/certificates/c1');

    await user.click(screen.getByRole('button', { name: '返回' }));

    expect(screen.getByTestId('location-path')).toHaveTextContent('/my');
    expect(screen.getByTestId('location-search')).toBeEmptyDOMElement();
  });

  it('does not show the mobile back button on module root pages', async () => {
    setViewport(375);

    const { AppShell } = await import('./AppShell');
    const store = await createAuthenticatedStore();

    render(
      <Provider store={store}>
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={['/my']}>
          <AppShell />
        </MemoryRouter>
      </Provider>,
    );

    expect(screen.queryByRole('button', { name: '返回' })).toBeNull();
  });

  it('renders drawer navigation as lightweight text items without the default button fill class', async () => {
    setViewport(375);

    const { AppShell } = await import('./AppShell');
    const store = await createAuthenticatedStore();
    const user = userEvent.setup();

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

    const { AppShell } = await import('./AppShell');
    const store = await createAuthenticatedStore();
    const user = userEvent.setup();

    render(
      <Provider store={store}>
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={['/procurement']}>
          <Routes>
            <Route element={<AppShell />}>
              <Route path="/my" element={<LocationDisplay />} />
              <Route path="/office" element={<LocationDisplay />} />
              <Route path="/procurement" element={<LocationDisplay />} />
              <Route path="/workbench" element={<LocationDisplay />} />
            </Route>
          </Routes>
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

    expect(screen.getByTestId('location-path')).toHaveTextContent('/office');
    expect(within(sidebar).getByRole('button', { name: '采购管理' })).toHaveAttribute('aria-expanded', 'false');
    expect(within(sidebar).getByRole('button', { name: '办事中心' })).toHaveAttribute('aria-expanded', 'true');
    expect(within(sidebar).getByRole('button', { name: '办事首页' })).toHaveClass('shell-sidebar-subitem', 'is-active');

    await user.click(within(sidebar).getByRole('button', { name: '我的' }));

    expect(screen.getByTestId('location-path')).toHaveTextContent('/my');
    expect(within(sidebar).getByRole('button', { name: '办事中心' })).toHaveAttribute('aria-expanded', 'false');
    expect(within(sidebar).getByRole('button', { name: '我的' })).toHaveAttribute('aria-expanded', 'true');
    expect(within(sidebar).getByRole('button', { name: '我的首页' })).toHaveClass('shell-sidebar-subitem', 'is-active');

    await user.click(within(sidebar).getByRole('button', { name: '我的' }));

    expect(screen.getByTestId('location-path')).toHaveTextContent('/my');
    expect(within(sidebar).getByRole('button', { name: '我的' })).toHaveAttribute('aria-expanded', 'false');

    await user.click(screen.getByRole('button', { name: '收起左侧导航' }));

    expect(document.querySelector('.shell-main-layout')).toHaveClass('is-sidebar-collapsed');
    expect(screen.getByRole('button', { name: '展开左侧导航' })).toBeInTheDocument();

    await user.click(within(sidebar).getByRole('button', { name: '工作平台' }));

    expect(screen.getByTestId('location-path')).toHaveTextContent('/workbench');
  });
});
