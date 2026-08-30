import {
  Alert,
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Modal,
  Space,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppSelector } from '../../app/hooks';
import { ResponsiveTable } from '../../components/ResponsiveTable';
import { FileUploadField } from '../files/FileUploadField';
import { FileAttachmentList } from '../files/FileAttachmentList';
import { FilePreviewModal } from '../files/FilePreviewModal';
import { downloadFileFromUrl } from '../files/fileDownload';
import type { FileRecord } from '../files/types';
import {
  ProcurementApprovalRecord,
  ProcurementDepartmentCode,
  ProcurementOrderStatus,
  useBindProcurementOrderAttachmentsMutation,
  useUnlinkProcurementOrderAttachmentMutation,
  useGetProcurementOrderApprovalsQuery,
  useGetProcurementOrderQuery,
  useLazyGetProcurementOrderAttachmentDownloadUrlQuery,
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

function labelFrom(
  map: Record<string, string>,
  value: string | null | undefined,
  fallback: string,
) {
  return value ? (map[value] ?? fallback) : '-';
}

function toDateTimeLocal(value: string | null | undefined) {
  if (!value) return undefined;
  const date = new Date(value.includes('T') ? value : `${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return undefined;
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toIsoDateTime(value: string | undefined) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

export function ProcurementOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm<ProcurementDraftFormValues>();

  const currentUser = useAppSelector((state) => state.auth.currentUser);
  const {
    data: orderResponse,
    isLoading,
    refetch,
  } = useGetProcurementOrderQuery(id ?? '', { skip: !id });
  const { data: approvalResponse } = useGetProcurementOrderApprovalsQuery(
    id ?? '',
    { skip: !id },
  );
  const [updateOrder, { isLoading: isUpdating }] =
    useUpdateProcurementOrderMutation();
  const [submitOrder, { isLoading: isSubmitting }] =
    useSubmitProcurementOrderMutation();
  const [resubmitOrder, { isLoading: isResubmitting }] =
    useResubmitProcurementOrderMutation();
  const [bindAttachments, { isLoading: isBinding }] =
    useBindProcurementOrderAttachmentsMutation();
  const [unlinkAttachment, { isLoading: isUnlinking }] =
    useUnlinkProcurementOrderAttachmentMutation();
  const [getAttachmentDownloadUrl] =
    useLazyGetProcurementOrderAttachmentDownloadUrlQuery();
  const [printOrder] = usePrintProcurementOrderMutation();
  const [pdfAction, setPdfAction] = useState<'preview' | 'download' | null>(
    null,
  );
  const [pdfPreview, setPdfPreview] = useState<{
    fileName: string;
    downloadUrl: string;
  } | null>(null);
  const [pdfExport, setPdfExport] = useState<{
    fileName: string;
    downloadUrl: string;
    sourceVersion: string;
    createdAt: number;
  } | null>(null);

  const order = orderResponse?.data;
  const approvals = approvalResponse?.data ?? [];

  const canEditDraft = Boolean(
    order &&
    order.status === 'draft' &&
    currentUser &&
    (currentUser.userId === order.createdBy ||
      currentUser.roles.includes('system_admin')),
  );

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
        expenseDate: toDateTimeLocal(order.expenseDate),
    });
  }, [form, order]);

  const approvalColumns: ColumnsType<ProcurementApprovalRecord> = useMemo(
    () => [
      {
        title: '节点',
        dataIndex: 'approvalLevel',
        key: 'approvalLevel',
        width: 120,
      },
      {
        title: '动作',
        dataIndex: 'action',
        key: 'action',
        width: 120,
        render: (value: string) =>
          labelFrom(approvalActionLabelMap, value, '其他操作'),
      },
      {
        title: '审批人',
        dataIndex: 'approvedBy',
        key: 'approvedBy',
        width: 160,
      },
      {
        title: '时间',
        dataIndex: 'approvedAt',
        key: 'approvedAt',
        width: 180,
        render: (value: string) => new Date(value).toLocaleString('zh-CN'),
      },
      {
        title: '意见',
        dataIndex: 'comment',
        key: 'comment',
        render: (value: string | null) => value || '-',
      },
      {
        title: '来源',
        dataIndex: 'source',
        key: 'source',
        width: 120,
        render: (value: string) =>
          labelFrom(approvalSourceLabelMap, value, '其他来源'),
      },
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
        expenseDate: toIsoDateTime(values.expenseDate),
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

  const handleUploadedAttachment = async (file: FileRecord | null) => {
    if (!id || !file) {
      return;
    }

    await bindAttachments({ id, fileIds: [file.id] }).unwrap();
    messageApi.success('附件已上传并绑定');
    await refetch();
  };

  const handlePrint = async (mode: 'preview' | 'download') => {
    if (!id) {
      return;
    }

    setPdfAction(mode);
    try {
      const sourceVersion = `${id}:${order?.updatedAt ?? ''}`;
      const canReusePdf =
        pdfExport?.sourceVersion === sourceVersion &&
        Date.now() - pdfExport.createdAt < 2 * 60 * 1000;
      const currentPdf = canReusePdf
        ? pdfExport
        : await printOrder(id)
            .unwrap()
            .then((result) => {
              const nextPdf = {
                fileName: `${order?.orderNo ?? '采购单'}.pdf`,
                downloadUrl: result.data.downloadUrl,
                sourceVersion,
                createdAt: Date.now(),
              };
              setPdfExport(nextPdf);
              return nextPdf;
            });
      if (mode === 'preview') {
        setPdfPreview(currentPdf);
        messageApi.success('PDF 已打开预览');
      } else {
        await downloadFileFromUrl(currentPdf.downloadUrl, currentPdf.fileName);
        messageApi.success('PDF 已开始下载');
      }
    } catch (error) {
      messageApi.error(
        error instanceof Error ? error.message : 'PDF 生成失败，请稍后重试',
      );
    } finally {
      setPdfAction(null);
    }
  };

  const handleUnlinkAttachment = (file: { id: string }) => {
    if (!id) return;
    let reason = '';
    Modal.confirm({
      title: '解除附件关联',
      content: (
        <Input
          autoFocus
          placeholder="请输入解除原因"
          onChange={(event) => {
            reason = event.target.value;
          }}
        />
      ),
      okText: '确认解除',
      cancelText: '取消',
      okButtonProps: { danger: true, loading: isUnlinking },
      onOk: async () => {
        if (!reason.trim()) throw new Error('请输入解除原因');
        await unlinkAttachment({
          id,
          fileId: file.id,
          reason: reason.trim(),
        }).unwrap();
        messageApi.success('附件关联已解除，原文件未被删除');
        await refetch();
      },
    });
  };

  if (!id) {
    return null;
  }

  return (
    <>
      {contextHolder}
      {!canEditDraft ? <Form form={form} component={false} /> : null}
      <section className="page-hero">
        <Typography.Title level={2}>采购单详情</Typography.Title>
        <Typography.Paragraph type="secondary">
          查看采购单、审批进度和执行信息，并按需导出 PDF。
        </Typography.Paragraph>
        <Space wrap>
          <Button onClick={() => navigate('/procurement')}>返回采购首页</Button>
          <Button onClick={() => navigate('/procurement/approvals')}>
            进入审批页
          </Button>
          <Button
            loading={pdfAction === 'preview'}
            disabled={pdfAction !== null}
            onClick={() => void handlePrint('preview')}
          >
            预览 PDF
          </Button>
          <Button
            loading={pdfAction === 'download'}
            disabled={pdfAction !== null}
            onClick={() => void handlePrint('download')}
          >
            导出 PDF
          </Button>
        </Space>
      </section>

      <section className="page-card-grid">
        <Card
          variant="borderless"
          className="placeholder-card"
          loading={isLoading}
        >
          {order ? (
            <Descriptions bordered column={1} size="small" title={order.title}>
              <Descriptions.Item label="状态">
                <Tag color={statusColor[order.status]}>
                  {labelFrom(statusLabelMap, order.status, '未知状态')}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="单号">
                {order.orderNo}
              </Descriptions.Item>
              <Descriptions.Item label="部门">
                {labelFrom(departmentLabel, order.departmentCode, '未配置部门')}
              </Descriptions.Item>
              <Descriptions.Item label="细分">
                {order.dimensionKey || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="金额">
                ¥{order.amount.toFixed(2)}
              </Descriptions.Item>
              <Descriptions.Item label="摘要">
                {order.summary}
              </Descriptions.Item>
              <Descriptions.Item label="提交时间">
                {order.submittedAt
                  ? new Date(order.submittedAt).toLocaleString('zh-CN')
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="外部流程状态">
                {labelFrom(
                  externalStatusLabelMap,
                  order.externalStatus,
                  '外部状态',
                )}
              </Descriptions.Item>
            </Descriptions>
          ) : (
            <Alert type="warning" showIcon message="采购单不存在或无权限查看" />
          )}
        </Card>
      </section>

      {order && canEditDraft ? (
        <section className="page-card-grid">
          <Card
            variant="borderless"
            className="placeholder-card"
            title="草稿编辑"
          >
            <Form form={form} layout="vertical">
              <Form.Item name="title" label="标题" rules={[{ required: true }]}>
                <Input maxLength={128} />
              </Form.Item>
              <Form.Item
                name="summary"
                label="摘要/事由"
                rules={[{ required: true }]}
              >
                <Input.TextArea rows={4} />
              </Form.Item>
              <Form.Item
                name="amount"
                label="金额"
                rules={[{ required: true }]}
              >
                <InputNumber min={0} precision={2} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="expenseDate" label="费用时间（可选）">
                <Input type="datetime-local" />
              </Form.Item>
              <Space wrap>
                <Button
                  loading={isUpdating}
                  onClick={() => void handleSaveDraft()}
                >
                  保存草稿
                </Button>
                <Button
                  type="primary"
                  loading={isSubmitting || isResubmitting}
                  onClick={() => void handleSubmit()}
                >
                  {order.submittedAt ? '重新提交' : '提交审批'}
                </Button>
              </Space>
            </Form>
          </Card>
        </section>
      ) : null}

      {order && canEditDraft ? (
        <section className="page-card-grid">
          <Card
            variant="borderless"
            className="placeholder-card"
            title="附件上传"
          >
            <FileUploadField
              category="procurement-attachments"
              onChange={(file) => void handleUploadedAttachment(file)}
            />
            {isBinding ? (
              <Typography.Text type="secondary">正在绑定附件…</Typography.Text>
            ) : null}
          </Card>
        </section>
      ) : null}

      {order ? (
        <section className="page-card-grid">
          <Card
            variant="borderless"
            className="placeholder-card"
            title="已绑定附件"
          >
            <FileAttachmentList
              files={order.files ?? []}
              getUrl={async (file) => {
                const response = await getAttachmentDownloadUrl({
                  id,
                  fileId: file.id,
                }).unwrap();
                return response.data.downloadUrl;
              }}
              extraActions={(file) =>
                canEditDraft
                  ? [
                      <Button
                        key="unlink"
                        danger
                        type="link"
                        loading={isUnlinking}
                        onClick={() => handleUnlinkAttachment(file)}
                      >
                        解除关联
                      </Button>,
                    ]
                  : []
              }
            />
          </Card>
        </section>
      ) : null}

      <section className="page-card-grid">
        <Card
          variant="borderless"
          className="placeholder-card"
          title="审批轨迹"
        >
          <ResponsiveTable
            rowKey="id"
            columns={approvalColumns}
            dataSource={approvals}
            pagination={false}
          />
        </Card>
      </section>
      <FilePreviewModal
        open={Boolean(pdfPreview)}
        file={
          pdfPreview
            ? {
                fileName: pdfPreview.fileName,
                mimeType: 'application/pdf',
                fileSize: 0,
              }
            : null
        }
        getUrl={() => {
          if (!pdfPreview) return Promise.reject(new Error('PDF 尚未生成'));
          return Promise.resolve(pdfPreview.downloadUrl);
        }}
        onClose={() => setPdfPreview(null)}
      />
    </>
  );
}
