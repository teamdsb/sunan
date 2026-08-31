import { Alert, Button, Card, Col, List, Pagination, Row, Select, Space, Tag, Typography, message } from 'antd';
import { ArrowLeftOutlined, DownOutlined, FilterOutlined, UpOutlined } from '@ant-design/icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useAppSelector } from '../../app/hooks';
import { myRouteConfig } from '../../router/myRouteConfig';
import { buildDetailHref, updateSearchParams } from '../../router/myRouteState';
import { useGetSettingsQuery } from '../settings/settingsApi';
import { formatShanghaiDateTime } from '../../utils/dateTime';
import {
  useGetReminderDashboardQuery,
  useGetReminderListQuery,
  useGetReminderScanJobQuery,
  useTriggerReminderScanMutation,
} from './reminderApi';
import { canManageReminderActions, isOverdueReminder } from './reminderPermissions';

type ReminderFilter = 'all' | 'pending' | 'overdue' | 'acknowledged';
type ReminderViewMode = 'dashboard' | 'list';
type ReminderOwnerType = 'vessel' | 'vehicle' | 'personnel' | 'equipment';
type ReminderStatusFilter = 'pending' | 'acknowledged';

const statCards: Array<{ key: ReminderFilter; label: string; badge: string }> = [
  { key: 'pending', label: '待处理', badge: '待处理' },
  { key: 'overdue', label: '已逾期', badge: '已逾期' },
  { key: 'acknowledged', label: '已确认', badge: '已确认' },
];

const reminderTypeLabelMap: Record<string, string> = {
  upcoming: '即将到期',
  overdue: '逾期',
};

const reminderStatusLabelMap: Record<string, string> = {
  pending: '待处理',
  sent: '已发送',
  acknowledged: '已确认',
  failed: '发送失败',
};

