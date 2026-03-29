import { Avatar, Button, Layout, Space, Tag, Typography } from 'antd';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { env } from '../app/env';
import { logout } from '../features/auth/authSlice';
import { redirectToOAuth } from '../features/auth/oauth';

const navItems = [
  { to: '/my', label: '我的首页' },
  { to: '/my/enterprise-profile', label: '企业资料' },
  { to: '/my/enterprise-policy', label: '企业制度' },
  { to: '/my/certificates', label: '电子证照' },
  { to: '/my/monitors', label: '船舶监控' },
  { to: '/my/settings', label: '设置' },
];

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
            {navItems.map((item) => (
              <Button key={item.to} type={location.pathname === item.to ? 'primary' : 'default'}>
                <Link to={item.to}>{item.label}</Link>
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
