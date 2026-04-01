import {
  BellOutlined,
  FileProtectOutlined,
  FileSearchOutlined,
  MonitorOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { Typography } from 'antd';
import type { ComponentType } from 'react';
import { Link } from 'react-router-dom';
import { myRouteNavItems } from '../../router/myRouteConfig';

const entries = myRouteNavItems.filter((item) => item.path !== '/my');

const entryIcons: Record<string, ComponentType> = {
  '/my/enterprise-profile': FileSearchOutlined,
  '/my/enterprise-policy': FileProtectOutlined,
  '/my/certificates': SafetyCertificateOutlined,
  '/my/reminders': BellOutlined,
  '/my/monitors': MonitorOutlined,
  '/my/settings': SettingOutlined,
};

export function MyHomePage() {
  return (
    <>
      <section className="page-hero my-home-hero">
        <Typography.Title level={2}>我的模块首页</Typography.Title>
        <Typography.Paragraph type="secondary">
          快捷进入常用业务模块。
        </Typography.Paragraph>
      </section>

      <section className="my-home-grid my-home-icon-grid" data-testid="my-home-grid">
        {entries.map((entry) => {
          const Icon = entryIcons[entry.path] ?? FileSearchOutlined;

          return (
            <Link
              to={entry.path}
              className="my-home-shortcut"
              data-testid="my-home-shortcut"
              key={entry.path}
              aria-label={entry.label}
            >
              <span className="my-home-shortcut-icon" aria-hidden="true">
                <Icon />
              </span>
              <Typography.Text className="my-home-shortcut-label">{entry.label}</Typography.Text>
            </Link>
          );
        })}
      </section>
    </>
  );
}
