import { Alert, Button, Card, Form, Input, InputNumber, Select, Space, Table, Tag, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ProcurementDepartmentCode,
  ProcurementReportRequest,
  ProcurementReportSummaryItem,
  useCreateProcurementReportRequestMutation,
  useGetProcurementDepartmentDetailsQuery,
  useGetProcurementDimensionDetailsQuery,
  useGetProcurementMonthlyReportQuery,
  useGetProcurementReportRequestsQuery,
  useGetProcurementYearlyReportQuery,
} from './procurementApi';

const departmentOptions = [
  { label: '总经办', value: 'general_office' },
  { label: '业务部', value: 'business_dept' },
  { label: '财务部', value: 'finance_dept' },
  { label: '船务部', value: 'shipping_dept' },
  { label: '后勤部', value: 'logistics_dept' },
];

const reportStatusColor: Record<string, string> = {
  draft: 'default',
  submitted: 'gold',
  dept_approved: 'blue',
  finance_approved: 'cyan',
  final_approved: 'green',
  rejected: 'red',
};

const reportStatusLabelMap: Record<string, string> = {
  draft: '草稿',
  submitted: '已提交',
  dept_approved: '部门通过',
  finance_approved: '财务通过',
  final_approved: '终审通过',
  rejected: '已驳回',
};

const reportTypeLabelMap: Record<string, string> = {
  monthly: '月报',
  yearly: '年报',
};

function labelFrom(map: Record<string, string>, value: string | null | undefined, fallback: string) {
  return value ? map[value] ?? fallback : '-';
}

