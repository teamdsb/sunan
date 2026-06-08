import { Alert, Button, Card, Descriptions, Form, Input, InputNumber, List, Space, Table, Tag, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppSelector } from '../../app/hooks';
import {
  ProcurementApprovalRecord,
  ProcurementDepartmentCode,
  ProcurementOrderStatus,
  useBindProcurementOrderAttachmentsMutation,
  useGetProcurementOrderApprovalsQuery,
  useGetProcurementOrderQuery,
  usePrintProcurementOrderMutation,
  useResubmitProcurementOrderMutation,
  useSubmitProcurementOrderMutation,
  useUpdateProcurementOrderMutation,
} from './procurementApi';

interface ProcurementDraftFormValues {
  departmentCode: ProcurementDepartmentCode;
  dimensionType: 'none' | 'vessel' | 'logistics_category';
  dimensionKey?: string;
  title: string;
  summary: string;
  amount: number;
  expenseDate?: string;
}

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

const departmentLabel: Record<ProcurementDepartmentCode, string> = {
  general_office: '总经办',
  business_dept: '业务部',
  finance_dept: '财务部',
  shipping_dept: '船务部',
  logistics_dept: '后勤部',
};

const approvalActionLabelMap: Record<string, string> = {
  approve: '通过',
  reject: '驳回',
  return: '退回',
};

const approvalSourceLabelMap: Record<string, string> = {
  internal: '系统内审批',
  external: '企业微信审批',
};

const externalStatusLabelMap: Record<string, string> = {
  pending: '审批中',
  approved: '审批通过',
  rejected: '审批驳回',
  canceled: '审批撤销',
  terminated: '审批终止',
};

function labelFrom(map: Record<string, string>, value: string | null | undefined, fallback: string) {
  return value ? map[value] ?? fallback : '-';
}

