import {
  Alert,
  Button,
  Card,
  Form,
  InputNumber,
  List,
  Progress,
  Select,
  Space,
  Typography,
  message,
} from 'antd';
import { Link } from 'react-router-dom';
import { useAppSelector } from '../../app/hooks';
import { ResponsiveTable } from '../../components/ResponsiveTable';
import { formatShanghaiDateTime } from '../../utils/dateTime';
import {
  WorkbenchRecordDetail,
  useLazyGetWorkbenchAttachmentDownloadUrlQuery,
} from './workbenchApi';
import {
  useConfirmLearningMutation,
  useExportBusinessMutation,
  useLearningPeopleQuery,
  useLearningStatisticsQuery,
  usePublishLearningMutation,
} from './businessApi';
export const LEARNING_MODULES = [
  'goa_training',
  'shipping_training_hours',
  'shipping_case_study',
];
export const businessError = (error: unknown) => {
  const data = (error as { data?: { message?: string | string[] } })?.data;
  return Array.isArray(data?.message)
    ? data.message.join('；')
    : data?.message || '操作失败，请重试';
};
export function LearningPanel({ record }: { record: WorkbenchRecordDetail }) {
  const userId = useAppSelector((state) => state.auth.currentUser?.userId);
  const { data: people, isError } = useLearningPeopleQuery(undefined, {
    skip: !record.canManageLearning || Boolean(record.learning),
  });
  const [publish, publishing] = usePublishLearningMutation(),
    [confirm, confirming] = useConfirmLearningMutation(),
    [getUrl] = useLazyGetWorkbenchAttachmentDownloadUrlQuery();
  const [messages, context] = message.useMessage();
  const me = record.learning?.learners.find((p) => p.userId === userId);
  return (
    <Card size="small" title="个人学习进度">
      {context}
      {!record.learning ? (
        <>
          <Typography.Paragraph>
            先上传视频或文档，再选择实际参训成员下发。下发后，成员逐项确认学习，系统自动汇总进度与学时。
          </Typography.Paragraph>
          {record.canManageLearning ? (
            <Form
              key={record.id}
              layout="vertical"
              initialValues={{
                hours: Number(
                  record.payload.hours ?? record.payload.totalHours ?? 0,
                ),
              }}
              onFinish={async (values) => {
                try {
                  await publish({
                    recordId: record.id,
                    userIds: values.userIds,
                    hours: values.hours,
                  }).unwrap();
                  messages.success('学习已下发');
                } catch (error) {
                  messages.error(businessError(error));
                }
              }}
            >
              {isError && (
                <Alert type="error" message="成员加载失败，请重新打开记录" />
              )}
              <Form.Item
                name="userIds"
                label="参训成员"
                rules={[{ required: true, message: '请选择成员' }]}
              >
                <Select
                  mode="multiple"
                  showSearch
                  optionFilterProp="label"
                  options={people?.data.map((p) => ({
                    value: p.userId,
                    label: p.name,
                  }))}
                />
              </Form.Item>
              <Form.Item
                name="hours"
                label="每人完成学时"
                rules={[{ required: true }]}
              >
                <InputNumber min={0} max={1000} precision={3} />
              </Form.Item>
              <Button
                htmlType="submit"
                type="primary"
                loading={publishing.isLoading}
                disabled={isError}
              >
                下发学习
              </Button>
            </Form>
          ) : (
            <Alert type="info" message="尚未下发学习" />
          )}
        </>
      ) : (
        <Space direction="vertical" style={{ width: '100%' }}>
          <Typography.Text>
            完成 {record.learning.completedPeople} /{' '}
            {record.learning.totalPeople} 人；每人 {record.learning.hours} 学时
          </Typography.Text>
          <Progress percent={record.learning.completionRate} />
          <List
            dataSource={record.learning.materials}
            renderItem={(material) => (
              <List.Item>
                <Space wrap>
                  <Typography.Text>{material.title}</Typography.Text>
                  {material.fileId && (
                    <Button
                      onClick={async () => {
                        try {
                          const result = await getUrl({
                            recordId: record.id,
                            fileId: material.fileId!,
                          }).unwrap();
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
                      打开材料
                    </Button>
                  )}
                  {me && (
                    <Button
                      disabled={me.completedMaterialIds.includes(material.id)}
                      loading={confirming.isLoading}
                      onClick={async () => {
                        try {
                          await confirm({
                            recordId: record.id,
                            materialId: material.id,
                          }).unwrap();
                          messages.success('个人学习进度已更新');
                        } catch (error) {
                          messages.error(businessError(error));
                        }
                      }}
                    >
                      {me.completedMaterialIds.includes(material.id)
                        ? '已完成'
                        : '确认已学习'}
                    </Button>
                  )}
                </Space>
              </List.Item>
            )}
          />
          <ResponsiveTable
            rowKey="userId"
            dataSource={record.learning.learners}
            pagination={false}
            columns={[
              { title: '姓名', dataIndex: 'name' },
              {
                title: '进度',
                dataIndex: 'progressPercent',
                render: (value: number) => `${value}%`,
              },
              { title: '完成学时', dataIndex: 'completedHours' },
              {
                title: '完成时间',
                dataIndex: 'completedAt',
                render: (value: string | null) =>
                  value ? formatShanghaiDateTime(value) : '未完成',
              },
            ]}
          />
          <Typography.Text type="secondary">
            进度依据本人确认的学习材料计算；不代表视频播放时长。
          </Typography.Text>
        </Space>
      )}
    </Card>
  );
}
export function LearningStatisticsPanel() {
  const { data, isLoading, isError, refetch } = useLearningStatisticsQuery();
  const [exportReport, exporting] = useExportBusinessMutation();
  const [messages, context] = message.useMessage();
  return (
    <Card title="个人学习与学时统计">
      {context}
      {isError ? (
        <Alert
          type="error"
          message="学习统计加载失败"
          action={<Button onClick={() => void refetch()}>重试</Button>}
        />
      ) : (
        <Space direction="vertical" style={{ width: '100%' }}>
          <Button
            loading={exporting.isLoading}
            onClick={async () => {
              try {
                const result = await exportReport({
                  kind: 'learning',
                }).unwrap();
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
            导出学习统计
          </Button>
          <ResponsiveTable
            loading={isLoading}
            rowKey="userId"
            dataSource={data?.data.people ?? []}
            columns={[
              { title: '姓名', dataIndex: 'name' },
              { title: '已分配', dataIndex: 'assigned' },
              { title: '已完成', dataIndex: 'completed' },
              {
                title: '完成率',
                dataIndex: 'completionRate',
                render: (value: number) => `${value}%`,
              },
              { title: '完成学时', dataIndex: 'completedHours' },
            ]}
          />
          <List
            dataSource={data?.data.courses ?? []}
            renderItem={(course) => (
              <List.Item>
                <Link to={`/workbench/records/${course.recordId}`}>
                  {course.title}
                </Link>
                <span>
                  {course.publishedAt
                    ? `${course.completedPeople}/${course.totalPeople} 人完成`
                    : '待下发'}
                </span>
              </List.Item>
            )}
          />
        </Space>
      )}
    </Card>
  );
}
