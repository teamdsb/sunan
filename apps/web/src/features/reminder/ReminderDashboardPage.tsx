import { Button, Card, Col, List, Pagination, Row, Select, Space, Tag, Typography, message } from 'antd';
import { useMemo } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useAppSelector } from '../../app/hooks';
import { myRouteConfig } from '../../router/myRouteConfig';
import { buildDetailHref, updateSearchParams } from '../../router/myRouteState';
import { useGetSettingsQuery } from '../settings/settingsApi';
import { useGetReminderDashboardQuery, useGetReminderListQuery, useTriggerReminderScanMutation } from './reminderApi';
import { canManageReminderActions, isOverdueReminder } from './reminderPermissions';

type ReminderFilter = 'all' | 'pending' | 'overdue' | 'acknowledged';
type ReminderViewMode = 'dashboard' | 'list';
type ReminderOwnerType = 'vessel' | 'vehicle' | 'personnel';
type ReminderStatusFilter = 'pending' | 'acknowledged';

const statCards: Array<{ key: ReminderFilter; label: string; badge: string }> = [
  { key: 'pending', label: '待处理', badge: '待处理' },
  { key: 'overdue', label: '已逾期', badge: '已逾期' },
  { key: 'acknowledged', label: '已确认', badge: '已确认' },
];

function readViewMode(rawView: string | null, fallback: ReminderViewMode): ReminderViewMode {
  if (rawView === 'dashboard' || rawView === 'list') {
    return rawView;
  }

  return fallback;
}

function readNumber(searchParams: URLSearchParams, key: string, defaultValue: number): number {
  const raw = searchParams.get(key);
  if (!raw) {
    return defaultValue;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
}

function buildDashboardListQuery() {
  return { page: 1, pageSize: 5 };
}

export function ReminderDashboardPage() {
  const roles = useAppSelector((state) => state.auth.currentUser?.roles ?? []);
  const isAuthorized = canManageReminderActions(roles);
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const settingsQuery = useGetSettingsQuery();
  const view = readViewMode(searchParams.get('view'), settingsQuery.data?.data.reminderViewMode ?? 'dashboard');
  const isListMode = view === 'list';
  const status = searchParams.get('status') as ReminderStatusFilter | null;
  const reminderType = searchParams.get('reminderType') as 'overdue' | null;
  const ownerType = searchParams.get('ownerType') as ReminderOwnerType | null;
  const page = readNumber(searchParams, 'page', 1);
  const pageSize = readNumber(searchParams, 'pageSize', 5);
  const dashboardQuery = useGetReminderDashboardQuery();
  const listQueryArgs = useMemo(() => {
    if (!isListMode) {
      return buildDashboardListQuery();
    }

    return {
      page,
      pageSize,
      ...(status ? { status } : {}),
      ...(reminderType ? { reminderType } : {}),
      ...(ownerType ? { ownerType } : {}),
    };
  }, [isListMode, page, pageSize, reminderType, ownerType, status]);
  const listQuery = useGetReminderListQuery(listQueryArgs);
  const [triggerScan, { isLoading: scanning }] = useTriggerReminderScanMutation();

  const dashboard = dashboardQuery.data?.data;
  const reminders = useMemo(() => listQuery.data?.data ?? [], [listQuery.data]);
  const listTotal = listQuery.data?.meta?.total ?? reminders.length;

  const applySearch = (updates: Record<string, string | number | null | undefined>) => {
    setSearchParams(updateSearchParams(location.search, updates));
  };

  const handleScan = async () => {
    try {
      const response = await triggerScan().unwrap();
      await Promise.all([dashboardQuery.refetch(), listQuery.refetch()]);
      message.success(`扫描已受理，任务 ${response.data.jobId}`);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '扫描触发失败');
    }
  };

  const handleCardClick = (item: (typeof statCards)[number]) => {
    if (item.key === 'pending') {
      setSearchParams({ view: 'list', status: 'pending' });
      return;
    }

    if (item.key === 'overdue') {
      setSearchParams({ view: 'list', reminderType: 'overdue' });
      return;
    }

    if (item.key === 'acknowledged') {
      setSearchParams({ view: 'list', status: 'acknowledged' });
    }
  };

  return (
    <section className="page-hero">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Typography.Title level={2}>{isListMode ? '提醒列表' : '证书提醒看板'}</Typography.Title>
          <Typography.Paragraph type="secondary">
            {isListMode ? '通过 URL 状态筛选和分页浏览提醒。' : '先看统计，再进入提醒明细处理。'}
          </Typography.Paragraph>
        </div>

        {!isListMode ? (
          <>
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
                        style={{ minHeight: 88, height: '100%' }}
                        onClick={() => handleCardClick(item)}
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
          </>
        ) : (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Space wrap>
              <Typography.Text>对象类型</Typography.Text>
              <Select
                style={{ minWidth: 160 }}
                value={ownerType || undefined}
                allowClear
                placeholder="全部"
                options={[
                  { value: 'vessel', label: 'vessel' },
                  { value: 'vehicle', label: 'vehicle' },
                  { value: 'personnel', label: 'personnel' },
                ]}
                onChange={(nextOwnerType) =>
                  applySearch({
                    view: 'list',
                    ownerType: nextOwnerType || null,
                    page: 1,
                  })
                }
              />
              <Typography.Text>每页条数</Typography.Text>
              <Select
                style={{ width: 120 }}
                value={pageSize}
                options={[
                  { value: 5, label: '5' },
                  { value: 10, label: '10' },
                  { value: 20, label: '20' },
                ]}
                onChange={(nextPageSize) =>
                  applySearch({
                    view: 'list',
                    page: 1,
                    pageSize: nextPageSize,
                  })
                }
              />
            </Space>
          </Space>
        )}

        <Card
          title={
            isListMode ? (
              '提醒列表'
            ) : (
              <Space wrap>
                <span>最近提醒</span>
                <Tag>全部</Tag>
              </Space>
            )
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
                      to={buildDetailHref(myRouteConfig.reminders.path, item.id, location.search)}
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
          {isListMode ? (
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
              <Pagination
                current={page}
                pageSize={pageSize}
                total={listTotal}
                showSizeChanger
                onChange={(nextPage, nextPageSize) =>
                  applySearch({
                    view: 'list',
                    page: nextPage,
                    pageSize: nextPageSize,
                    status,
                    reminderType,
                    ownerType,
                  })
                }
                onShowSizeChange={(_current, nextPageSize) =>
                  applySearch({
                    view: 'list',
                    page: 1,
                    pageSize: nextPageSize,
                    status,
                    reminderType,
                    ownerType,
                  })
                }
              />
            </div>
          ) : null}
        </Card>
      </Space>
    </section>
  );
}
