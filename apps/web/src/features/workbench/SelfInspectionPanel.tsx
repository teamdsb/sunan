import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Select,
  Space,
  Typography,
  message,
} from 'antd';
import { useState } from 'react';
import { FileAttachmentList } from '../files/FileAttachmentList';
import { FileUploadField } from '../files/FileUploadField';
import { formatShanghaiDateTime } from '../../utils/dateTime';
import {
  WorkbenchRecordDetail,
  WorkbenchRecordActionPayload,
  useGetInspectionPeopleQuery,
  usePerformWorkbenchRecordActionMutation,
  useUploadWorkbenchRecordAttachmentMutation,
  useLazyGetWorkbenchAttachmentDownloadUrlQuery,
} from './workbenchApi';

export function InspectionPeopleFields() {
  const { data, isLoading, isError } = useGetInspectionPeopleQuery();
  const people = data?.data ?? [];
  return (
    <>
      {isError && <Alert type="error" message="人员加载失败，请关闭后重试" />}
      <Form.Item
        name="assigneeUserId"
        label="执行人"
        rules={[{ required: true, message: '请选择执行人' }]}
      >
        <Select
          showSearch
          optionFilterProp="label"
          loading={isLoading}
          placeholder="选择执行检查和整改的人"
          options={people
            .filter((person) => person.canExecute)
            .map((person) => ({ value: person.userId, label: person.name }))}
        />
      </Form.Item>
      <Form.Item
        name="reviewerUserId"
        label="审核人"
        dependencies={['assigneeUserId']}
        rules={[
          { required: true, message: '请选择审核人' },
          ({ getFieldValue }) => ({
            validator(_, value) {
              return value && value === getFieldValue('assigneeUserId')
                ? Promise.reject(new Error('审核人与执行人必须不同'))
                : Promise.resolve();
            },
          }),
        ]}
      >
        <Select
          showSearch
          optionFilterProp="label"
          loading={isLoading}
          placeholder="选择独立审核人"
          options={people
            .filter((person) => person.canReview)
            .map((person) => ({ value: person.userId, label: person.name }))}
        />
      </Form.Item>
      <Typography.Paragraph type="secondary">
        人员首次登录企业微信应用后出现在名单中。下发后，执行人可在船舶自查记录中找到任务。
      </Typography.Paragraph>
    </>
  );
}

const errorMessage = (error: unknown) => {
  const body = (
    error as { data?: { message?: string; error?: { message?: string } } }
  )?.data;
  return body?.error?.message ?? body?.message ?? '操作失败，请刷新记录后重试';
};