export function ProcurementReportPage() {
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const currentYear = new Date().getFullYear();

  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [departmentCode, setDepartmentCode] = useState<ProcurementDepartmentCode | undefined>(undefined);
  const [detailsDepartmentCode, setDetailsDepartmentCode] = useState<ProcurementDepartmentCode>('business_dept');
  const [dimensionDepartmentCode, setDimensionDepartmentCode] = useState<'shipping_dept' | 'logistics_dept'>('shipping_dept');
  const [dimensionKey, setDimensionKey] = useState<string>('');

  const [dateRangeForm] = Form.useForm<{ startDate: string; endDate: string }>();
  const [dimensionDateForm] = Form.useForm<{ startDate: string; endDate: string }>();

  const defaultStartDate = `${currentYear}-01-01`;
  const defaultEndDate = new Date().toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [dimensionStartDate, setDimensionStartDate] = useState(defaultStartDate);
  const [dimensionEndDate, setDimensionEndDate] = useState(defaultEndDate);

  const { data: monthlyResponse, isLoading: isMonthlyLoading } = useGetProcurementMonthlyReportQuery({ year, month, departmentCode });
  const { data: yearlyResponse, isLoading: isYearlyLoading } = useGetProcurementYearlyReportQuery({ year, departmentCode });
  const { data: detailsResponse, isLoading: isDetailsLoading } = useGetProcurementDepartmentDetailsQuery({
    departmentCode: detailsDepartmentCode,
    startDate,
    endDate,
  });
  const { data: dimensionResponse, isLoading: isDimensionLoading } = useGetProcurementDimensionDetailsQuery({
    departmentCode: dimensionDepartmentCode,
    dimensionType: dimensionDepartmentCode === 'shipping_dept' ? 'vessel' : 'logistics_category',
    dimensionKey: dimensionKey.trim() || undefined,
    startDate: dimensionStartDate,
    endDate: dimensionEndDate,
  });

  const [requestPage, setRequestPage] = useState(1);
  const { data: requestResponse, isLoading: isRequestLoading } = useGetProcurementReportRequestsQuery({ page: requestPage, pageSize: 10 });

  const [createReportRequest, { isLoading: isCreatingRequest }] = useCreateProcurementReportRequestMutation();

  const monthlyColumns: ColumnsType<ProcurementReportSummaryItem> = useMemo(
    () => [
      { title: '维度', dataIndex: 'label', key: 'label' },
      { title: '金额', dataIndex: 'amount', key: 'amount', render: (value: number) => `¥${value.toFixed(2)}` },
      { title: '单数', dataIndex: 'orderCount', key: 'orderCount' },
    ],
    [],
  );

  const requestColumns: ColumnsType<ProcurementReportRequest> = useMemo(
    () => [
      { title: '单号', dataIndex: 'reportNo', key: 'reportNo', width: 180 },
      { title: '类型', dataIndex: 'reportType', key: 'reportType', width: 120, render: (value: string) => labelFrom(reportTypeLabelMap, value, '其他报表') },
      {
        title: '周期',
        key: 'period',
        width: 150,
        render: (_, row) => (row.periodMonth ? `${row.periodYear}-${String(row.periodMonth).padStart(2, '0')}` : `${row.periodYear}`),
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 140,
        render: (value: string) => <Tag color={reportStatusColor[value] ?? 'default'}>{labelFrom(reportStatusLabelMap, value, '未知状态')}</Tag>,
      },
      {
        title: '操作',
        key: 'actions',
        width: 160,
        render: (_, row) => (
          <Button type="link" onClick={() => navigate(`/procurement/report-requests/${row.id}`)}>
            查看详情
          </Button>
        ),
      },
    ],
    [navigate],
  );

  const handleCreateMonthlyRequest = async () => {
    const created = await createReportRequest({ reportType: 'monthly', periodYear: year, periodMonth: month, departmentCode }).unwrap();
    messageApi.success('月报审批单草稿已创建');
    navigate(`/procurement/report-requests/${created.data.id}`);
  };

  const handleCreateYearlyRequest = async () => {
    const created = await createReportRequest({ reportType: 'yearly', periodYear: year, departmentCode }).unwrap();
    messageApi.success('年报审批单草稿已创建');
    navigate(`/procurement/report-requests/${created.data.id}`);
  };

  return (
    <>
      {contextHolder}
      <section className="page-hero">
        <Typography.Title level={2}>采购报表</Typography.Title>
        <Typography.Paragraph type="secondary">支持月报、年报、部门明细与部门细分明细查询，并可发起报表审批单。</Typography.Paragraph>
        <Space wrap>
          <InputNumber min={currentYear - 2} max={currentYear} value={year} onChange={(value) => setYear(value ?? currentYear)} />
          <InputNumber min={1} max={12} value={month} onChange={(value) => setMonth(value ?? 1)} />
          <Select
            allowClear
            placeholder="部门筛选（可选）"
            options={departmentOptions}
            style={{ width: 180 }}
            value={departmentCode}
            onChange={(value) => setDepartmentCode(value)}
          />
          <Button type="primary" loading={isCreatingRequest} onClick={() => void handleCreateMonthlyRequest()}>
            生成月报审批单
          </Button>
          <Button loading={isCreatingRequest} onClick={() => void handleCreateYearlyRequest()}>
            生成年报审批单
          </Button>
          <Button onClick={() => navigate('/procurement/report-approvals')}>进入报表审批页</Button>
        </Space>
      </section>

      <section className="page-card-grid">
        <Card variant="borderless" className="placeholder-card" title="月度汇总">
          <Table rowKey="label" loading={isMonthlyLoading} columns={monthlyColumns} dataSource={monthlyResponse?.data.items ?? []} pagination={false} />
        </Card>
      </section>

      <section className="page-card-grid">
        <Card variant="borderless" className="placeholder-card" title="年度趋势">
          <Table rowKey="label" loading={isYearlyLoading} columns={monthlyColumns} dataSource={yearlyResponse?.data.items ?? []} pagination={false} />
        </Card>
      </section>

      <section className="page-card-grid">
        <Card variant="borderless" className="placeholder-card" title="部门采购明细">
          <Space wrap style={{ marginBottom: 16 }}>
            <Select style={{ width: 180 }} value={detailsDepartmentCode} options={departmentOptions} onChange={(value) => setDetailsDepartmentCode(value)} />
            <Form
              form={dateRangeForm}
              layout="inline"
              initialValues={{ startDate: defaultStartDate, endDate: defaultEndDate }}
              onFinish={(values: { startDate: string; endDate: string }) => {
                setStartDate(values.startDate);
                setEndDate(values.endDate);
              }}
            >
              <Form.Item name="startDate" rules={[{ required: true }]}> 
                <Input type="date" />
              </Form.Item>
              <Form.Item name="endDate" rules={[{ required: true }]}> 
                <Input type="date" />
              </Form.Item>
              <Form.Item>
                <Button htmlType="submit">刷新</Button>
              </Form.Item>
            </Form>
          </Space>

          <Table
            rowKey="orderId"
            loading={isDetailsLoading}
            pagination={{ pageSize: 8 }}
            dataSource={detailsResponse?.data ?? []}
            columns={[
              { title: '单号', dataIndex: 'orderNo', key: 'orderNo', width: 160 },
              { title: '标题', dataIndex: 'title', key: 'title' },
              { title: '金额', dataIndex: 'amount', key: 'amount', render: (value: number) => `¥${value.toFixed(2)}`, width: 120 },
              { title: '状态', dataIndex: 'status', key: 'status', width: 140, render: (value: string) => labelFrom(reportStatusLabelMap, value, '未知状态') },
              { title: '提交时间', dataIndex: 'submittedAt', key: 'submittedAt', width: 180, render: (value: string | null) => (value ? new Date(value).toLocaleString('zh-CN') : '-') },
            ]}
          />
        </Card>
      </section>

      <section className="page-card-grid">
        <Card variant="borderless" className="placeholder-card" title="部门细分明细（船舶/后勤）">
          <Space wrap style={{ marginBottom: 16 }}>
            <Select
              style={{ width: 180 }}
              value={dimensionDepartmentCode}
              options={[
                { label: '船务部', value: 'shipping_dept' },
                { label: '后勤部', value: 'logistics_dept' },
              ]}
              onChange={(value) => setDimensionDepartmentCode(value)}
            />
            <Input placeholder="细分对象（可选）" style={{ width: 220 }} value={dimensionKey} onChange={(event) => setDimensionKey(event.target.value)} />
            <Form
              form={dimensionDateForm}
              layout="inline"
              initialValues={{ startDate: defaultStartDate, endDate: defaultEndDate }}
              onFinish={(values: { startDate: string; endDate: string }) => {
                setDimensionStartDate(values.startDate);
                setDimensionEndDate(values.endDate);
              }}
            >
              <Form.Item name="startDate" rules={[{ required: true }]}> 
                <Input type="date" />
              </Form.Item>
              <Form.Item name="endDate" rules={[{ required: true }]}> 
                <Input type="date" />
              </Form.Item>
              <Form.Item>
                <Button htmlType="submit">刷新</Button>
              </Form.Item>
            </Form>
          </Space>

          <Table
            rowKey="orderId"
            loading={isDimensionLoading}
            pagination={{ pageSize: 8 }}
            dataSource={dimensionResponse?.data ?? []}
            columns={[
              { title: '单号', dataIndex: 'orderNo', key: 'orderNo', width: 160 },
              { title: '细分对象', dataIndex: 'dimensionKey', key: 'dimensionKey', width: 180, render: (value: string | null) => value ?? '-' },
              { title: '标题', dataIndex: 'title', key: 'title' },
              { title: '金额', dataIndex: 'amount', key: 'amount', render: (value: number) => `¥${value.toFixed(2)}`, width: 120 },
              { title: '状态', dataIndex: 'status', key: 'status', width: 140, render: (value: string) => reportStatusLabelMap[value] ?? value },
            ]}
          />
        </Card>
      </section>

      <section className="page-card-grid">
        <Card variant="borderless" className="placeholder-card" title="报表审批单列表">
          <Table rowKey="id" loading={isRequestLoading} columns={requestColumns} dataSource={requestResponse?.data ?? []} pagination={false} />
          <div className="list-pagination">
            <Button disabled={requestPage <= 1} onClick={() => setRequestPage((page) => page - 1)}>
              上一页
            </Button>
            <Button
              disabled={(requestResponse?.meta.totalPages ?? 1) <= requestPage}
              onClick={() => setRequestPage((page) => page + 1)}
            >
              下一页
            </Button>
          </div>
        </Card>
      </section>

      <section className="page-card-grid">
        <Alert
          type="info"
          showIcon
          message="统计口径"
          description="报表统计纳入已提交、部门通过、终审通过和已驳回数据，默认支持近 3 年范围。"
        />
      </section>
    </>
  );
}
