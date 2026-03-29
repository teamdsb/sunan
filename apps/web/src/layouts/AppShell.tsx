import { Avatar, Button, Layout, Space, Tag, Typography } from 'antd';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { env } from '../app/env';
import { logout } from '../features/auth/authSlice';
import { redirectToOAuth } from '../features/auth/oauth';
import { myRouteNavItems } from '../router/myRouteConfig';

export function AppShell() {
  const user = useAppSelector((state) => state.auth.currentUser);
  const dispatch = useAppDispatch();
  const location = useLocation();

  const reauthorize = () => {
    if (env.mockMode) {
      return;
    }

    dispatch(logout());
    redirectToOAuth(location.pathname + location.search + location.hash);
  };

  return (
    <Layout className="shell-layout">
      <div className="shell-panel">
        <header className="shell-header">
          <div>
            <Typography.Title level={1} className="shell-title">
              苏南船舶管理
            </Typography.Title>
            <Typography.Paragraph className="shell-subtitle">
              企业微信 H5 工作台
            </Typography.Paragraph>
          </div>
          <Space wrap size="middle">
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
              <Space>
                <Avatar>{user.name.slice(0, 1)}</Avatar>
                <div>
                  <Typography.Text strong>{user.name}</Typography.Text>
                  <br />
                  <Tag color="cyan">{user.roles.join(' / ') || 'employee'}</Tag>
                </div>
              </Space>
            ) : null}
            <Button onClick={reauthorize}>重新认证</Button>
          </Space>
        </header>
        <Outlet />
      </div>
    </Layout>
  );
}
