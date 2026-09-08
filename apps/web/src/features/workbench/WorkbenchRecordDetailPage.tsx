import { Navigate, useLocation, useParams } from 'react-router-dom';
import { Alert, Button, Space, Typography } from 'antd';
import { useState } from 'react';
import { workbenchRouteConfig } from '../../router/workbenchRouteConfig';
import { WorkbenchHomePage } from './WorkbenchHomePage';
import { SelfInspectionPanel } from './SelfInspectionPanel';
import {
  useGetWorkbenchRecordQuery,
  useLazyGetWorkbenchPrintSnapshotQuery,
} from './workbenchApi';
import { FilePreviewModal } from '../files/FilePreviewModal';
import { formatShanghaiDateTime } from '../../utils/dateTime';

export function WorkbenchRecordDetailPage() {
  const { recordId } = useParams<{ recordId: string }>();
  const location = useLocation();
  const query = useGetWorkbenchRecordQuery(recordId ?? '', { skip: !recordId });
  const [print, { isFetching: printing }] =
    useLazyGetWorkbenchPrintSnapshotQuery();
  const [pdfUrl, setPdfUrl] = useState<string>();
  const [printError, setPrintError] = useState<string>();
  if (!recordId)
    return <Navigate to={workbenchRouteConfig.home.path} replace />;
  if (query.isError)
    return (
      <Alert
        type="error"
        message="无法打开任务，请确认账号有权限或重试。"
        action={<Button onClick={() => void query.refetch()}>重试</Button>}
      />
    );
  const record = query.data?.data;
  if (!record) return <p role="status">正在加载任务…</p>;
  if (record.moduleCode !== 'shipping_self_inspection')
    return (
      <WorkbenchHomePage
        routeAware
        initialRecordId={recordId}
        heroTitle="记录详情"
      />
    );
  if (!location.pathname.startsWith('/workbench/self-inspection/'))
    return (
      <Navigate to={`/workbench/self-inspection/records/${recordId}`} replace />
    );
  const generate = async (paperSize: 'A4' | 'A3') => {
    setPrintError(undefined);
    try {
      const result = await print({ recordId, paperSize }).unwrap();
      if (!result.data.downloadUrl) throw new Error('未返回打印文件');
      setPdfUrl(result.data.downloadUrl);
    } catch {
      setPrintError('打印文件生成失败，请重试。');
    }
  };
  return (
    <main className="self-inspection-detail">
      <Typography.Text type="secondary">
        船舶自查 · {String(record.payload.vesselName ?? '检查任务')}
      </Typography.Text>
      <Typography.Title level={2}>{record.title}</Typography.Title>
      <Typography.Paragraph>{record.summary}</Typography.Paragraph>
      <Typography.Paragraph type="secondary">
        检查范围：{String(record.payload.inspectionScope ?? '见检查要求')}
        <br />
        完成期限：
        {formatShanghaiDateTime(String(record.payload.deadline ?? ''))}
      </Typography.Paragraph>
      <SelfInspectionPanel key={record.id} record={record} />
      {record.status === 'closed' && (
        <section className="inspection-print">
          <Typography.Title level={4}>已审核的自查记录</Typography.Title>
          <Space wrap>
            <Button loading={printing} onClick={() => void generate('A4')}>
              查看 A4 打印件
            </Button>
            <Button loading={printing} onClick={() => void generate('A3')}>
              查看 A3 打印件
            </Button>
          </Space>
          {printError && <Alert type="error" message={printError} />}
        </section>
      )}
      <FilePreviewModal
        open={Boolean(pdfUrl)}
        file={{
          fileName: `${record.title}.pdf`,
          mimeType: 'application/pdf',
          fileSize: 0,
        }}
        getUrl={async () => pdfUrl!}
        onClose={() => setPdfUrl(undefined)}
      />
    </main>
  );
}