export function ProcurementOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm<ProcurementDraftFormValues>();
  const [attachmentInput, setAttachmentInput] = useState('');

  const currentUser = useAppSelector((state) => state.auth.currentUser);
  const { data: orderResponse, isLoading, refetch } = useGetProcurementOrderQuery(id ?? '', { skip: !id });
  const { data: approvalResponse } = useGetProcurementOrderApprovalsQuery(id ?? '', { skip: !id });
  const [updateOrder, { isLoading: isUpdating }] = useUpdateProcurementOrderMutation();
  const [submitOrder, { isLoading: isSubmitting }] = useSubmitProcurementOrderMutation();
  const [resubmitOrder, { isLoading: isResubmitting }] = useResubmitProcurementOrderMutation();
  const [bindAttachments, { isLoading: isBinding }] = useBindProcurementOrderAttachmentsMutation();
  const [printOrder, { isLoading: isPrinting }] = usePrintProcurementOrderMutation();

  const order = orderResponse?.data;
  const approvals = approvalResponse?.data ?? [];

  const canEditDraft = Boolean(order && order.status === 'draft' && currentUser && (currentUser.userId === order.createdBy || currentUser.roles.includes('system_admin')));

  useEffect(() => {
    if (!order) {
      return;
    }

    form.setFieldsValue({
      departmentCode: order.departmentCode,
      dimensionType: order.dimensionType,
      dimensionKey: order.dimensionKey ?? undefined,
      title: order.title,
      summary: order.summary,
      amount: order.amount,
      expenseDate: order.expenseDate ?? undefined,
    });
  }, [form, order]);

  const approvalColumns: ColumnsType<ProcurementApprovalRecord> = useMemo(
    () => [
      { title: '节点', dataIndex: 'approvalLevel', key: 'approvalLevel', width: 120 },
      { title: '动作', dataIndex: 'action', key: 'action', width: 120, render: (value: string) => labelFrom(approvalActionLabelMap, value, '其他操作') },
      { title: '审批人', dataIndex: 'approvedBy', key: 'approvedBy', width: 160 },
      {
        title: '时间',
        dataIndex: 'approvedAt',
        key: 'approvedAt',
        width: 180,
        render: (value: string) => new Date(value).toLocaleString('zh-CN'),
      },
      { title: '意见', dataIndex: 'comment', key: 'comment', render: (value: string | null) => value || '-' },
      { title: '来源', dataIndex: 'source', key: 'source', width: 120, render: (value: string) => labelFrom(approvalSourceLabelMap, value, '其他来源') },
    ],
    [],
  );

  const handleSaveDraft = async () => {
    if (!id) {
      return;
    }

    const values = await form.validateFields();
    await updateOrder({
      id,
      data: {
        ...values,
        title: values.title.trim(),
        summary: values.summary.trim(),
        amount: Number(values.amount),
      },
    }).unwrap();
    messageApi.success('草稿已更新');
    await refetch();
  };

  const handleSubmit = async () => {
    if (!id || !order) {
      return;
    }

    if (order.submittedAt) {
      await resubmitOrder(id).unwrap();
      messageApi.success('采购单已重新提交');
    } else {
      await submitOrder(id).unwrap();
      messageApi.success('采购单已提交');
    }

    await refetch();
  };

  const handleBindAttachments = async () => {
    if (!id) {
      return;
    }

    const fileIds = attachmentInput
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    if (fileIds.length === 0) {
      messageApi.warning('请先输入 fileId');
      return;
    }

    await bindAttachments({ id, fileIds }).unwrap();
    messageApi.success('附件已绑定');
    setAttachmentInput('');
    await refetch();
  };

  const handlePrint = async () => {
    if (!id) {
      return;
    }

    const result = await printOrder(id).unwrap();
    window.open(result.data.downloadUrl, '_blank', 'noopener,noreferrer');
    messageApi.success('PDF 已生成');
  };

  if (!id) {
    return null;
  }

  return (
    <>
      {contextHolder}
      <section className="page-hero">
        <Typography.Title level={2}>采购单详情</Typography.Title>
        <Space wrap>
          <Button onClick={() => navigate('/procurement')}>返回列表</Button>
          <Button onClick={() => navigate('/procurement/approvals')}>进入审批页</Button>
          <Button loading={isPrinting} onClick={() => void handlePrint()}>
            导出 PDF
          </Button>
        </Space>
      </section>

      <section className="page-card-grid">
        <Card variant="borderless" className="placeholder-card" loading={isLoading}>
          {order ? (
            <Descriptions bordered column={1} size="small" title={order.title}>
              <Descriptions.Item label="状态">
                <Tag color={statusColor[order.status]}>{labelFrom(statusLabelMap, order.status, '未知状态')}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="单号">{order.orderNo}</Descriptions.Item>
              <Descriptions.Item label="部门">{labelFrom(departmentLabel, order.departmentCode, '未配置部门')}</Descriptions.Item>
              <Descriptions.Item label="细分">{order.dimensionKey || '-'}</Descriptions.Item>
              <Descriptions.Item label="金额">¥{order.amount.toFixed(2)}</Descriptions.Item>
              <Descriptions.Item label="摘要">{order.summary}</Descriptions.Item>
              <Descriptions.Item label="提交时间">{order.submittedAt ? new Date(order.submittedAt).toLocaleString('zh-CN') : '-'}</Descriptions.Item>
              <Descriptions.Item label="外部流程状态">{labelFrom(externalStatusLabelMap, order.externalStatus, '外部状态')}</Descriptions.Item>
            </Descriptions>
          ) : (
            <Alert type="warning" showIcon message="采购单不存在或无权限查看" />
          )}
        </Card>
      </section>

      {order && canEditDraft ? (
        <section className="page-card-grid">
          <Card variant="borderless" className="placeholder-card" title="草稿编辑">
            <Form form={form} layout="vertical">
              <Form.Item name="title" label="标题" rules={[{ required: true }]}>
                <Input maxLength={128} />
              </Form.Item>
              <Form.Item name="summary" label="摘要/事由" rules={[{ required: true }]}>
                <Input.TextArea rows={4} />
              </Form.Item>
              <Form.Item name="amount" label="金额" rules={[{ required: true }]}>
                <InputNumber min={0} precision={2} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="expenseDate" label="费用日期（可选）">
                <Input type="date" />
              </Form.Item>
              <Space wrap>
                <Button loading={isUpdating} onClick={() => void handleSaveDraft()}>
                  保存草稿
                </Button>
                <Button type="primary" loading={isSubmitting || isResubmitting} onClick={() => void handleSubmit()}>
                  {order.submittedAt ? '重新提交' : '提交审批'}
                </Button>
              </Space>
            </Form>
          </Card>
        </section>
      ) : null}

      {order && canEditDraft ? (
        <section className="page-card-grid">
          <Card variant="borderless" className="placeholder-card" title="附件绑定（输入 fileId，逗号分隔）">
            <Space.Compact style={{ width: '100%' }}>
              <Input value={attachmentInput} onChange={(event) => setAttachmentInput(event.target.value)} placeholder="uuid-1,uuid-2" />
              <Button loading={isBinding} onClick={() => void handleBindAttachments()}>
                绑定附件
              </Button>
            </Space.Compact>
          </Card>
        </section>
      ) : null}

      {order ? (
        <section className="page-card-grid">
          <Card variant="borderless" className="placeholder-card" title="已绑定附件">
            <List
              dataSource={order.files ?? []}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta title={item.fileName} description={`${item.mimeType} · ${item.fileSize} bytes`} />
                </List.Item>
              )}
              locale={{ emptyText: '暂无附件' }}
            />
          </Card>
        </section>
      ) : null}

      <section className="page-card-grid">
        <Card variant="borderless" className="placeholder-card" title="审批轨迹">
          <Table rowKey="id" columns={approvalColumns} dataSource={approvals} pagination={false} />
        </Card>
      </section>
    </>
  );
}
