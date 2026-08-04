import MenuOutlined from '@ant-design/icons/MenuOutlined';
import ReloadOutlined from '@ant-design/icons/ReloadOutlined';
import AppstoreOutlined from '@ant-design/icons/AppstoreOutlined';
import DownOutlined from '@ant-design/icons/DownOutlined';
import DoubleLeftOutlined from '@ant-design/icons/DoubleLeftOutlined';
import DoubleRightOutlined from '@ant-design/icons/DoubleRightOutlined';
import HomeOutlined from '@ant-design/icons/HomeOutlined';
import LeftOutlined from '@ant-design/icons/LeftOutlined';
import ProjectOutlined from '@ant-design/icons/ProjectOutlined';
import ShoppingCartOutlined from '@ant-design/icons/ShoppingCartOutlined';
import Button from 'antd/es/button';
import Drawer from 'antd/es/drawer';
import Layout from 'antd/es/layout';
import Space from 'antd/es/space';
import Tag from 'antd/es/tag';
import Typography from 'antd/es/typography';
import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { useGetCurrentUserQuery } from '../features/auth/authApi';
import { logout, setCurrentUser } from '../features/auth/authSlice';
import { redirectToOAuth } from '../features/auth/oauth';
import { UserAvatar } from '../features/auth/UserAvatar';
import { moduleNavGroups, moduleNavItems, resolveActiveNavGroupKey, resolveActiveNavItemKey } from '../router/moduleNav';

const groupIconMap = {
  my: HomeOutlined,
  office: AppstoreOutlined,
  procurement: ShoppingCartOutlined,
  workbench: ProjectOutlined,
} as const;

const bottomIconMap = {
  '/my': HomeOutlined,
  '/office': AppstoreOutlined,
  '/procurement': ShoppingCartOutlined,
  '/workbench': ProjectOutlined,
} as const;

const moduleRootPathMap = {
  my: '/my',
  office: '/office',
  procurement: '/procurement',
  workbench: '/workbench',
} as const;

type ModuleRootKey = keyof typeof moduleRootPathMap;

const roleLabelMap: Record<string, string> = {
  all_authenticated: '全体成员',
  system_admin: '系统管理员',
  general_office: '总经办',
  finance: '财务部',
  business: '业务部',
  shipping: '船务部',
  logistics: '后勤部',
  crew: '船员',
};

function formatRoleLabels(roles: string[]) {
  return roles.map((role) => roleLabelMap[role] ?? '自定义角色').join(' / ') || '员工';
}