function labelFrom(map: Record<string, string>, value: string | null | undefined, fallback: string) {
  return value ? map[value] ?? fallback : '-';
}

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
  const urlViewMode = searchParams.get('view');
  const settingsViewMode = settingsQuery.data?.data.reminderViewMode;
  const shouldWaitForSettings = !urlViewMode && settingsQuery.isLoading && !settingsViewMode;
  const view = urlViewMode ? readViewMode(urlViewMode, 'dashboard') : settingsViewMode ?? 'dashboard';
  const isListMode = view === 'list';
  const status = searchParams.get('status') as ReminderStatusFilter | null;
  const reminderType = searchParams.get('reminderType') as 'upcoming' | 'overdue' | null;
  const ownerType = searchParams.get('ownerType') as ReminderOwnerType | null;
  const page = readNumber(searchParams, 'page', 1);
  const pageSize = readNumber(searchParams, 'pageSize', 5);
  const dashboardQuery = useGetReminderDashboardQuery(undefined, shouldWaitForSettings ? { skip: true } : undefined);
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
  const listQuery = useGetReminderListQuery(listQueryArgs, shouldWaitForSettings ? { skip: true } : undefined);
  const [triggerScan, { isLoading: scanning }] = useTriggerReminderScanMutation();
  const [scanJobId, setScanJobId] = useState<string | null>(null);
  const scanJobQuery = useGetReminderScanJobQuery(scanJobId ?? '', {
    skip: !scanJobId,
    pollingInterval: scanJobId ? 1000 : 0,
  });
  const scanJob = scanJobQuery.data?.data;
  const handledScanRef = useRef<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const dashboard = dashboardQuery.data?.data;
  const reminders = useMemo(() => listQuery.data?.data ?? [], [listQuery.data]);
  const listTotal = listQuery.data?.meta?.total ?? reminders.length;

  const applySearch = (updates: Record<string, string | number | null | undefined>) => {
    setSearchParams(updateSearchParams(location.search, updates));
  };

  const handleScan = async () => {
    try {
      const response = await triggerScan().unwrap();
      setScanJobId(response.data.jobId);
      await Promise.all([dashboardQuery.refetch(), listQuery.refetch()]);
      message.info('扫描任务已受理，正在处理');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '扫描触发失败');
    }
  };

  useEffect(() => {
    if (!scanJob || (scanJob.status !== 'completed' && scanJob.status !== 'failed')) return;
    const resultKey = `${scanJob.jobId}:${scanJob.status}`;
    if (handledScanRef.current === resultKey) return;
    handledScanRef.current = resultKey;
    void Promise.all([dashboardQuery.refetch(), listQuery.refetch()]);
    if (scanJob.status === 'completed') {
      message.success(`扫描完成：新增 ${scanJob.createdCount} 条，已发送 ${scanJob.sentCount} 条${scanJob.failedCount ? `，失败 ${scanJob.failedCount} 条` : ''}`);
    } else {
      message.error(`扫描失败：${scanJob.error || '请稍后重试'}`);
    }
    setScanJobId(null);
  }, [dashboardQuery.refetch, listQuery.refetch, scanJob?.jobId, scanJob?.status, scanJob?.createdCount, scanJob?.sentCount, scanJob?.failedCount, scanJob?.error]);

  const handleCardClick = (item: (typeof statCards)[number]) => {
    if (item.key === 'pending') {
      applySearch({
        view: 'list',
        status: null,
        reminderType: 'upcoming',
        ownerType: null,
        page: null,
        pageSize: null,
      });
      return;
    }

    if (item.key === 'overdue') {
      applySearch({
        view: 'list',
        status: null,
        reminderType: 'overdue',
        ownerType: null,
        page: null,
        pageSize: null,
      });
      return;
    }

    if (item.key === 'acknowledged') {
      applySearch({
        view: 'list',
        status: 'acknowledged',
        reminderType: null,
        ownerType: null,
        page: null,
        pageSize: null,
      });
    }
  };

  if (shouldWaitForSettings) {
    return (
      <section className="page-hero">
        <Card loading variant="borderless" />
      </section>
    );
  }

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
          <Alert
            type="info"
            showIcon
            message="提醒规则"
            description="证照可在新增或编辑时指定负责人，也可以留空使用部门规则：船舶和设备通知船务部、综合办公室；车辆通知物流部、综合办公室；人员证照通知本人及所属部门负责人。系统会自动扫描临期和逾期证照，无需手动扫描。"
          />
        ) : null}

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
                    <Card className="reminder-stat-card" variant="borderless">
                      <Button
                        block
                        size="large"
                        className="reminder-stat-button"
                        data-testid={`reminder-stat-button-${item.key}`}
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

            <Card title="按证照分类" loading={dashboardQuery.isLoading} variant="borderless">
              <Space direction="vertical" style={{ width: '100%' }}>
                {(dashboard?.byCertificateType ?? []).map((item) => (
                  <Space key={item.certificateTypeName} style={{ justifyContent: 'space-between', width: '100%' }}>
                    <Typography.Text>{item.certificateTypeName}</Typography.Text>
                    <Tag color="gold">{item.count}</Tag>
                  </Space>
                ))}
              </Space>
            </Card>
            {scanJob ? <Alert showIcon type={scanJob.status === 'failed' ? 'error' : scanJob.status === 'completed' ? 'success' : 'info'} message={`扫描任务：${scanJob.status === 'queued' ? '排队中' : scanJob.status === 'running' ? '处理中' : scanJob.status === 'retryable' ? '等待重试' : scanJob.status === 'completed' ? '已完成' : '失败'}`} description={scanJob.status === 'completed' ? `新增 ${scanJob.createdCount} 条，发送 ${scanJob.sentCount} 条，失败 ${scanJob.failedCount} 条` : scanJob.error || '正在扫描证照并发送企业微信提醒。'} /> : null}
          </>
        ) : (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() =>
                applySearch({
                  view: 'dashboard',
                  status: null,
                  reminderType: null,
                  ownerType: null,
                  page: null,
                  pageSize: null,
                })
              }
            >
              返回提醒看板
            </Button>
            <Button
              className="filter-panel-toggle"
              icon={showFilters ? <UpOutlined /> : <DownOutlined />}
              onClick={() => setShowFilters((current) => !current)}
            >
              {showFilters ? '收起筛选' : '展开筛选'}
            </Button>
            {showFilters ? (
              <Card size="small" className="filter-panel" title={<Space size="small"><FilterOutlined /><span>筛选条件</span></Space>}>
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <div className="filter-field">
                    <Typography.Text>对象类型</Typography.Text>
                    <Select
                      style={{ width: '100%' }}
                      value={ownerType || undefined}
                      allowClear
                      placeholder="全部"
                      options={[
                        { value: 'vessel', label: '船舶' },
                        { value: 'vehicle', label: '车辆' },
                        { value: 'personnel', label: '人员' },
                        { value: 'equipment', label: '设备' },
                      ]}
                      onChange={(nextOwnerType) =>
                        applySearch({
                          view: 'list',
                          ownerType: nextOwnerType || null,
                          page: 1,
                        })
                      }
                    />
                  </div>
                  <div className="filter-field">
                    <Typography.Text>每页条数</Typography.Text>
                    <Select
                      style={{ width: '100%' }}
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
                  </div>
                </Space>
              </Card>
            ) : null}
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
          variant="borderless"
        >
          <List
            dataSource={reminders}
            locale={{ emptyText: '暂无提醒，请调整筛选。' }}
            renderItem={(item) => (
              <List.Item
                actions={[]}
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
                      className="reminder-item-link"
                      data-testid={`reminder-item-link-${item.id}`}
                      style={{ display: 'inline-flex', minHeight: 44, alignItems: 'center' }}
                    >
                      {item.certificateTitle}
                    </Link>
                  }
                  description={`${item.ownerName} · ${formatShanghaiDateTime(item.scheduledDate)} · ${item.recipientUserId}`}
                />
                <Space wrap>
                  <Tag color={isOverdueReminder(item) ? 'red' : 'default'}>
                    {isOverdueReminder(item) ? '逾期' : labelFrom(reminderTypeLabelMap, item.reminderType, '其他提醒')}
                  </Tag>
                  <Tag color={item.status === 'acknowledged' ? 'green' : 'blue'}>{labelFrom(reminderStatusLabelMap, item.status, '未知状态')}</Tag>
                </Space>
              </List.Item>
            )}
          />
          {isListMode ? (
            <div className="list-pagination">
              <Pagination
                current={page}
                pageSize={pageSize}
                total={listTotal}
                showSizeChanger
                responsive
                showLessItems
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
