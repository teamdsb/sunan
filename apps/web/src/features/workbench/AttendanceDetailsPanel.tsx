import { Alert, Button, Space, Typography, message } from 'antd';
import { useEffect, useState } from 'react';
import { ResponsiveTable } from '../../components/ResponsiveTable';
import { WorkbenchAttendanceStatistics } from './workbenchApi';
import {
  useExportAttendanceMutation,
  useExportJobQuery,
  useLazyExportDownloadQuery,
  useRetryExportMutation,
} from './businessApi';
import { businessError } from './LearningPanel';
export function AttendanceDetailsPanel({
  report,
  month,
  departmentCode,
}: {
  report?: WorkbenchAttendanceStatistics;
  month: string;
  departmentCode?: string;
}) {
  const [jobId, setJobId] = useState('');
  const [polling, setPolling] = useState(0);
  const [exportReport, exporting] = useExportAttendanceMutation(),
    [download] = useLazyExportDownloadQuery(),
    [retry, retrying] = useRetryExportMutation();
  const [messages, context] = message.useMessage();
  const job = useExportJobQuery(jobId, {
    skip: !jobId,
    pollingInterval: polling,
  });
  useEffect(() => {
    if (['succeeded', 'failed'].includes(job.data?.data.status ?? ''))
      setPolling(0);
  }, [job.data?.data.status]);
  const start = async (exportFormat: 'xlsx' | 'pdf') => {
    try {
      const result = await exportReport({
        month,
        departmentCode,
        exportFormat,
      }).unwrap();
      setJobId(result.data.exportJobId);
      setPolling(2000);
    } catch (error) {
      messages.error(businessError(error));
    }
  };
  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      {context}
      {report?.canExport && (
        <Space wrap>
          <Button
            loading={exporting.isLoading}
            onClick={() => void start('xlsx')}
          >
            导出 Excel 明细
          </Button>
          <Button
            loading={exporting.isLoading}
            onClick={() => void start('pdf')}
          >
            导出 PDF
          </Button>
        </Space>
      )}
      {jobId &&
        (job.isError ? (
          <Alert
            type="error"
            message="导出状态获取失败"
            action={<Button onClick={() => void job.refetch()}>重试</Button>}
          />
        ) : job.data?.data.status === 'succeeded' ? (
          <Button
            type="primary"
            onClick={async () => {
              try {
                const result = await download(jobId).unwrap();
                window.open(
                  result.data.downloadUrl,
                  '_blank',
                  'noopener,noreferrer',
                );
              } catch (error) {
                messages.error(businessError(error));
              }
            }}
          >
            下载考勤报表
          </Button>
        ) : job.data?.data.status === 'failed' ? (
          <Alert
            type="error"
            message={job.data.data.failureMessage || '导出失败'}
            action={
              <Button
                loading={retrying.isLoading}
                onClick={async () => {
                  try {
                    await retry(jobId).unwrap();
                    setPolling(2000);
                    await job.refetch();
                  } catch (error) {
                    messages.error(businessError(error));
                  }
                }}
              >
                重新生成
              </Button>
            }
          />
        ) : (
          <Typography.Text>正在生成考勤报表…</Typography.Text>
        ))}
      <Typography.Title level={5}>人员汇总</Typography.Title>
      <Typography.Text type="secondary">
        缺少工时的记录显示“未登记”；同部门同名历史记录按姓名合并，请通过明细核对。
      </Typography.Text>
      <ResponsiveTable
        rowKey="personKey"
        dataSource={report?.people ?? []}
        columns={[
          { title: '姓名', dataIndex: 'personName' },
          { title: '部门', dataIndex: 'departmentName' },
          { title: '出勤天数', dataIndex: 'days' },
          { title: '已登记工时', dataIndex: 'workHours' },
          { title: '未登记工时记录', dataIndex: 'missingHours' },
        ]}
      />
      <Typography.Title level={5}>考勤明细</Typography.Title>
      <ResponsiveTable
        rowKey={(row) => `${row.recordId}:${row.personKey}`}
        dataSource={report?.details ?? []}
        columns={[
          { title: '姓名', dataIndex: 'personName' },
          { title: '时间（上海）', dataIndex: 'occurredAt' },
          { title: '船舶', dataIndex: 'vesselName' },
          {
            title: '时段',
            dataIndex: 'period',
            render: (value: string) => (value === 'am' ? '上午' : '下午'),
          },
          {
            title: '工时',
            dataIndex: 'workHours',
            render: (value: number | null) => value ?? '未登记',
          },
          { title: '状态', dataIndex: 'statusName' },
          { title: '记录编号', dataIndex: 'recordNo' },
        ]}
      />
    </Space>
  );
}
