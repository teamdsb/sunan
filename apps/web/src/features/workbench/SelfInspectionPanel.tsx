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
        人员首次登录企业微信应用后出现在名单中。下发后，执行人打开企业微信「船舶自查」即可找到任务。
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
  const reviewing = allowed.has('close_record');
  const executing = allowed.has('complete_step');
  const commentLabel = reviewing
    ? '审核意见'
    : current?.stepCode === 'rectification'
      ? '整改说明'
      : '检查说明';
  const returnedAt = record.steps.find(
    (step) => step.stepCode === 'rectification',
  )?.stepPayload?.returnedAt;
  const evidenceFiles = (category: string) =>
    record.attachments.filter(
      (item) =>
        item.category === category &&
        (category !== 'after_rectification' ||
          !returnedAt ||
          new Date(item.uploadedAt).getTime() >=
            new Date(String(returnedAt)).getTime()),
    );
  const returnReason = record.steps
    .map((step) => step.stepPayload?.returnReason)
    .find(Boolean);
  const stageMessage = allowed.has('start')
    ? '轮到你检查：阅读要求后，点击开始检查。'
    : executing
      ? current?.stepCode === 'rectification'
        ? '轮到你整改：填写处理措施，上传本轮整改后的照片，再提交审核。'
        : '轮到你检查：选择检查结果。发现问题时，说明问题并上传现场照片。'
      : reviewing
        ? '轮到你审核：对照检查与整改证据，决定通过或退回补充。'
        : record.status === 'pending_review'
          ? `已提交，等待 ${record.reviewerName ?? '指定审核人'} 复核。`
          : record.status === 'closed'
            ? '任务已完成。可回看执行过程与打印记录。'
            : record.status === 'voided'
              ? '任务已作废，无需继续操作。'
              : `等待 ${record.assigneeName ?? '执行人'} 检查整改。`;
  const submit = async (data: WorkbenchRecordActionPayload) => {
    if (!['start'].includes(data.actionType) && !comment.trim()) {
      messageApi.warning(`请填写${commentLabel}`);
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
      messageApi.success(
        data.actionType === 'request_rework'
          ? '已退回，等待执行人补充整改。'
          : data.actionType === 'close_record'
            ? '审核通过，任务已完成。'
            : '已保存，请按当前提示继续。',
      );
    } catch (error) {
      messageApi.error(errorMessage(error));
    }
  };
  return (
    <Card title="自查与整改" size="small">
      {context}
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Alert
          type={reviewing ? 'info' : 'success'}
          showIcon
          message={stageMessage}
        />
        {Boolean(returnReason) &&
          !['closed', 'voided'].includes(record.status) && (
            <Alert
              type="warning"
              showIcon
              message="退回要求"
              description={String(returnReason)}
            />
          )}
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
              extensions={['jpg', 'jpeg', 'png']}
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
        {['before_rectification', 'after_rectification'].map(
          (category) =>
            evidenceFiles(category).length > 0 && (
              <div key={category}>
                <Typography.Text strong>
                  {category === 'before_rectification'
                    ? '整改前证据'
                    : '整改后证据'}
                </Typography.Text>
                <FileAttachmentList
                  files={evidenceFiles(category).map((item) => ({
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
            ),
        )}
        {reviewing && (
          <div>
            <Typography.Paragraph>
              <strong>检查发现：</strong>
              {String(record.steps[0]?.stepPayload?.comment ?? '见检查记录')}
            </Typography.Paragraph>
            <Typography.Paragraph>
              <strong>本轮整改：</strong>
              {String(record.steps[1]?.stepPayload?.comment ?? '见整改记录')}
            </Typography.Paragraph>
          </div>
        )}
        {(executing || reviewing) && (
          <Input.TextArea
            aria-label={commentLabel}
            placeholder={
              reviewing
                ? '说明是否合格；退回时写清需要补充什么'
                : current?.stepCode === 'rectification'
                  ? '具体修复了什么，结果如何'
                  : '说明检查发现的问题或合格情况'
            }
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
        </Space>
        <details className="inspection-history">
          <summary>查看检查、整改与审核记录</summary>
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
        </details>
        {(allowed.has('assign') || allowed.has('void')) && (
          <details className="inspection-history">
            <summary>任务管理：重新分配 / 作废</summary>
            <Input.TextArea
              aria-label="任务调整原因"
              placeholder="请说明重新分配或作废的原因"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />
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
            {allowed.has('void') && (
              <Button
                danger
                loading={isLoading}
                onClick={() => void submit({ actionType: 'void' })}
              >
                作废任务
              </Button>
            )}
          </details>
        )}
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
