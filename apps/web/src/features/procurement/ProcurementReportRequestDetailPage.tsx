import {
  Alert,
  Button,
  Card,
  Space,
  Steps,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppSelector } from '../../app/hooks';
import { ResponsiveTable } from '../../components/ResponsiveTable';
import { FilePreviewModal } from '../files/FilePreviewModal';
import { downloadFileFromUrl } from '../files/fileDownload';
import {
  ProcurementApprovalRecord,
  ProcurementReportRequestStatus,
  useGetProcurementReportApprovalsQuery,
  useGetProcurementReportRequestQuery,
  usePrintProcurementReportRequestMutation,
  useSubmitProcurementReportRequestMutation,
} from './procurementApi';
import {
  formatProcurementCurrency,
  formatProcurementReportPeriod,
  formatProcurementReportTitle,
  getProcurementReportApprovalProgress,
  normalizeProcurementReportSnapshot,
  procurementDepartmentLabels,
  type ProcurementReportSummaryRow,
} from './procurementReportPresentation';

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
  submitted: '待部门审批',
  dept_approved: '待财务审批',
  finance_approved: '待总经办终审',
  final_approved: '终审通过',
  rejected: '已驳回',
};

const approvalChannelLabelMap: Record<string, string> = {
  internal: '系统内审批',
  wecom_native: '企业微信审批',
};

