import {
  FileDoneOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
  RightOutlined,
  ShoppingCartOutlined,
} from '@ant-design/icons';
import { Alert, Button, Input, Pagination, Select, Typography } from 'antd';
import { useMemo, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../app/hooks';
import { procurementRouteConfig } from '../../router/procurementRouteConfig';
import {
  ProcurementDepartmentCode,
  ProcurementOrderStatus,
  ProcurementPendingTask,
  useGetProcurementBudgetSummaryQuery,
  useGetProcurementOrdersQuery,
  useGetProcurementPendingApprovalsQuery,
} from './procurementApi';

const departmentOptions = [
  { label: '总经办', value: 'general_office' },
  { label: '生产部', value: 'business_dept' },
  { label: '财务部', value: 'finance_dept' },
  { label: '船务部', value: 'shipping_dept' },
  { label: '行政部', value: 'logistics_dept' },
] as const;

const statusLabelMap: Record<ProcurementOrderStatus, string> = {
  draft: '草稿',
  submitted: '审批中',
  dept_approved: '采购中',
  final_approved: '已执行',
  rejected: '已驳回',
};

const statusToneMap: Record<ProcurementOrderStatus, string> = {
  draft: 'muted',
  submitted: 'warning',
  dept_approved: 'processing',
  final_approved: 'done',
  rejected: 'danger',
};

const statusOptions = Object.entries(statusLabelMap).map(([value, label]) => ({
  value: value as ProcurementOrderStatus,
  label,
}));

function formatDepartment(code: ProcurementDepartmentCode | null) {
  return (
    departmentOptions.find((item) => item.value === code)?.label ?? '未配置部门'
  );
}

function formatWan(value: number) {
  return `￥${(value / 10000).toFixed(1)}万`;
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function formatApprovalLevel(level: ProcurementPendingTask['approvalLevel']) {
  return level === 'dept' ? '部门审批' : level === 'finance' ? '财务审批' : '终审';
}

export function ProcurementOrderListPage() {
  const navigate = useNavigate();
  const currentUser = useAppSelector((state) => state.auth.currentUser);
  const [keywordDraft, setKeywordDraft] = useState('');
  const [keyword, setKeyword] = useState('');
  const [departmentCode, setDepartmentCode] = useState<
    ProcurementDepartmentCode | undefined
  >();
  const [status, setStatus] = useState<ProcurementOrderStatus | undefined>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const now = new Date();
  const budgetYear = now.getFullYear();

  const { data: response, isError: ordersError } = useGetProcurementOrdersQuery({
    keyword: keyword || undefined,
    departmentCode,
    status,
    page,
    pageSize,
  });
  const { data: budgetResponse, isError: budgetError } =
    useGetProcurementBudgetSummaryQuery({ year: budgetYear });
  const { data: pendingResponse, isError: pendingError } =
    useGetProcurementPendingApprovalsQuery({
      entityType: 'order',
      page: 1,
      pageSize: 100,
    });

  const rows = response?.data ?? [];
  const canManageDictionary = Boolean(
    currentUser &&
    (currentUser.roles.includes('system_admin') ||
      currentUser.roles.includes('general_office')),
  );
  const budgetSummary = budgetResponse?.data;
  const showBudgetCard = Boolean(
    budgetSummary && budgetSummary.budgetAmount > 0 && budgetSummary.executedAmount > 0,
  );
  const allBudgetItems = (budgetSummary?.items ?? []).filter(
    (item) => item.executedAmount > 0 || item.budgetAmount > 0,
  );
  const budgetItems = [...allBudgetItems]
    .sort((left, right) => right.executedAmount - left.executedAmount)
    .slice(0, 3);
  const budgetPercent = budgetSummary?.executionRate;
  const pendingTasks = useMemo(
    () => pendingResponse?.data ?? [],
    [pendingResponse?.data],
  );
  const approvalTotal = pendingResponse
    ? pendingTasks.length === 100
      ? '100+'
      : pendingTasks.length
    : undefined;

  const pendingRows = useMemo(() => {
    return pendingTasks
      .filter((task) => task.entityType === 'order')
      .slice(0, 2);
  }, [pendingTasks]);

  const orderMeta = response?.meta;

  return (
    <div className="procurement-mobile-home">
      {ordersError || budgetError || pendingError ? (
        <Alert
          type="error"
          showIcon
          message="部分采购数据加载失败"
          description="请检查网络后刷新，未加载的指标不会按 0 处理。"
        />
      ) : null}
      <section className="procurement-mobile-hero" aria-labelledby="procurement-home-title">
        <div className="procurement-mobile-hero-copy">
          <Typography.Title level={1} id="procurement-home-title">
            采购管理
          </Typography.Title>
          <Typography.Paragraph>
            预算管控、采购审批、供应商履约
          </Typography.Paragraph>
        </div>
        <Button
          type="primary"
          icon={<ShoppingCartOutlined />}
          onClick={() => navigate(procurementRouteConfig.orderCreate.path)}
        >
          新建采购单
        </Button>
      </section>

      {canManageDictionary ? (
        <nav className="procurement-mobile-admin-links" aria-label="采购管理配置入口">
          <button type="button" onClick={() => navigate(procurementRouteConfig.budgets.path)}>
            预算管理
          </button>
          <span aria-hidden="true" />
          <button type="button" onClick={() => navigate(procurementRouteConfig.dictionaries.path)}>
            字典治理
          </button>
        </nav>
      ) : null}

      <section className="procurement-mobile-kpi-card" aria-label="采购关键指标">
        <div className="procurement-mobile-kpi">
          <span>年度已执行</span>
          <strong>{budgetSummary ? formatWan(budgetSummary.executedAmount) : '--'}</strong>
        </div>
        <div className="procurement-mobile-kpi is-primary">
          <span>预算执行率</span>
          <strong>{budgetPercent === undefined ? '--' : formatPercent(budgetPercent)}</strong>
        </div>
        <div className="procurement-mobile-kpi is-warning">
          <span>待审批</span>
          <strong>{approvalTotal ?? '--'}</strong>
          <FileDoneOutlined aria-hidden="true" />
        </div>
      </section>

      {showBudgetCard && budgetSummary ? (
        <section className="procurement-mobile-budget-card" aria-labelledby="procurement-budget-title">
          <div className="procurement-mobile-card-heading">
            <Typography.Title level={2} id="procurement-budget-title">
              {budgetSummary.year} 采购预算
            </Typography.Title>
            <span>
              总经办管控 <InfoCircleOutlined />
            </span>
          </div>
          <div className="procurement-mobile-budget-overview">
            <div className="procurement-mobile-budget-progress">
              <span
                style={
                  { '--procurement-budget-progress': `${Math.min(budgetSummary.executionRate, 100)}%` } as CSSProperties
                }
              />
            </div>
            <strong>{formatPercent(budgetSummary.executionRate)}</strong>
            <em>
              {formatWan(budgetSummary.executedAmount)} / {formatWan(budgetSummary.budgetAmount)}
            </em>
          </div>
          <div className="procurement-mobile-budget-list">
            {budgetItems.map((item) => (
              <div className={item.isOverBudget ? 'is-over-budget' : undefined} key={`${item.departmentCode}-${item.dimensionKey ?? 'none'}`}>
                <span>{item.dimensionName}</span>
                <strong>
                  {formatWan(item.executedAmount)} / {formatWan(item.budgetAmount)}
                </strong>
                <em>
                  {item.isOverBudget
                    ? `超预算 ${formatPercent(item.executionRate)}`
                    : formatPercent(item.executionRate)}
                </em>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="procurement-mobile-pending-card" aria-labelledby="procurement-pending-title">
        <div className="procurement-mobile-card-heading">
          <Typography.Title level={2} id="procurement-pending-title">
            待处理
          </Typography.Title>
          <button type="button" onClick={() => navigate(procurementRouteConfig.approvals.path)}>
            全部 <RightOutlined />
          </button>
        </div>
        <div className="procurement-mobile-pending-list">
          {pendingRows.map((task) => (
              <button
                type="button"
                className="procurement-mobile-pending-row"
                key={task.entityId}
                onClick={() => navigate(`/procurement/orders/${task.entityId}`)}
              >
                <span className="procurement-mobile-row-icon" aria-hidden="true">
                  <FileTextOutlined />
                </span>
                <span className="procurement-mobile-pending-copy">
                  <span>
                    <strong>{task.title}</strong>
                    <em className="is-warning">
                      待{formatApprovalLevel(task.approvalLevel)}
                    </em>
                  </span>
                  <small>
                    申请部门：{formatDepartment(task.departmentCode)}
                    <i aria-hidden="true" />
                    审批节点：{formatApprovalLevel(task.approvalLevel)}
                  </small>
                </span>
                <RightOutlined className="procurement-mobile-row-chevron" aria-hidden="true" />
              </button>
          ))}
          {pendingResponse && pendingRows.length === 0 ? (
            <span className="procurement-mobile-list-empty">当前没有待审批采购单</span>
          ) : null}
        </div>
      </section>

      <section className="procurement-mobile-execution-card" aria-labelledby="procurement-execution-title">
        <div className="procurement-mobile-card-heading">
          <Typography.Title level={2} id="procurement-execution-title">
            采购单列表
          </Typography.Title>
        </div>
        <div className="procurement-mobile-list-filters">
          <Input.Search
            allowClear
            value={keywordDraft}
            placeholder="搜索采购单号、标题或摘要"
            onChange={(event) => setKeywordDraft(event.target.value)}
            onSearch={(value) => {
              setKeyword(value.trim());
              setPage(1);
            }}
          />
          <Select
            allowClear
            value={departmentCode}
            placeholder="部门"
            options={[...departmentOptions]}
            onChange={(value) => {
              setDepartmentCode(value);
              setPage(1);
            }}
          />
          <Select
            allowClear
            value={status}
            placeholder="状态"
            options={statusOptions}
            onChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
          />
        </div>
        <div className="procurement-mobile-execution-table" role="table" aria-label="采购执行清单">
          <div className="procurement-mobile-execution-head" role="row">
            <span role="columnheader">采购单号</span>
            <span role="columnheader">部门</span>
            <span role="columnheader">金额</span>
            <span role="columnheader">状态</span>
            <span aria-hidden="true" />
          </div>
          {rows.map((order) => (
            <button
              type="button"
              className="procurement-mobile-execution-row"
              key={order.id}
              onClick={() => navigate(`/procurement/orders/${order.id}`)}
            >
              <span>{order.orderNo}</span>
              <span>{formatDepartment(order.departmentCode)}</span>
              <span>{formatWan(order.amount)}</span>
              <em className={`is-${statusToneMap[order.status]}`}>{statusLabelMap[order.status]}</em>
              <RightOutlined aria-hidden="true" />
            </button>
          ))}
          {response && rows.length === 0 ? (
            <span className="procurement-mobile-list-empty">当前没有采购执行记录</span>
          ) : null}
        </div>
        {orderMeta && orderMeta.total > 0 ? (
          <Pagination
            className="procurement-mobile-pagination"
            current={orderMeta.page}
            pageSize={orderMeta.pageSize}
            total={orderMeta.total}
            showSizeChanger
            pageSizeOptions={[10, 20, 50, 100]}
            onChange={(nextPage, nextPageSize) => {
              setPage(nextPageSize === pageSize ? nextPage : 1);
              setPageSize(nextPageSize);
            }}
          />
        ) : null}
      </section>
    </div>
  );
}
