import { Button, Card, Col, List, Row, Space, Tag, Typography, message } from 'antd';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppSelector } from '../../app/hooks';
import { useGetReminderDashboardQuery, useGetReminderListQuery, useTriggerReminderScanMutation } from './reminderApi';
import { canManageReminderActions, isOverdueReminder } from './reminderPermissions';

type ReminderFilter = 'all' | 'pending' | 'overdue' | 'acknowledged';

const statCards: Array<{ key: ReminderFilter; label: string; badge: string }> = [
  { key: 'pending', label: '待处理', badge: '待处理' },
  { key: 'overdue', label: '已逾期', badge: '已逾期' },
  { key: 'acknowledged', label: '已确认', badge: '已确认' },
];

function buildListQuery(filter: ReminderFilter) {
  if (filter === 'pending') {
    return { page: 1, pageSize: 5, status: 'pending' as const };
  }

  if (filter === 'overdue') {
    return { page: 1, pageSize: 5, reminderType: 'overdue' as const };
  }

  if (filter === 'acknowledged') {
    return { page: 1, pageSize: 5, status: 'acknowledged' as const };
  }

  return { page: 1, pageSize: 5 };
}

export function ReminderDashboardPage() {
  const roles = useAppSelector((state) => state.auth.currentUser?.roles ?? []);
  const isAuthorized = canManageReminderActions(roles);
  const [filter, setFilter] = useState<ReminderFilter>('all');
  const dashboardQuery = useGetReminderDashboardQuery();
  const listQuery = useGetReminderListQuery(buildListQuery(filter));
  const [triggerScan, { isLoading: scanning }] = useTriggerReminderScanMutation();

  const dashboard = dashboardQuery.data?.data;
  const reminders = useMemo(() => listQuery.data?.data ?? [], [listQuery.data]);

  const handleScan = async () => {
    try {
      const response = await triggerScan().unwrap();
      await Promise.all([dashboardQuery.refetch(), listQuery.refetch()]);
      message.success(`扫描已受理，任务 ${response.data.jobId}`);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '扫描触发失败');
    }
  };

  return (
    <section className="page-hero">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Typography.Title level={2}>证书提醒看板</Typography.Title>
          <Typography.Paragraph type="secondary">
            先看统计，再进入提醒明细处理。
          </Typography.Paragraph>
        </div>

        <Row gutter={[16, 16]} className="page-card-grid reminder-stat-grid">
          {statCards.map((item) => {
            const value =
              item.key === 'pending'
                ? dashboard?.totalPending ?? 0
                : item.key === 'overdue'
                  ? dashboard?.totalOverdue ?? 0
                  : dashboard?.totalAcknowledged ?? 0;
            return (
              <Col xs={24} md={8} key={item.key}>
                <Card className="reminder-stat-card" bordered={false}>
                  <Button
                    block
                    size="large"
                    type={filter === item.key ? 'primary' : 'default'}
                    style={{ minHeight: 88, height: '100%' }}
                    onClick={() => setFilter(item.key)}
                  >
                    <Space direction="vertical" size={0}>
                      <Typography.Text>{item.label}</Typography.Text>
                      <Typography.Title level={2} style={{ margin: 0 }}>
                        {value}
                      </Typography.Title>
                    </Space>
                  </Button>
                </Card>
              </Col>
            );
          })}
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card title="按持有对象分组" loading={dashboardQuery.isLoading}>
              <Space direction="vertical" style={{ width: '100%' }}>
                {(dashboard?.byOwnerType ?? []).map((item) => (
                  <Space key={item.ownerType} style={{ justifyContent: 'space-between', width: '100%' }}>
                    <Typography.Text>{item.ownerType}</Typography.Text>
                    <Tag color="blue">{item.count}</Tag>
                  </Space>
                ))}
              </Space>
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title="按证书类型分组" loading={dashboardQuery.isLoading}>
              <Space direction="vertical" style={{ width: '100%' }}>
                {(dashboard?.byCertificateType ?? []).map((item) => (
                  <Space key={item.certificateTypeName} style={{ justifyContent: 'space-between', width: '100%' }}>
                    <Typography.Text>{item.certificateTypeName}</Typography.Text>
                    <Tag color="gold">{item.count}</Tag>
                  </Space>
                ))}
              </Space>
            </Card>
          </Col>
        </Row>

        <Card
          title={
            <Space wrap>
              <span>最近提醒</span>
              <Tag>{filter === 'all' ? '全部' : statCards.find((item) => item.key === filter)?.badge}</Tag>
            </Space>
          }
          extra={
            isAuthorized ? (
              <Button onClick={handleScan} loading={scanning}>
                手动扫描
              </Button>
            ) : null
          }
          loading={listQuery.isLoading}
        >
          <List
            dataSource={reminders}
            locale={{ emptyText: '暂无提醒，请调整筛选。' }}
            renderItem={(item) => (
              <List.Item
                className={isOverdueReminder(item) ? 'reminder-item reminder-item-overdue' : 'reminder-item'}
                style={{
                  paddingInlineStart: 12,
                  borderInlineStart: isOverdueReminder(item) ? '4px solid #cf1322' : '4px solid transparent',
                }}
              >
                <List.Item.Meta
                  title={
                    <Link
                      to={`/my/reminders/${item.id}`}
                      style={{ display: 'inline-flex', minHeight: 44, alignItems: 'center' }}
                    >
                      {item.certificateTitle}
                    </Link>
                  }
                  description={`${item.ownerName} · ${item.scheduledDate} · ${item.recipientUserId}`}
                />
                <Space wrap>
                  <Tag color={isOverdueReminder(item) ? 'red' : 'default'}>
                    {isOverdueReminder(item) ? '逾期' : item.reminderType}
                  </Tag>
                  <Tag color={item.status === 'acknowledged' ? 'green' : 'blue'}>{item.status}</Tag>
                </Space>
              </List.Item>
            )}
          />
        </Card>
      </Space>
    </section>
  );
}
