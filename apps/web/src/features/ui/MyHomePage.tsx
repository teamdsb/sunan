import { Card, Col, Row, Space, Typography } from 'antd';
import { Link } from 'react-router-dom';

const entries = [
  {
    to: '/my/enterprise-profile',
    title: '企业资料',
    description: '查看企业资料列表与附件。',
  },
  {
    to: '/my/enterprise-policy',
    title: '企业制度',
    description: '浏览企业制度和版本历史。',
  },
  {
    to: '/my/certificates',
    title: '电子证照',
    description: '查看证照、附件和到期信息。',
  },
  {
    to: '/my/reminders',
    title: '证书提醒',
    description: '查看提醒看板并确认处理。',
  },
  {
    to: '/my/monitors',
    title: '船舶监控',
    description: '进入船舶监控入口。',
  },
  {
    to: '/my/settings',
    title: '设置',
    description: '调整个人偏好设置。',
  },
];

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
          <Col xs={24} sm={12} md={8} key={entry.to}>
            <Card className="placeholder-card" bordered={false}>
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Typography.Title level={4} style={{ marginBottom: 0 }}>
                  <Link to={entry.to}>{entry.title}</Link>
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