const approvalLevelLabelMap: Record<string, string> = {
  dept: '部门审批',
  finance: '财务审批',
  final: '总经办终审',
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

export function ProcurementReportRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();

  const currentUser = useAppSelector((state) => state.auth.currentUser);
  const {
    data: detailResponse,
    isLoading,
    refetch,
  } = useGetProcurementReportRequestQuery(id ?? '', { skip: !id });
  const {
    data: approvalsResponse,
    isError: approvalsError,
  } = useGetProcurementReportApprovalsQuery(id ?? '', { skip: !id });
  const [submitRequest, { isLoading: isSubmitting }] =
    useSubmitProcurementReportRequestMutation();
  const [printReportRequest] = usePrintProcurementReportRequestMutation();
  const [pdfAction, setPdfAction] = useState<'preview' | 'download' | null>(
    null,
  );
  const [pdfPreview, setPdfPreview] = useState<{
    fileName: string;
    downloadUrl: string;
  } | null>(null);

  const report = detailResponse?.data;
  const approvals = useMemo(
    () => approvalsResponse?.data ?? [],
    [approvalsResponse?.data],
  );
  const snapshot = useMemo(
    () => (report ? normalizeProcurementReportSnapshot(report) : null),
    [report],
  );
  const approvalProgress = report
    ? getProcurementReportApprovalProgress(report.status, approvals)
    : null;
  const summaryRows = useMemo<ProcurementReportSummaryRow[]>(() => {
    if (!snapshot) {
      return [];
    }

    if (!snapshot.rows.length) {
      return [];
    }

    return [
      ...snapshot.rows,
      {
        key: 'snapshot-total',
        label: '合计',
        orderCount: snapshot.totalOrderCount,
        amount: snapshot.totalAmount,
        isTotal: true,
      },
    ];
  }, [snapshot]);

  const canSubmit = Boolean(
    report &&
    report.status === 'draft' &&
    currentUser &&
    (report.createdBy === currentUser.userId ||
      currentUser.roles.includes('system_admin')),
  );

  const approvalColumns: ColumnsType<ProcurementApprovalRecord> = useMemo(
    () => [
      {
        title: '审批节点',
        dataIndex: 'approvalLevel',
        key: 'approvalLevel',
        width: 140,
        render: (value: string) =>
          labelFrom(approvalLevelLabelMap, value, '其他节点'),
      },
      {
        title: '动作',
        dataIndex: 'action',
        key: 'action',
        width: 110,
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
        title: '审批时间',
        dataIndex: 'approvedAt',
        key: 'approvedAt',
        width: 180,
        render: (value: string) => new Date(value).toLocaleString('zh-CN'),
      },
      {
        title: '审批意见',
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

  const summaryColumns: ColumnsType<ProcurementReportSummaryRow> = useMemo(
    () => [
      {
        title: '汇总维度',
        dataIndex: 'label',
        key: 'label',
        render: (value: string, row) =>
          row.isTotal ? <strong>{value}</strong> : value,
      },
      {
        title: '采购单数',
        dataIndex: 'orderCount',
        key: 'orderCount',
        width: 140,
        render: (value: number | null, row) => {
          const content = value ?? '-';
          return row.isTotal ? <strong>{content}</strong> : content;
        },
      },
      {
        title: '采购金额',
        dataIndex: 'amount',
        key: 'amount',
        width: 180,
        align: 'right',
        render: (value: number | null, row) => {
          const content = formatProcurementCurrency(value);
          return row.isTotal ? <strong>{content}</strong> : content;
        },
      },
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

  const handlePrint = async (mode: 'preview' | 'download') => {
    if (!id) {
      return;
    }

    setPdfAction(mode);
    try {
      const result = await printReportRequest(id).unwrap();
      const fileName = `${report?.reportNo ?? '报表审批单'}.pdf`;
      if (mode === 'preview') {
        setPdfPreview({ fileName, downloadUrl: result.data.downloadUrl });
        messageApi.success('PDF 已生成并打开预览');
      } else {
        await downloadFileFromUrl(result.data.downloadUrl, fileName);
        messageApi.success('PDF 已生成并开始下载');
      }
    } catch (error) {
      messageApi.error(
        error instanceof Error ? error.message : 'PDF 生成失败，请稍后重试',
      );
    } finally {
      setPdfAction(null);
    }
  };

  if (!id) {
    return null;
  }

  const reportTitle = report
    ? formatProcurementReportTitle(report)
    : '报表审批单详情';
  const departmentName = report?.departmentCode
    ? procurementDepartmentLabels[report.departmentCode]
    : '全部部门';

  return (
    <>
      {contextHolder}
      <section className="page-hero procurement-report-detail-hero">
        <div className="procurement-report-detail-heading">
          <div>
            <Typography.Title level={2}>{reportTitle}</Typography.Title>
            <Typography.Paragraph type="secondary">
              {report
                ? `${report.reportNo} · ${departmentName} · 生成时数据快照`
                : '查看报表审批单、审批进度和汇总明细，并按需导出 PDF。'}
            </Typography.Paragraph>
          </div>
          <Space wrap className="procurement-report-detail-actions">
            <Button onClick={() => navigate('/procurement')}>
              返回采购首页
            </Button>
            <Button
              onClick={() => navigate('/procurement/report-approvals')}
            >
              进入报表审批页
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
            {canSubmit ? (
              <Button
                type="primary"
                loading={isSubmitting}
                onClick={() => void handleSubmit()}
              >
                提交审批
              </Button>
            ) : null}
          </Space>
        </div>
      </section>

      <section className="page-card-grid">
        <Card
          variant="borderless"
          className="placeholder-card procurement-report-overview-card"
          loading={isLoading}
        >
          {report && snapshot ? (
            <>
              <div className="procurement-report-status-strip">
                <div>
                  <span>审批状态</span>
                  <Tag
                    color={
                      approvalProgress?.displayStatus?.color ??
                      statusColor[report.status]
                    }
                  >
                    {approvalProgress?.displayStatus?.label ??
                      statusLabelMap[report.status]}
                  </Tag>
                </div>
                <div>
                  <span>统计周期</span>
                  <strong>
                    {formatProcurementReportPeriod(
                      report.periodYear,
                      report.periodMonth,
                    )}
                  </strong>
                </div>
                <div>
                  <span>所属部门</span>
                  <strong>{departmentName}</strong>
                </div>
                <div>
                  <span>审批通道</span>
                  <strong>
                    {labelFrom(
                      approvalChannelLabelMap,
                      report.approvalChannel,
                      '其他通道',
                    )}
                  </strong>
                </div>
                {report.externalStatus ? (
                  <div>
                    <span>外部流程</span>
                    <strong>
                      {labelFrom(
                        externalStatusLabelMap,
                        report.externalStatus,
                        '外部状态',
                      )}
                    </strong>
                  </div>
                ) : null}
              </div>

              <div className="procurement-report-kpi-grid">
                <div className="procurement-report-kpi">
                  <span>采购总额</span>
                  <strong>
                    {formatProcurementCurrency(snapshot.totalAmount)}
                  </strong>
                  <small>审批单创建时汇总</small>
                </div>
                <div className="procurement-report-kpi">
                  <span>采购单数</span>
                  <strong>{snapshot.totalOrderCount ?? '-'}</strong>
                  <small>纳入当前统计口径</small>
                </div>
                <div className="procurement-report-kpi">
                  <span>汇总维度</span>
                  <strong>{snapshot.dimensionCount}</strong>
                  <small>按快照明细统计</small>
                </div>
              </div>
            </>
          ) : (
            <Alert
              type="warning"
              showIcon
              message="报表审批单不存在或无权限查看"
            />
          )}
        </Card>
      </section>

      {report && snapshot ? (
        <section className="page-card-grid procurement-report-content-grid">
          <Card
            variant="borderless"
            className="placeholder-card procurement-report-parameter-card"
            title="统计条件"
            extra="参数快照"
          >
            <div className="procurement-report-parameter-grid">
              {snapshot.parameters.map((parameter) => (
                <div
                  className="procurement-report-parameter"
                  key={parameter.key}
                >
                  <span>{parameter.label}</span>
                  <strong>{parameter.value}</strong>
                </div>
              ))}
            </div>
            {snapshot.extraParameters.length ? (
              <div className="procurement-report-extra-parameters">
                <Typography.Text strong>其他参数</Typography.Text>
                <dl>
                  {snapshot.extraParameters.map((parameter) => (
                    <div key={parameter.key}>
                      <dt>{parameter.label}</dt>
                      <dd>{parameter.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}
          </Card>

          <Card
            variant="borderless"
            className="placeholder-card procurement-report-summary-card"
            title="汇总明细"
            extra={`${snapshot.dimensionCount} 个维度`}
          >
            <ResponsiveTable
              rowKey="key"
              columns={summaryColumns}
              dataSource={summaryRows}
              pagination={false}
              rowClassName={(row) =>
                row.isTotal ? 'procurement-report-summary-total' : ''
              }
              locale={{ emptyText: '当前快照没有汇总明细' }}
            />
          </Card>
        </section>
      ) : null}

      {report ? (
        <section className="page-card-grid">
          <Card
            variant="borderless"
            className="placeholder-card procurement-report-progress-card"
            title="审批进度"
          >
            <Steps
              size="small"
              current={approvalProgress?.current ?? 0}
              status={approvalProgress?.stepsStatus ?? 'process'}
              items={[
                { title: '创建' },
                { title: '部门审批' },
                { title: '财务审批' },
                { title: '总经办终审' },
              ].map((item, index) => ({
                ...item,
                description:
                  approvalProgress?.current === index
                    ? approvalProgress.activeDescription
                    : undefined,
              }))}
            />
          </Card>
        </section>
      ) : null}

      <section className="page-card-grid">
        <Card
          variant="borderless"
          className="placeholder-card procurement-report-approval-card"
          title="审批记录"
          extra="按时间正序"
        >
          {approvalsError ? (
            <Alert
              type="error"
              showIcon
              message="审批记录加载失败，请稍后刷新"
            />
          ) : (
            <ResponsiveTable
              rowKey="id"
              columns={approvalColumns}
              dataSource={approvals}
              pagination={false}
              locale={{ emptyText: '尚无审批记录' }}
            />
          )}
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
