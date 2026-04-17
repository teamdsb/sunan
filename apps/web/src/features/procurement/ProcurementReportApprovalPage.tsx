import { Alert, Button, Card, Select, Space, Table, Tag, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ProcurementDepartmentCode,
  ProcurementPendingTask,
  useActionProcurementReportApprovalMutation,
  useGetProcurementPendingApprovalsQuery,
} from './procurementApi';

const departmentOptions = [
  { label: '总经办', value: 'general_office' },
  { label: '业务部', value: 'business_dept' },
  { label: '财务部', value: 'finance_dept' },
  { label: '船务部', value: 'shipping_dept' },
  { label: '后勤部', value: 'logistics_dept' },
];

export function ProcurementReportApprovalPage() {
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const [departmentCode, setDepartmentCode] = useState<ProcurementDepartmentCode | undefined>(undefined);

  const { data: response, isLoading, refetch } = useGetProcurementPendingApprovalsQuery({ entityType: 'report', departmentCode });
  const [actionApproval, { isLoading: isActing }] = useActionProcurementReportApprovalMutation();

  const rows = response?.data ?? [];

  const handleAction = async (task: ProcurementPendingTask, action: 'approve' | 'reject' | 'return') => {
    const comment = window.prompt(`请输入审批意见（${action}）`) ?? '';
    if (action !== 'approve' && !comment.trim()) {
      messageApi.warning('退回和驳回需要审批意见');
      return;
    }

    await actionApproval({ id: task.entityId, action, comment: comment.trim() || undefined }).unwrap();
    messageApi.success('审批操作已提交');
    await refetch();
  };

  const columns: ColumnsType<ProcurementPendingTask> = useMemo(
    () => [
      { title: '标题', dataIndex: 'title', key: 'title' },
      {
        title: '部门',
        dataIndex: 'departmentCode',
        key: 'departmentCode',
        width: 140,
        render: (value: string | null) => value ?? '-',
      },
      { title: '审批节点', dataIndex: 'approvalLevel', key: 'approvalLevel', width: 120 },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 160,
        render: (value: string) => <Tag color={value === 'submitted' ? 'gold' : 'blue'}>{value}</Tag>,
      },
      {
        title: '提交时间',
        dataIndex: 'submittedAt',
        key: 'submittedAt',
        width: 180,
        render: (value: string) => new Date(value).toLocaleString('zh-CN'),
      },
      {
        title: '操作',
        key: 'actions',
        width: 280,
        render: (_, record) => (
          <Space wrap>
            <Button type="link" onClick={() => navigate(`/procurement/report-requests/${record.entityId}`)}>
              查看详情
            </Button>
            <Button type="primary" ghost loading={isActing} onClick={() => void handleAction(record, 'approve')}>
              通过
            </Button>
            <Button loading={isActing} onClick={() => void handleAction(record, 'return')}>
              退回
            </Button>
            <Button danger ghost loading={isActing} onClick={() => void handleAction(record, 'reject')}>
              驳回
            </Button>
          </Space>
        ),
      },
    ],
    [isActing, navigate],
  );

  return (
    <>
      {contextHolder}
      <section className="page-hero">
        <Typography.Title level={2}>报表审批</Typography.Title>
        <Typography.Paragraph type="secondary">{'处理报表审批单待办，审批链：部门主管 → 财务部 → 总经办。'}</Typography.Paragraph>
        <Space wrap>
          <Select
            allowClear
            placeholder="按部门过滤"
            style={{ width: 180 }}
            options={departmentOptions}
            value={departmentCode}
            onChange={(value) => setDepartmentCode(value)}
          />
          <Button onClick={() => navigate('/procurement/reports')}>返回报表页</Button>
        </Space>
      </section>

      <section className="page-card-grid">
        <Card bordered={false} className="placeholder-card office-admin-card">
          <Table rowKey="entityId" loading={isLoading} columns={columns} dataSource={rows} pagination={false} />
        </Card>
      </section>

      <section className="page-card-grid">
        <Alert
          type="info"
          showIcon
          message="审批来源"
          description="当前阶段仅支持 internal 审批动作，external 来源为后续企业微信原生审批桥接预留。"
        />
      </section>
    </>
  );
}
