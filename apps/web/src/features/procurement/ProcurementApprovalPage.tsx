import {
  Alert,
  Button,
  Card,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveTable } from '../../components/ResponsiveTable';
import {
  ProcurementDepartmentCode,
  ProcurementPendingTask,
  useActionProcurementOrderApprovalMutation,
  useGetProcurementPendingApprovalsQuery,
} from './procurementApi';

const departmentOptions = [
  { label: '总经办', value: 'general_office' },
  { label: '业务部', value: 'business_dept' },
  { label: '财务部', value: 'finance_dept' },
  { label: '船务部', value: 'shipping_dept' },
  { label: '后勤部', value: 'logistics_dept' },
];

const statusLabelMap: Record<string, string> = {
  draft: '草稿',
  submitted: '已提交',
  dept_approved: '部门通过',
  final_approved: '终审通过',
  rejected: '已驳回',
};

const actionLabelMap: Record<'approve' | 'reject' | 'return', string> = {
  approve: '通过',
  reject: '驳回',
  return: '退回',
};

function formatDepartment(value: string | null) {
  return value
    ? (departmentOptions.find((item) => item.value === value)?.label ??
        '未配置部门')
    : '-';
}

function formatStatus(value: string) {
  return statusLabelMap[value] ?? '未知状态';
}

export function ProcurementApprovalPage() {
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const [departmentCode, setDepartmentCode] = useState<
    ProcurementDepartmentCode | undefined
  >(undefined);
  const {
    data: response,
    isLoading,
    refetch,
  } = useGetProcurementPendingApprovalsQuery({
    entityType: 'order',
    departmentCode,
  });
  const [actionApproval, { isLoading: isActing }] =
    useActionProcurementOrderApprovalMutation();

  const rows = response?.data ?? [];

  const handleAction = async (
    task: ProcurementPendingTask,
    action: 'approve' | 'reject' | 'return',
  ) => {
    const comment =
      window.prompt(`请输入审批意见（${actionLabelMap[action]}）`) ?? '';
    if (action !== 'approve' && !comment.trim()) {
      messageApi.warning('退回和驳回需要审批意见');
      return;
    }

    await actionApproval({
      id: task.entityId,
      action,
      comment: comment.trim() || undefined,
    }).unwrap();
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
        render: (value: string | null) => formatDepartment(value),
      },
      {
        title: '审批节点',
        dataIndex: 'approvalLevel',
        key: 'approvalLevel',
        width: 120,
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 140,
        render: (value: string) => (
          <Tag color={value === 'submitted' ? 'gold' : 'blue'}>
            {formatStatus(value)}
          </Tag>
        ),
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
            <Button
              type="link"
              onClick={() => navigate(`/procurement/orders/${record.entityId}`)}
            >
              查看详情
            </Button>
            <Button
              type="primary"
              ghost
              loading={isActing}
              onClick={() => void handleAction(record, 'approve')}
            >
              通过
            </Button>
            <Button
              loading={isActing}
              onClick={() => void handleAction(record, 'return')}
            >
              退回
            </Button>
            <Button
              danger
              ghost
              loading={isActing}
              onClick={() => void handleAction(record, 'reject')}
            >
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
        <Typography.Title level={2}>采购审批</Typography.Title>
        <Typography.Paragraph type="secondary">
          处理待审批采购单，支持通过、退回、驳回。
        </Typography.Paragraph>
        <Button onClick={() => navigate('/procurement')}>返回采购首页</Button>
        <div className="sunan-query-grid">
          <Select
            allowClear
            placeholder="按部门过滤"
            options={departmentOptions}
            value={departmentCode}
            onChange={(value) => setDepartmentCode(value)}
          />
        </div>
      </section>

      <section className="page-card-grid">
        <Card
          variant="borderless"
          className="placeholder-card office-admin-card"
        >
          <ResponsiveTable
            rowKey="entityId"
            loading={isLoading}
            columns={columns}
            dataSource={rows}
            pagination={false}
          />
        </Card>
      </section>

      <section className="page-card-grid">
        <Alert
          type="info"
          showIcon
          message="审批来源"
          description="当前采购审批在系统内完成；企业微信审批来源会在对应业务启用后自动接入。"
        />
      </section>
    </>
  );
}
