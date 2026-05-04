import { Alert, Button, Card, Input, Pagination, Select, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../app/hooks';
import { procurementRouteConfig } from '../../router/procurementRouteConfig';
import {
  ProcurementDepartmentCode,
  ProcurementOrder,
  ProcurementOrderStatus,
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

function formatDepartment(code: ProcurementDepartmentCode) {
  return departmentOptions.find((item) => item.value === code)?.label ?? code;
}

export function ProcurementOrderListPage() {
  const navigate = useNavigate();
  const currentUser = useAppSelector((state) => state.auth.currentUser);
  const [keyword, setKeyword] = useState<string>('');
  const [departmentCode, setDepartmentCode] = useState<ProcurementDepartmentCode | undefined>(undefined);
  const [status, setStatus] = useState<ProcurementOrderStatus | undefined>(undefined);
  const [submittedFrom, setSubmittedFrom] = useState<string | undefined>(undefined);
  const [submittedTo, setSubmittedTo] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const now = new Date();
  const minDate = new Date(now);
  minDate.setFullYear(minDate.getFullYear() - 3);
  const currentDayText = now.toISOString().slice(0, 10);
  const minDayText = minDate.toISOString().slice(0, 10);

  const { data: response, isLoading } = useGetProcurementOrdersQuery({
    keyword: keyword || undefined,
    departmentCode,
    status,
    submittedFrom,
    submittedTo,
    page,
    pageSize,
  });

  const rows = response?.data ?? [];
  const meta = response?.meta ?? { total: 0, page, pageSize, totalPages: 0 };
  const canManageDictionary = Boolean(currentUser && (currentUser.roles.includes('system_admin') || currentUser.roles.includes('general_office')));

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
        render: (value: number) => `¥${value.toFixed(2)}`,
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 120,
        render: (value: ProcurementOrderStatus) => <Tag color={statusColor[value]}>{value}</Tag>,
      },
      {
        title: '提交时间',
        dataIndex: 'submittedAt',
        key: 'submittedAt',
        width: 180,
        render: (value: string | null) => (value ? new Date(value).toLocaleString('zh-CN') : '-'),
      },
      {
        title: '操作',
        key: 'actions',
        width: 140,
        render: (_, record) => (
          <Button type="link" onClick={() => navigate(`/procurement/orders/${record.id}`)}>
            查看详情
          </Button>
        ),
      },
    ],
    [navigate],
  );

  return (
    <>
      <section className="page-hero">
        <Typography.Title level={2}>采购管理</Typography.Title>
        <Typography.Paragraph type="secondary">支持采购单草稿、提交、审批与附件留存。</Typography.Paragraph>
        <Space wrap>
          <Input.Search
            placeholder="搜索标题或摘要"
            allowClear
            style={{ width: 240 }}
            onSearch={(value) => {
              setPage(1);
              setKeyword(value.trim());
            }}
          />
          <Select
            allowClear
            placeholder="部门"
            style={{ width: 160 }}
            options={departmentOptions}
            value={departmentCode}
            onChange={(value) => {
              setPage(1);
              setDepartmentCode(value);
            }}
          />
          <Select
            allowClear
            placeholder="状态"
            style={{ width: 160 }}
            options={statusOptions}
            value={status}
            onChange={(value) => {
              setPage(1);
              setStatus(value);
            }}
          />
          <Input
            type="date"
            style={{ width: 180 }}
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
            type="date"
            style={{ width: 180 }}
            placeholder="提交截止日期"
            min={minDayText}
            max={currentDayText}
            value={submittedTo ?? ''}
            onChange={(event) => {
              setPage(1);
              setSubmittedTo(event.target.value || undefined);
            }}
          />
          <Button type="primary" onClick={() => navigate(procurementRouteConfig.orderCreate.path)}>
            新建采购单
          </Button>
          <Button onClick={() => navigate(procurementRouteConfig.approvals.path)}>进入审批页</Button>
          <Button onClick={() => navigate(procurementRouteConfig.reports.path)}>进入报表页</Button>
          <Button onClick={() => navigate(procurementRouteConfig.reportApprovals.path)}>报表审批页</Button>
          {canManageDictionary ? <Button onClick={() => navigate(procurementRouteConfig.dictionaries.path)}>字典治理</Button> : null}
        </Space>
      </section>

      <section className="page-card-grid">
        <Card bordered={false} className="placeholder-card office-admin-card">
          <Table rowKey="id" loading={isLoading} columns={columns} dataSource={rows} pagination={false} />
          <div className="list-pagination">
            <Pagination
              current={meta.page}
              pageSize={meta.pageSize}
              total={meta.total}
              onChange={(nextPage, nextPageSize) => {
                setPage(nextPage);
                setPageSize(nextPageSize);
              }}
              showSizeChanger
              pageSizeOptions={[10, 20, 50, 100]}
            />
          </div>
        </Card>
      </section>

      <section className="page-card-grid">
        <Alert type="info" showIcon message="查询窗口说明" description="采购查询仅支持近 3 年内数据；超窗将被后端拒绝并返回明确错误。" />
      </section>

      <section className="page-card-grid">
        <Alert
          type="info"
          showIcon
          message="审批通道说明"
          description="当前里程碑固定使用 internal 审批通道；wecom_native 保留为后续桥接扩展。"
        />
      </section>
    </>
  );
}
