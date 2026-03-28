import { Card, Col, Row, Space, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { myRouteNavItems } from '../../router/myRouteConfig';

const entries = myRouteNavItems.filter((item) => item.path !== '/my');

export function MyHomePage() {
  return (
    <>
      <section className="page-hero">
        <Typography.Title level={2}>我的模块首页</Typography.Title>
        <Typography.Paragraph type="secondary">
          从这里进入证照、提醒、监控和设置。
        </Typography.Paragraph>
      </section>
      <Row gutter={[16, 16]} className="page-card-grid">
        {entries.map((entry) => (
          <Col xs={24} sm={12} md={8} key={entry.path}>
            <Card className="placeholder-card" bordered={false}>
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Typography.Title level={4} style={{ marginBottom: 0 }}>
                  <Link to={entry.path}>{entry.label}</Link>
                </Typography.Title>
                <Typography.Paragraph style={{ marginBottom: 0 }}>
                  {entry.description}
                </Typography.Paragraph>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>
    </>
  );
}
