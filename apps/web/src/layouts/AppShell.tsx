import MenuOutlined from '@ant-design/icons/MenuOutlined';
import ReloadOutlined from '@ant-design/icons/ReloadOutlined';
import Avatar from 'antd/es/avatar';
import Button from 'antd/es/button';
import Drawer from 'antd/es/drawer';
import Layout from 'antd/es/layout';
import Space from 'antd/es/space';
import Tag from 'antd/es/tag';
import Typography from 'antd/es/typography';
import { useMemo, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { env } from '../app/env';
import { logout } from '../features/auth/authSlice';
import { redirectToOAuth } from '../features/auth/oauth';
import { moduleNavItems, resolveModuleLabel } from '../router/moduleNav';

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
  const dispatch = useAppDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isMyRoute = location.pathname === '/my' || location.pathname.startsWith('/my/');
  const isMyHomeRoute = location.pathname === '/my';
  const currentModuleKey = useMemo(() => {
    const moduleKey = location.pathname.split('/').filter(Boolean)[0] ?? 'my';
    return ['my', 'office', 'procurement', 'workbench'].includes(moduleKey) ? moduleKey : 'my';
  }, [location.pathname]);

  const currentModuleLabel = useMemo(
    () => resolveModuleLabel(location.pathname),
    [location.pathname],
  );

  const reauthorize = () => {
    if (env.mockMode) {
      return;
    }

    dispatch(logout());
    redirectToOAuth(location.pathname + location.search + location.hash);
  };

  const navigateTo = (path: string) => {
    setMobileNavOpen(false);
    navigate(path);
  };

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
          <div className="shell-mobile-topbar">
            <Typography.Title level={3} className="shell-mobile-page-title">
              {currentModuleLabel}
            </Typography.Title>
            <Button
              type="text"
              className="shell-mobile-more-button"
              icon={<MenuOutlined />}
              onClick={() => setMobileNavOpen(true)}
            >
              更多
            </Button>
          </div>
          <div className="shell-brand">
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
            {moduleNavItems.map((item) => (
              <Button
                key={item.path}
                type={
                  item.matchPrefixes.some(
                    (prefix) =>
                      location.pathname === prefix ||
                      location.pathname.startsWith(`${prefix}/`),
                  )
                    ? 'primary'
                    : 'default'
                }
              >
                <Link to={item.path}>{item.label}</Link>
              </Button>
            ))}
            {user ? (
              <Space className="shell-user-card">
                <Avatar>{user.name.slice(0, 1)}</Avatar>
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
        <div className="shell-content">
          <Outlet />
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
                  <Avatar>{user.name.slice(0, 1)}</Avatar>
                  <div>
                    <Typography.Text strong>{user.name}</Typography.Text>
                    <br />
                    <Tag color="cyan">{formatRoleLabels(user.roles)}</Tag>
                  </div>
                </Space>
              </div>
            ) : null}
            <Space direction="vertical" size="small" className="shell-mobile-nav-list">
              {moduleNavItems.map((item) => (
                <Button
                  key={item.path}
                  type="text"
                  block
                  className={[
                    'shell-mobile-nav-item',
                    item.matchPrefixes.some(
                      (prefix) =>
                        location.pathname === prefix ||
                        location.pathname.startsWith(`${prefix}/`),
                    )
                      ? 'is-active'
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-current={
                    item.matchPrefixes.some(
                      (prefix) =>
                        location.pathname === prefix ||
                        location.pathname.startsWith(`${prefix}/`),
                    )
                      ? 'page'
                      : undefined
                  }
                  onClick={() => navigateTo(item.path)}
                >
                  {item.label}
                </Button>
              ))}
            </Space>
            <Button onClick={reauthorize} icon={<ReloadOutlined />} block type="text" className="shell-mobile-nav-item shell-mobile-reauthorize">
              重新认证
            </Button>
          </Space>
        </Drawer>
      </div>
    </Layout>
  );
}
