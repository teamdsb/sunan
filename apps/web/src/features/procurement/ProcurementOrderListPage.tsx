import {
  Alert,
  Button,
  Card,
  Empty,
  Grid,
  Input,
  Pagination,
  Select,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../app/hooks';
import { procurementRouteConfig } from '../../router/procurementRouteConfig';
import {
  ProcurementDepartmentCode,
  ProcurementOrder,
  ProcurementOrderStatus,
  useGetProcurementBudgetSummaryQuery,
  useGetProcurementOrdersQuery,
} from './procurementApi';

const departmentOptions = [
  { label: '总经办', value: 'general_office' },
  { label: '业务部', value: 'business_dept' },
  { label: '财务部', value: 'finance_dept' },
  { label: '船务部', value: 'shipping_dept' },
  { label: '后勤部', value: 'logistics_dept' },
];

const statusOptions = [
  { label: '草稿', value: 'draft' },
  { label: '已提交', value: 'submitted' },
  { label: '部门通过', value: 'dept_approved' },
  { label: '终审通过', value: 'final_approved' },
  { label: '已驳回', value: 'rejected' },
];

const statusColor: Record<ProcurementOrderStatus, string> = {
  draft: 'default',
  submitted: 'gold',
  dept_approved: 'blue',
  final_approved: 'green',
  rejected: 'red',
};

const statusLabelMap: Record<ProcurementOrderStatus, string> = {
  draft: '草稿',
  submitted: '已提交',
  dept_approved: '部门通过',
  final_approved: '终审通过',
  rejected: '已驳回',
};

const processCards = [
  {
    title: '新建采购单',
    note: '按部门与后台字典分类发起采购。',
    action: '发起申请',
  },
  { title: '采购审批', note: '处理部门审批和终审待办。', action: '进入审批' },
  { title: '采购报表', note: '查询月报、年报和采购明细。', action: '查看报表' },
  {
    title: '报表审批',
    note: '处理报表审批单与审批轨迹。',
    action: '进入报表审批',
  },
] as const;

function formatDepartment(code: ProcurementDepartmentCode) {
  return (
    departmentOptions.find((item) => item.value === code)?.label ?? '未配置部门'
  );
}

function formatStatus(status: ProcurementOrderStatus) {
  return statusLabelMap[status] ?? '未知状态';
}

function formatMoney(value: number) {
  return `¥${value.toFixed(2)}`;
}

function formatCompactMoney(value: number) {
  return value >= 10000
    ? `¥ ${(value / 10000).toFixed(1)} 万`
    : `¥ ${value.toFixed(2)}`;
}

function formatSubmittedAt(value: string | null) {
  return value ? new Date(value).toLocaleString('zh-CN') : '未提交';
}

export function ProcurementOrderListPage() {
  const navigate = useNavigate();
  const screens = Grid.useBreakpoint();
  const isMobileOrderList = !screens.md;
  const currentUser = useAppSelector((state) => state.auth.currentUser);
  const [keyword, setKeyword] = useState<string>('');
  const [departmentCode, setDepartmentCode] = useState<
    ProcurementDepartmentCode | undefined
  >(undefined);
  const [status, setStatus] = useState<ProcurementOrderStatus | undefined>(
    undefined,
  );
  const [submittedFrom, setSubmittedFrom] = useState<string | undefined>(
    undefined,
  );
  const [submittedTo, setSubmittedTo] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const now = new Date();
  const minDate = new Date(now);
  minDate.setFullYear(minDate.getFullYear() - 3);
  const currentDayText = now.toISOString().slice(0, 10);
  const minDayText = minDate.toISOString().slice(0, 10);
  const budgetYear = now.getFullYear();

  const { data: response, isLoading } = useGetProcurementOrdersQuery({
    keyword: keyword || undefined,
    departmentCode,
    status,
    submittedFrom,
    submittedTo,
    page,
    pageSize,
  });
  const { data: budgetResponse } = useGetProcurementBudgetSummaryQuery({
    year: budgetYear,
  });

  const rows = response?.data ?? [];
  const meta = response?.meta ?? { total: 0, page, pageSize, totalPages: 0 };
  const canManageDictionary = Boolean(
    currentUser &&
    (currentUser.roles.includes('system_admin') ||
      currentUser.roles.includes('general_office')),
  );
  const budgetSummary = budgetResponse?.data;
  const showBudgetCard = Boolean(
    budgetSummary &&
    budgetSummary.budgetAmount > 0 &&
    budgetSummary.executedAmount > 0,
  );
  const budgetPercent = Math.min(budgetSummary?.executionRate ?? 0, 100);
  const budgetItems = (budgetSummary?.items ?? [])
    .filter((item) => item.executedAmount > 0 || item.budgetAmount > 0)
    .sort((left, right) => right.executedAmount - left.executedAmount)
    .slice(0, 4);

  const columns: ColumnsType<ProcurementOrder> = useMemo(
    () => [
      { title: '单号', dataIndex: 'orderNo', key: 'orderNo', width: 160 },
      {
        title: '部门',
        dataIndex: 'departmentCode',
        key: 'departmentCode',
        width: 120,
        render: (value: ProcurementDepartmentCode) => formatDepartment(value),
      },
      { title: '标题', dataIndex: 'title', key: 'title' },
      {
        title: '金额',
        dataIndex: 'amount',
        key: 'amount',
        width: 120,
        render: (value: number) => formatMoney(value),
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 120,
        render: (value: ProcurementOrderStatus) => (
          <Tag color={statusColor[value]}>{formatStatus(value)}</Tag>
        ),
      },
      {
        title: '提交时间',
        dataIndex: 'submittedAt',
        key: 'submittedAt',
        width: 180,
        render: (value: string | null) => formatSubmittedAt(value),
      },
      {
        title: '操作',
        key: 'actions',
        width: 140,
        render: (_, record) => (
          <Button
            type="link"
            onClick={() => navigate(`/procurement/orders/${record.id}`)}
          >
            查看详情
          </Button>
        ),
      },
    ],
    [navigate],
  );

  return (
    <>
      <section className="page-hero sunan-page-hero procurement-command-hero">
        <div>
          <Typography.Title level={2}>
            从采购申请到供应商履约的闭环管理
          </Typography.Title>
          <Typography.Paragraph type="secondary">
            采购单、审批、年度预算和统计报表均以后端数据为准。
          </Typography.Paragraph>
        </div>
        <div className="sunan-hero-actions">
          {canManageDictionary ? (
            <>
              <Button
                onClick={() => navigate(procurementRouteConfig.budgets.path)}
              >
                预算管理
              </Button>
              <Button
                onClick={() =>
                  navigate(procurementRouteConfig.dictionaries.path)
                }
              >
                字典治理
              </Button>
            </>
          ) : null}
          <Button
            className="procurement-filter-create"
            type="primary"
            onClick={() => navigate(procurementRouteConfig.orderCreate.path)}
          >
            新建采购单
          </Button>
        </div>
      </section>

      <section
        className={`procurement-dashboard${showBudgetCard ? '' : ' procurement-dashboard-without-budget'}`}
      >
        {showBudgetCard && budgetSummary ? (
          <aside
            className={`procurement-budget-card${budgetSummary.isOverBudget ? ' is-over-budget' : ''}`}
          >
            <div className="sunan-panel-heading">
              <Typography.Title level={2}>
                {budgetSummary.year} 年采购预算
              </Typography.Title>
              <Typography.Text>
                {budgetSummary.isOverBudget ? '已超预算' : '总经办管控'}
              </Typography.Text>
            </div>
            <div
              className="procurement-budget-ring"
              style={
                { '--budget-percent': `${budgetPercent}%` } as CSSProperties
              }
            >
              <div className="procurement-budget-ring-content">
                <strong>{budgetSummary.executionRate.toFixed(1)}%</strong>
                <span>已执行</span>
              </div>
            </div>
            <div className="procurement-budget-list">
              {budgetItems.map((item) => (
                <span
                  key={`${item.departmentCode}-${item.dimensionType}-${item.dimensionKey ?? 'none'}`}
                >
                  <em>{item.dimensionName}</em>
                  <strong
                    className={item.isOverBudget ? 'is-over-budget' : undefined}
                  >
                    {formatCompactMoney(item.executedAmount)} /{' '}
                    {formatCompactMoney(item.budgetAmount)}
                  </strong>
                </span>
              ))}
              <span>
                <em>
                  {budgetSummary.isOverBudget ? '超出金额' : '年度已执行'}
                </em>
                <strong
                  className={
                    budgetSummary.isOverBudget ? 'is-over-budget' : undefined
                  }
                >
                  {formatCompactMoney(
                    budgetSummary.isOverBudget
                      ? budgetSummary.overBudgetAmount
                      : budgetSummary.executedAmount,
                  )}
                </strong>
              </span>
            </div>
          </aside>
        ) : null}

        <div className="procurement-main-panel">
          <div className="procurement-process-grid">
            {processCards.map((card) => (
              <article className="procurement-process-card" key={card.title}>
                <span className="module-entry-icon" aria-hidden="true">
                  +
                </span>
                <strong>{card.title}</strong>
                <small>{card.note}</small>
                <button
                  type="button"
                  onClick={() => {
                    if (card.action === '发起申请')
                      navigate(procurementRouteConfig.orderCreate.path);
                    if (card.action === '进入审批')
                      navigate(procurementRouteConfig.approvals.path);
                    if (card.action === '查看报表')
                      navigate(procurementRouteConfig.reports.path);
                    if (card.action === '进入报表审批')
                      navigate(procurementRouteConfig.reportApprovals.path);
                  }}
                >
                  {card.action}
                </button>
              </article>
            ))}
          </div>
          <div className="procurement-filter-panel">
            <div className="procurement-filter-bar">
              <Input.Search
                className="procurement-filter-search"
                placeholder="搜索标题或摘要"
                allowClear
                onSearch={(value) => {
                  setPage(1);
                  setKeyword(value.trim());
                }}
              />
              <Select
                className="procurement-filter-select"
                allowClear
                placeholder="部门"
                options={departmentOptions}
                value={departmentCode}
                onChange={(value) => {
                  setPage(1);
                  setDepartmentCode(value);
                }}
              />
              <Select
                className="procurement-filter-select"
                allowClear
                placeholder="状态"
                options={statusOptions}
                value={status}
                onChange={(value) => {
                  setPage(1);
                  setStatus(value);
                }}
              />
              <Input
                className="procurement-filter-date"
                type="date"
                placeholder="提交起始日期"
                min={minDayText}
                max={currentDayText}
                value={submittedFrom ?? ''}
                onChange={(event) => {
                  setPage(1);
                  setSubmittedFrom(event.target.value || undefined);
                }}
              />
              <Input
                className="procurement-filter-date"
                type="date"
                placeholder="提交截止日期"
                min={minDayText}
                max={currentDayText}
                value={submittedTo ?? ''}
                onChange={(event) => {
                  setPage(1);
                  setSubmittedTo(event.target.value || undefined);
                }}
              />
              <Button
                onClick={() => navigate(procurementRouteConfig.approvals.path)}
              >
                进入审批页
              </Button>
              <Button
                onClick={() => navigate(procurementRouteConfig.reports.path)}
              >
                进入报表页
              </Button>
              <Button
                onClick={() =>
                  navigate(procurementRouteConfig.reportApprovals.path)
                }
              >
                报表审批页
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="page-card-grid procurement-execution-grid">
        <Card
          variant="borderless"
          className="placeholder-card office-admin-card procurement-order-list-card"
        >
          <div className="sunan-panel-heading procurement-list-heading">
            <Typography.Title level={2}>采购执行清单</Typography.Title>
            <Typography.Text>本月 {meta.total} 条</Typography.Text>
          </div>
          {isMobileOrderList ? (
            <div className="procurement-order-mobile-list">
              {isLoading ? (
                <div className="procurement-order-mobile-empty">加载中...</div>
              ) : rows.length === 0 ? (
                <div className="procurement-order-mobile-empty">
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="暂无采购单"
                  />
                </div>
              ) : (
                rows.map((record) => (
                  <article
                    className="procurement-order-mobile-item"
                    key={record.id}
                  >
                    <div className="procurement-order-mobile-item-head">
                      <div className="procurement-order-mobile-main">
                        <Typography.Text className="procurement-order-mobile-label">
                          单号
                        </Typography.Text>
                        <Typography.Title level={4}>
                          {record.orderNo}
                        </Typography.Title>
                      </div>
                      <Tag color={statusColor[record.status]}>
                        {formatStatus(record.status)}
                      </Tag>
                    </div>
                    <Typography.Text
                      strong
                      className="procurement-order-mobile-title"
                    >
                      {record.title}
                    </Typography.Text>
                    <dl className="procurement-order-mobile-meta">
                      <div>
                        <dt>部门</dt>
                        <dd>{formatDepartment(record.departmentCode)}</dd>
                      </div>
                      <div>
                        <dt>金额</dt>
                        <dd>{formatMoney(record.amount)}</dd>
                      </div>
                      <div className="is-wide">
                        <dt>提交时间</dt>
                        <dd>{formatSubmittedAt(record.submittedAt)}</dd>
                      </div>
                    </dl>
                    <Button
                      type="primary"
                      block
                      onClick={() =>
                        navigate(`/procurement/orders/${record.id}`)
                      }
                    >
                      查看详情
                    </Button>
                  </article>
                ))
              )}
            </div>
          ) : (
            <Table
              rowKey="id"
              loading={isLoading}
              columns={columns}
              dataSource={rows}
              pagination={false}
            />
          )}
          <div className="list-pagination">
            <Pagination
              current={meta.page}
              pageSize={meta.pageSize}
              total={meta.total}
              onChange={(nextPage, nextPageSize) => {
                setPage(nextPage);
                setPageSize(nextPageSize);
              }}
              showSizeChanger={!isMobileOrderList}
              responsive
              pageSizeOptions={[10, 20, 50, 100]}
            />
          </div>
        </Card>
      </section>

      <section className="sunan-alert-band">
        <Alert
          type="info"
          showIcon
          message="查询窗口说明"
          description="采购查询仅支持近 3 年内数据；超窗将被后端拒绝并返回明确错误。"
        />
      </section>

      <section className="sunan-alert-band">
        <Alert
          type="info"
          showIcon
          message="审批通道说明"
          description="采购审批默认走系统内审批；企业微信原生审批通道会在对应业务启用后自动接入。"
        />
      </section>
    </>
  );
}
