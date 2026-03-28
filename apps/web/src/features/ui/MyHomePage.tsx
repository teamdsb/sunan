import { Card, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { myRouteNavItems } from '../../router/myRouteConfig';

const entries = myRouteNavItems.filter((item) => item.path !== '/my');

export function MyHomePage() {
  return (
    <>
      <section className="page-hero my-home-hero">
        <Typography.Title level={2}>我的模块首页</Typography.Title>
        <Typography.Paragraph type="secondary">
          从这里进入证照、提醒、监控和设置。
        </Typography.Paragraph>
      </section>

      <section className="my-home-grid" data-testid="my-home-grid">
        {entries.map((entry) => (
          <Card className="my-home-tile" data-testid="my-home-tile" key={entry.path} variant="borderless">
            <div className="my-home-tile-accent" aria-hidden="true" />
            <Typography.Text className="my-home-tile-caption">我的模块</Typography.Text>
            <Typography.Title level={3} className="my-home-tile-title">
              <Link
                to={entry.path}
                className="my-home-entry-link"
                data-testid={`my-home-entry-${entry.path.slice(1).replace(/\//g, '-')}`}
              >
                {entry.label}
              </Link>
            </Typography.Title>
            <Typography.Paragraph className="my-home-tile-description">
              {entry.description}
            </Typography.Paragraph>
          </Card>
        ))}
      </section>
    </>
  );
}
