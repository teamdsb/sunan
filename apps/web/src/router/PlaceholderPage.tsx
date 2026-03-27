import { Card, Col, Row, Tag, Typography } from 'antd';

interface PlaceholderPageProps {
  title: string;
  description: string;
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <>
      <section className="page-hero">
        <Typography.Title level={2}>{title}</Typography.Title>
        <Typography.Paragraph type="secondary">{description}</Typography.Paragraph>
      </section>
      <Row gutter={[16, 16]} className="page-card-grid">
        {['数据接入', '路由稳定', '组件可扩展'].map((item) => (
          <Col xs={24} md={8} key={item}>
            <Card className="placeholder-card" bordered={false}>
              <Tag color="gold">Wave 1</Tag>
              <Typography.Title level={4}>{item}</Typography.Title>
              <Typography.Paragraph>
                当前页面为占位骨架，后续工作流可直接挂接业务 RTK Query 与表单逻辑。
              </Typography.Paragraph>
            </Card>
          </Col>
        ))}
      </Row>
    </>
  );
}