export function SelfInspectionPanel({
  record,
}: {
  record: WorkbenchRecordDetail;
}) {
  const [action, { isLoading }] = usePerformWorkbenchRecordActionMutation();
  const [upload, { isLoading: uploading }] =
    useUploadWorkbenchRecordAttachmentMutation();
  const [getUrl] = useLazyGetWorkbenchAttachmentDownloadUrlQuery();
  const [messageApi, context] = message.useMessage();
  const [form] = Form.useForm();
  const [assignOpen, setAssignOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [result, setResult] = useState<string>();
  const allowed = new Set(record.availableActions ?? []);
  const current = record.steps.find((step) => step.status !== 'completed');
  const submit = async (data: WorkbenchRecordActionPayload) => {
    if (!['start'].includes(data.actionType) && !comment.trim()) {
      messageApi.warning('请填写操作说明');
      return;
    }
    try {
      await action({
        recordId: record.id,
        data: { ...data, comment },
      }).unwrap();
      setComment('');
      setResult(undefined);
      setAssignOpen(false);
      messageApi.success('记录已更新');
    } catch (error) {
      messageApi.error(errorMessage(error));
    }
  };
  return (
    <Card title="自查与整改" size="small">
      {context}
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {!record.assigneeUserId || !record.reviewerUserId ? (
          <Alert
            type="warning"
            message="这条记录尚未明确分工，请由下发人重新分配后执行。"
          />
        ) : (
          <Typography.Text>
            执行人：{record.assigneeName ?? record.assigneeUserId}　审核人：
            {record.reviewerName ?? record.reviewerUserId}
          </Typography.Text>
        )}
        {record.steps.map((step) => (
          <div key={step.stepCode}>
            <Typography.Text strong>{step.stepName}</Typography.Text>
            <Typography.Paragraph>
              {String(
                step.stepPayload?.comment ??
                  step.stepPayload?.returnReason ??
                  '尚无执行记录',
              )}
            </Typography.Paragraph>
            {step.completedAt && (
              <Typography.Text type="secondary">
                {step.completedBy === record.assigneeUserId
                  ? (record.assigneeName ?? step.completedBy)
                  : (record.reviewerName ?? step.completedBy)}{' '}
                · {formatShanghaiDateTime(step.completedAt)}
              </Typography.Text>
            )}
          </div>
        ))}
        {allowed.has('assign') && (
          <Button onClick={() => setAssignOpen((value) => !value)}>
            重新分配
          </Button>
        )}
        {assignOpen && (
          <Form
            form={form}
            layout="vertical"
            initialValues={{
              assigneeUserId: record.assigneeUserId,
              reviewerUserId: record.reviewerUserId,
            }}
          >
            <Alert
              type="warning"
              message="重新分配会重新开始本次检查，原操作日志和照片保留。"
              style={{ marginBottom: 12 }}
            />
            <InspectionPeopleFields />
            <Button
              loading={isLoading}
              onClick={async () => {
                const values = await form.validateFields();
                await submit({ actionType: 'assign', payload: values });
              }}
            >
              确认分配
            </Button>
          </Form>
        )}
        {allowed.has('complete_step') &&
          current?.stepCode === 'on_site_inspection' && (
            <Select
              aria-label="检查结果"
              value={result}
              placeholder="选择检查结果"
              style={{ width: '100%' }}
              onChange={setResult}
              options={[
                { value: 'conforming', label: '检查合格，无需整改' },
                { value: 'nonconforming', label: '发现问题，需要整改' },
              ]}
            />
          )}
        {allowed.has('upload_attachment') && (
          <div>
            <Typography.Paragraph strong>
              {current?.stepCode === 'on_site_inspection'
                ? '上传整改前照片'
                : '上传本轮整改后照片'}
            </Typography.Paragraph>
            <FileUploadField
              key={`${record.id}-${record.status}-${current?.stepCode}`}
              category="workbench-attachments"
              onChange={async (file) => {
                if (!file) return;
                try {
                  await upload({
                    recordId: record.id,
                    data: {
                      fileId: file.id,
                      category:
                        current?.stepCode === 'on_site_inspection'
                          ? 'before_rectification'
                          : 'after_rectification',
                      stepCode: current?.stepCode,
                    },
                  }).unwrap();
                  messageApi.success('照片已关联');
                } catch (error) {
                  messageApi.error(errorMessage(error));
                }
              }}
            />
            <Typography.Text type="secondary">
              使用 JPEG 或
              PNG。发现问题后必须提交整改前、后照片；退回后须上传新的整改后照片。
            </Typography.Text>
          </div>
        )}
        {['before_rectification', 'after_rectification'].map((category) => (
          <div key={category}>
            <Typography.Text strong>
              {category === 'before_rectification'
                ? '整改前证据'
                : '整改后证据'}
            </Typography.Text>
            <FileAttachmentList
              files={record.attachments
                .filter((item) => item.category === category)
                .map((item) => ({
                  id: item.fileId,
                  fileName: item.fileName,
                  mimeType: item.mimeType,
                  fileSize: item.fileSize,
                }))}
              getUrl={async (file) =>
                (
                  await getUrl({
                    recordId: record.id,
                    fileId: file.id,
                  }).unwrap()
                ).data.downloadUrl
              }
            />
          </div>
        ))}
        {allowed.size > 0 && (
          <Input.TextArea
            aria-label="检查整改审核说明"
            placeholder="填写检查结果、整改措施或审核意见"
            maxLength={2000}
            rows={3}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
          />
        )}
        <Space wrap>
          {allowed.has('start') && (
            <Button
              type="primary"
              loading={isLoading}
              onClick={() => void submit({ actionType: 'start' })}
            >
              开始检查
            </Button>
          )}
          {allowed.has('complete_step') && (
            <Button
              type="primary"
              loading={isLoading || uploading}
              onClick={() => {
                if (current?.stepCode === 'on_site_inspection' && !result) {
                  messageApi.warning('请选择检查结果');
                  return;
                }
                void submit({
                  actionType: 'complete_step',
                  payload: { stepCode: current?.stepCode, checkResult: result },
                });
              }}
            >
              {current?.stepCode === 'on_site_inspection'
                ? '提交检查结果'
                : '提交整改审核'}
            </Button>
          )}
          {allowed.has('request_rework') && (
            <Button
              loading={isLoading}
              onClick={() => void submit({ actionType: 'request_rework' })}
            >
              退回整改
            </Button>
          )}
          {allowed.has('close_record') && (
            <Button
              type="primary"
              loading={isLoading}
              onClick={() => void submit({ actionType: 'close_record' })}
            >
              审核通过并关闭
            </Button>
          )}
          {allowed.has('void') && (
            <Button
              danger
              loading={isLoading}
              onClick={() => void submit({ actionType: 'void' })}
            >
              作废任务
            </Button>
          )}
        </Space>
        {record.status === 'closed' && (
          <Alert
            type="success"
            message="已审核关闭，记录与证据只读，可生成完整打印件。"
          />
        )}
      </Space>
    </Card>
  );
}
