import { Avatar, Button, Drawer, Layout, Space, Tag, Typography } from 'antd';
import { MenuOutlined, ReloadOutlined } from '@ant-design/icons';
import { useMemo, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { env } from '../app/env';
import { logout } from '../features/auth/authSlice';
import { redirectToOAuth } from '../features/auth/oauth';
import { myRouteNavItems } from '../router/myRouteConfig';

export function AppShell() {
  const user = useAppSelector((state) => state.auth.currentUser);
  const dispatch = useAppDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const currentNavItem = useMemo(() => {
    return (
      myRouteNavItems.find((item) =>
        item.path === '/my' ? location.pathname === item.path : location.pathname.startsWith(item.path),
      ) ?? myRouteNavItems[0]
    );
  }, [location.pathname]);

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
    <Layout className="shell-layout">
      <div className="shell-panel">
        <header className="shell-header">
          <div className="shell-mobile-topbar">
            <Typography.Title level={3} className="shell-mobile-page-title">
              {currentNavItem.label}
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
            {myRouteNavItems.map((item) => (
              <Button
                key={item.path}
                type={
                  item.path === '/my'
                    ? location.pathname === item.path
                      ? 'primary'
                      : 'default'
                    : location.pathname.startsWith(item.path)
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
                  <Tag color="cyan">{user.roles.join(' / ') || 'employee'}</Tag>
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
          className="shell-mobile-drawer"
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            {user ? (
              <div className="shell-mobile-drawer-user">
                <Space>
                  <Avatar>{user.name.slice(0, 1)}</Avatar>
                  <div>
                    <Typography.Text strong>{user.name}</Typography.Text>
                    <br />
                    <Tag color="cyan">{user.roles.join(' / ') || 'employee'}</Tag>
                  </div>
                </Space>
              </div>
            ) : null}
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              {myRouteNavItems.map((item) => (
                <Button
                  key={item.path}
                  type="text"
                  block
                  className={[
                    'shell-mobile-nav-item',
                    item.path === '/my'
                      ? location.pathname === item.path
                        ? 'is-active'
                        : ''
                      : location.pathname.startsWith(item.path)
                        ? 'is-active'
                        : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-current={
                    item.path === '/my'
                      ? location.pathname === item.path
                        ? 'page'
                        : undefined
                      : location.pathname.startsWith(item.path)
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
