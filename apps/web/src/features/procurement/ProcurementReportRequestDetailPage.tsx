import { Alert, Button, Card, Descriptions, Space, Tag, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppSelector } from '../../app/hooks';
import { ResponsiveTable } from '../../components/ResponsiveTable';
import {
  ProcurementApprovalRecord,
  ProcurementReportRequestStatus,
  useGetProcurementReportApprovalsQuery,
  useGetProcurementReportRequestQuery,
  usePrintProcurementReportRequestMutation,
  useSubmitProcurementReportRequestMutation,
} from './procurementApi';

const statusColor: Record<ProcurementReportRequestStatus, string> = {
  draft: 'default',
  submitted: 'gold',
  dept_approved: 'blue',
  finance_approved: 'cyan',
  final_approved: 'green',
  rejected: 'red',
};

const statusLabelMap: Record<ProcurementReportRequestStatus, string> = {
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

const departmentLabelMap: Record<string, string> = {
  general_office: '总经办',
  business_dept: '业务部',
  finance_dept: '财务部',
  shipping_dept: '船务部',
  logistics_dept: '后勤部',
};

const approvalChannelLabelMap: Record<string, string> = {
  internal: '系统内审批',
  wecom_native: '企业微信审批',
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

export function ProcurementReportRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();

  const currentUser = useAppSelector((state) => state.auth.currentUser);
  const { data: detailResponse, isLoading, refetch } = useGetProcurementReportRequestQuery(id ?? '', { skip: !id });
  const { data: approvalsResponse } = useGetProcurementReportApprovalsQuery(id ?? '', { skip: !id });
  const [submitRequest, { isLoading: isSubmitting }] = useSubmitProcurementReportRequestMutation();
  const [printReportRequest, { isLoading: isPrinting }] = usePrintProcurementReportRequestMutation();

  const report = detailResponse?.data;
  const approvals = approvalsResponse?.data ?? [];

  const canSubmit = Boolean(report && report.status === 'draft' && currentUser && (report.createdBy === currentUser.userId || currentUser.roles.includes('system_admin')));

  const approvalColumns: ColumnsType<ProcurementApprovalRecord> = useMemo(
    () => [
      { title: '节点', dataIndex: 'approvalLevel', key: 'approvalLevel', width: 120 },
      { title: '动作', dataIndex: 'action', key: 'action', width: 120, render: (value: string) => labelFrom(approvalActionLabelMap, value, '其他操作') },
      { title: '审批人', dataIndex: 'approvedBy', key: 'approvedBy', width: 160 },
      { title: '审批时间', dataIndex: 'approvedAt', key: 'approvedAt', width: 180, render: (value: string) => new Date(value).toLocaleString('zh-CN') },
      { title: '意见', dataIndex: 'comment', key: 'comment', render: (value: string | null) => value || '-' },
      { title: '来源', dataIndex: 'source', key: 'source', width: 120, render: (value: string) => labelFrom(approvalSourceLabelMap, value, '其他来源') },
    ],
    [],
  );

  const handleSubmit = async () => {
    if (!id) {
      return;
    }

    await submitRequest(id).unwrap();
    messageApi.success('报表审批单已提交');
    await refetch();
  };

  const handlePrint = async () => {
    if (!id) {
      return;
    }

    const result = await printReportRequest(id).unwrap();
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
        <Typography.Title level={2}>报表审批单详情</Typography.Title>
        <Typography.Paragraph type="secondary">
          查看报表审批单、审批进度和汇总明细，并按需导出 PDF。
        </Typography.Paragraph>
        <Space wrap>
          <Button onClick={() => navigate('/procurement')}>返回采购首页</Button>
          <Button onClick={() => navigate('/procurement/report-approvals')}>进入报表审批页</Button>
          <Button loading={isPrinting} onClick={() => void handlePrint()}>
            导出 PDF
          </Button>
          {canSubmit ? (
            <Button type="primary" loading={isSubmitting} onClick={() => void handleSubmit()}>
              提交审批
            </Button>
          ) : null}
        </Space>
      </section>

      <section className="page-card-grid">
        <Card variant="borderless" className="placeholder-card" loading={isLoading}>
          {report ? (
            <Descriptions bordered column={1} size="small" title={report.reportNo}>
              <Descriptions.Item label="状态">
                <Tag color={statusColor[report.status]}>{labelFrom(statusLabelMap, report.status, '未知状态')}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="类型">{labelFrom(reportTypeLabelMap, report.reportType, '其他报表')}</Descriptions.Item>
              <Descriptions.Item label="周期">
                {report.periodMonth ? `${report.periodYear}-${String(report.periodMonth).padStart(2, '0')}` : report.periodYear}
              </Descriptions.Item>
              <Descriptions.Item label="部门">{labelFrom(departmentLabelMap, report.departmentCode, '未配置部门')}</Descriptions.Item>
              <Descriptions.Item label="提交时间">{report.submittedAt ? new Date(report.submittedAt).toLocaleString('zh-CN') : '-'}</Descriptions.Item>
              <Descriptions.Item label="终审时间">{report.finalApprovedAt ? new Date(report.finalApprovedAt).toLocaleString('zh-CN') : '-'}</Descriptions.Item>
              <Descriptions.Item label="审批通道">{labelFrom(approvalChannelLabelMap, report.approvalChannel, '审批通道')}</Descriptions.Item>
              <Descriptions.Item label="外部流程状态">{labelFrom(externalStatusLabelMap, report.externalStatus, '外部状态')}</Descriptions.Item>
            </Descriptions>
          ) : (
            <Alert type="warning" showIcon message="报表审批单不存在或无权限查看" />
          )}
        </Card>
      </section>

      {report ? (
        <section className="page-card-grid">
          <Card variant="borderless" className="placeholder-card" title="参数快照">
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{JSON.stringify(report.snapshotParams, null, 2)}</pre>
          </Card>
        </section>
      ) : null}

      {report ? (
        <section className="page-card-grid">
          <Card variant="borderless" className="placeholder-card" title="汇总快照">
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{JSON.stringify(report.snapshotSummary, null, 2)}</pre>
          </Card>
        </section>
      ) : null}

      <section className="page-card-grid">
        <Card variant="borderless" className="placeholder-card" title="审批轨迹">
          <ResponsiveTable rowKey="id" columns={approvalColumns} dataSource={approvals} pagination={false} />
        </Card>
      </section>
    </>
  );
}
