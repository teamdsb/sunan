import { Button, Card, Form, Input, List, Space, Tag, Typography } from 'antd';
import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useAppSelector } from '../../app/hooks';
import { useCreateShipMonitorMutation, useGetShipMonitorsByVesselQuery, useGetShipMonitorsQuery } from './monitorApi';

const MANAGER_ROLES = new Set(['system_admin', 'general_office', 'finance', 'business', 'shipping', 'logistics']);

export function MonitorPage() {
  const { vesselId } = useParams();
  const roles = useAppSelector((state) => state.auth.currentUser?.roles ?? []);
  const isManager = roles.some((role) => MANAGER_ROLES.has(role));

  const listQuery = vesselId ? useGetShipMonitorsByVesselQuery(vesselId) : useGetShipMonitorsQuery({ activeOnly: !isManager });
  const { data, isLoading } = listQuery;

  const [createMonitor] = useCreateShipMonitorMutation();
  const [form] = Form.useForm<{ vesselId: string; monitorName: string; endpointUrl: string }>();
  const monitors = useMemo(() => data?.data ?? [], [data]);

  return (
    <section className="page-hero">
      <Typography.Title level={2}>船舶监控</Typography.Title>
      <Typography.Paragraph type="secondary">
        {isManager ? '管理员可新增与配置监控入口。' : '普通用户仅可查看启用中的监控入口。'}
      </Typography.Paragraph>
      <Space direction="vertical" style={{ width: '100%' }}>
        {isManager ? (
          <Card>
            <Form
              form={form}
              layout="inline"
              onFinish={async (values) => {
                await createMonitor(values).unwrap();
                form.resetFields();
              }}
            >
              <Form.Item name="vesselId" rules={[{ required: true }]}><Input placeholder="船舶ID" /></Form.Item>
              <Form.Item name="monitorName" rules={[{ required: true }]}><Input placeholder="监控名称" /></Form.Item>
              <Form.Item name="endpointUrl" rules={[{ required: true }]}><Input placeholder="监控地址" /></Form.Item>
              <Button htmlType="submit" type="primary">新增监控</Button>
            </Form>
          </Card>
        ) : null}
        <Card loading={isLoading}>
          <List
            dataSource={monitors}
            renderItem={(item) => (
              <List.Item actions={[<a key="open" href={item.endpointUrl} target="_blank" rel="noreferrer">打开</a>]}> 
                <List.Item.Meta title={item.monitorName} description={item.endpointUrl} />
                <Tag color={item.isActive ? 'green' : 'default'}>{item.isActive ? '启用' : '禁用'}</Tag>
              </List.Item>
            )}
          />
        </Card>
      </Space>
    </section>
  );
}