export function AppShell() {
  const user = useAppSelector((state) => state.auth.currentUser);
  const token = useAppSelector((state) => state.auth.token);
  const dispatch = useAppDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const currentUserQuery = useGetCurrentUserQuery(undefined, {
    skip: !token || Boolean(user),
  });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const activeNavGroupKey = useMemo(() => resolveActiveNavGroupKey(location.pathname), [location.pathname]);
  const activeNavItemKey = useMemo(() => resolveActiveNavItemKey(location.pathname), [location.pathname]);
  const [openGroupKey, setOpenGroupKey] = useState<string | null>(activeNavGroupKey);
  const isMyRoute = location.pathname === '/my' || location.pathname.startsWith('/my/');
  const isMyHomeRoute = location.pathname === '/my';
  const currentModuleKey = useMemo(() => {
    const moduleKey = location.pathname.split('/').filter(Boolean)[0] ?? 'my';
    return Object.keys(moduleRootPathMap).includes(moduleKey)
      ? (moduleKey as ModuleRootKey)
      : 'my';
  }, [location.pathname]);
  const moduleRootPath = moduleRootPathMap[currentModuleKey];
  const showMobileBack = location.pathname !== moduleRootPath;

  useEffect(() => {
    setOpenGroupKey(activeNavGroupKey);
  }, [activeNavGroupKey]);

  useEffect(() => {
    if (currentUserQuery.data?.data) {
      dispatch(setCurrentUser(currentUserQuery.data.data));
    }
  }, [currentUserQuery.data, dispatch]);

  const reauthorize = () => {
    dispatch(logout());
    redirectToOAuth(location.pathname + location.search + location.hash);
  };

  const navigateTo = (path: string) => {
    setMobileNavOpen(false);
    navigate(path);
  };

  const navigateBack = () => {
    navigate(moduleRootPath);
  };

  const toggleGroup = (groupKey: string) => {
    setOpenGroupKey((current) => (current === groupKey ? null : groupKey));
  };

  const navigateToDesktopGroup = (groupKey: string, path: string, isOpen: boolean) => {
    if (isOpen) {
      setOpenGroupKey(null);
      return;
    }

    setOpenGroupKey(groupKey);
    navigateTo(path);
  };

  const isActiveModule = (matchPrefixes: readonly string[]) =>
    matchPrefixes.some(
      (prefix) =>
        location.pathname === prefix ||
        location.pathname.startsWith(`${prefix}/`),
    );

  return (
    <Layout
      className={[
        'shell-layout',
        'shell-layout-enterprise',
        `shell-layout-module-${currentModuleKey}`,
        isMyRoute ? 'shell-layout-my' : '',
        isMyHomeRoute ? 'shell-layout-my-home' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="shell-panel">
        <header className="shell-header">
          <div className={['shell-mobile-topbar', showMobileBack ? 'has-back' : ''].filter(Boolean).join(' ')}>
            {showMobileBack ? (
              <Button
                type="text"
                className="shell-mobile-back-button"
                aria-label="返回"
                icon={<LeftOutlined />}
                onClick={navigateBack}
              />
            ) : null}
            <div className="shell-mobile-brand">
              <span className="shell-brand-mark" aria-hidden="true">
                <ProjectOutlined />
              </span>
              <div>
                <Typography.Title level={3} className="shell-mobile-page-title">
                  苏南船舶管理
                </Typography.Title>
                <Typography.Paragraph className="shell-mobile-page-subtitle">
                  企业微信 H5 工作台
                </Typography.Paragraph>
              </div>
            </div>
            <Button
              type="text"
              className="shell-mobile-more-button"
              aria-label="更多"
              onClick={() => setMobileNavOpen(true)}
            >
              {user ? (
                <UserAvatar
                  className="shell-mobile-user-avatar"
                  name={user.name}
                  avatar={user.avatar}
                  size={32}
                />
              ) : (
                <MenuOutlined />
              )}
            </Button>
          </div>
          <div className="shell-brand">
            <span className="shell-brand-mark" aria-hidden="true">
              <ProjectOutlined />
            </span>
            <div>
              <Typography.Title level={1} className="shell-title">
                苏南船舶管理
              </Typography.Title>
              <Typography.Paragraph className="shell-subtitle">
                企业微信 H5 工作台
              </Typography.Paragraph>
            </div>
          </div>
          <Space wrap size="middle" className="shell-desktop-actions">
            {user ? (
              <Space className="shell-user-card">
                <UserAvatar name={user.name} avatar={user.avatar} />
                <div>
                  <Typography.Text strong>{user.name}</Typography.Text>
                  <br />
                  <Tag color="cyan">{formatRoleLabels(user.roles)}</Tag>
                </div>
              </Space>
            ) : null}
            <Button onClick={reauthorize} icon={<ReloadOutlined />}>
              重新认证
            </Button>
          </Space>
        </header>
        <div className={['shell-main-layout', sidebarCollapsed ? 'is-sidebar-collapsed' : ''].filter(Boolean).join(' ')}>
          <aside className="shell-sidebar" aria-label="桌面模块导航">
            <div className="shell-sidebar-head">
              <Typography.Text className="shell-sidebar-title">模块导航</Typography.Text>
              <Button
                type="text"
                className="shell-sidebar-collapse"
                icon={sidebarCollapsed ? <DoubleRightOutlined /> : <DoubleLeftOutlined />}
                aria-label={sidebarCollapsed ? '展开左侧导航' : '收起左侧导航'}
                onClick={() => setSidebarCollapsed((value) => !value)}
              />
            </div>
            <nav className="shell-sidebar-nav">
              {moduleNavGroups.map((group) => {
                const GroupIcon = groupIconMap[group.key] ?? HomeOutlined;
                const groupActive = activeNavGroupKey === group.key;
                const groupOpen = openGroupKey === group.key && !sidebarCollapsed;

                return (
                  <div key={group.key} className={['shell-sidebar-group', groupOpen ? 'is-open' : ''].filter(Boolean).join(' ')}>
                    <button
                      type="button"
                      className={['shell-sidebar-group-trigger', groupActive ? 'is-active' : ''].filter(Boolean).join(' ')}
                      aria-expanded={sidebarCollapsed ? undefined : groupOpen}
                      aria-label={group.label}
                      title={sidebarCollapsed ? group.label : undefined}
                      onClick={() => navigateToDesktopGroup(group.key, group.path, groupOpen)}
                    >
                      <GroupIcon aria-hidden="true" />
                      <span className="shell-sidebar-label">{group.label}</span>
                      <DownOutlined className="shell-sidebar-group-chevron" aria-hidden="true" />
                    </button>
                    <div className="shell-sidebar-subnav">
                      {group.children.map((item) => {
                        const active = activeNavItemKey === item.key;

                        return (
                          <button
                            key={item.key}
                            type="button"
                            className={['shell-sidebar-subitem', active ? 'is-active' : ''].filter(Boolean).join(' ')}
                            aria-current={active ? 'page' : undefined}
                            onClick={() => navigateTo(item.path)}
                          >
                            <span className="shell-sidebar-subitem-dot" aria-hidden="true" />
                            <span className="shell-sidebar-subitem-label">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </nav>
          </aside>
          <main className="shell-content">
            <Outlet />
          </main>
        </div>
        <Drawer
          title="模块导航"
          placement="right"
          open={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
          rootClassName="shell-mobile-drawer-root"
          className="shell-mobile-drawer"
        >
          <Space direction="vertical" size="middle" className="shell-mobile-drawer-stack">
            {user ? (
              <div className="shell-mobile-drawer-user">
                <Space>
                  <UserAvatar name={user.name} avatar={user.avatar} />
                  <div>
                    <Typography.Text strong>{user.name}</Typography.Text>
                    <br />
                    <Tag color="cyan">{formatRoleLabels(user.roles)}</Tag>
                  </div>
                </Space>
              </div>
            ) : null}
            <Space direction="vertical" size="small" className="shell-mobile-nav-list">
              {moduleNavGroups.map((group) => {
                const groupOpen = openGroupKey === group.key;
                const GroupIcon = groupIconMap[group.key] ?? HomeOutlined;

                return (
                  <div key={group.key} className={['shell-mobile-nav-group', groupOpen ? 'is-open' : ''].filter(Boolean).join(' ')}>
                    <button
                      type="button"
                      className={['shell-mobile-nav-group-trigger', activeNavGroupKey === group.key ? 'is-active' : ''].filter(Boolean).join(' ')}
                      aria-expanded={groupOpen}
                      onClick={() => toggleGroup(group.key)}
                    >
                      <GroupIcon aria-hidden="true" />
                      <span>{group.label}</span>
                      <DownOutlined aria-hidden="true" />
                    </button>
                    <div className="shell-mobile-nav-sublist">
                      {group.children.map((item) => {
                        const active = activeNavItemKey === item.key;

                        return (
                          <Button
                            key={item.key}
                            type="text"
                            block
                            className={[
                              'shell-mobile-nav-item',
                              active ? 'is-active' : '',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                            aria-current={active ? 'page' : undefined}
                            onClick={() => navigateTo(item.path)}
                          >
                            {item.label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </Space>
            <Button onClick={reauthorize} icon={<ReloadOutlined />} block type="text" className="shell-mobile-nav-item shell-mobile-reauthorize">
              重新认证
            </Button>
          </Space>
        </Drawer>
      </div>
      <nav className="shell-mobile-bottom-nav" aria-label="底部模块导航">
        {moduleNavItems.map((item) => {
          const Icon = bottomIconMap[item.path as keyof typeof bottomIconMap] ?? HomeOutlined;
          const active = isActiveModule(item.matchPrefixes);

          return (
            <button
              key={item.path}
              type="button"
              className={['shell-mobile-bottom-item', active ? 'is-active' : ''].filter(Boolean).join(' ')}
              aria-current={active ? 'page' : undefined}
              onClick={() => navigateTo(item.path)}
            >
              <Icon aria-hidden="true" />
              <span>{item.label === '采购管理' ? '采购' : item.label === '工作平台' ? '工作台' : item.label}</span>
            </button>
          );
        })}
      </nav>
    </Layout>
  );
}
