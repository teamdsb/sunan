import { Alert, Button, Card, DatePicker, Form, Input, InputNumber, Segmented, Select, Space, Switch, Typography, message } from 'antd';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { useAppSelector } from '../../app/hooks';
import { canManageCompanyContent } from '../auth/permissions';
import { FileUploadField } from '../files/FileUploadField';
import { FileAttachmentList } from '../files/FileAttachmentList';
import { formatShanghaiDateTime, toShanghaiDateTimeLocal, toShanghaiIso } from '../../utils/dateTime';
import type { FileRecord } from '../files/types';
import {
  type CertificateItem,
  useBindCertificateFilesMutation,
  useGetCertificateByIdQuery,
  useGetCertificateReminderRecipientsQuery,
  useGetCertificateOwnersQuery,
  useGetCertificateTypesQuery,
  useLazyGetCertificateFileDownloadUrlQuery,
  useUpdateCertificateMutation,
} from './certificateApi';

const ownerTabs = [
  { label: '船舶', value: 'vessel' },
  { label: '车辆', value: 'vehicle' },
  { label: '人员', value: 'personnel' },
  { label: '设备', value: 'equipment' },
] as const;

type CertificateFormValues = {
  certificateTypeId: string;
  ownerType: CertificateItem['ownerType'];
  ownerId: string;
  certificateNo?: string;
  title: string;
  issueDate?: string;
  expiryDate: string;
  advanceDays?: number;
  issuer?: string;
  status: CertificateItem['status'];
  remarks?: string;
  reminderEnabled: boolean;
  reminderRecipientUserId?: string | null;
};

export function CertificateDetailPage() {
  const { id = '' } = useParams();
  const roles = useAppSelector((state) => state.auth.currentUser?.roles ?? []);
  const canManage = canManageCompanyContent(roles);
  const { data, isLoading } = useGetCertificateByIdQuery(id, { skip: !id });
  const [updateCertificate, { isLoading: saving }] = useUpdateCertificateMutation();
  const [bindFiles] = useBindCertificateFilesMutation();
  const [getFileDownloadUrl] = useLazyGetCertificateFileDownloadUrlQuery();
  const [upload, setUpload] = useState<FileRecord | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm<CertificateFormValues>();
  const item = data?.data;
  const ownerType = Form.useWatch('ownerType', form) ?? item?.ownerType ?? 'vessel';
  const { data: typeResponse, isLoading: loadingTypes } = useGetCertificateTypesQuery({ ownerType }, { skip: !item });
  const { data: ownerResponse, isLoading: loadingOwners } = useGetCertificateOwnersQuery({ ownerType }, { skip: !item });
  const { data: recipientResponse } = useGetCertificateReminderRecipientsQuery(undefined, { skip: !canManage });

  useEffect(() => {
    if (item) {
      form.setFieldsValue({
        certificateTypeId: item.certificateTypeId,
        ownerType: item.ownerType,
        ownerId: item.ownerId,
        certificateNo: item.certificateNo ?? undefined,
        title: item.title,
        issueDate: toShanghaiDateTimeLocal(item.issueDate),
        expiryDate: toShanghaiDateTimeLocal(item.expiryDate) ?? '',
        advanceDays: item.advanceDays,
        issuer: item.issuer ?? undefined,
        status: item.status,
        remarks: item.remarks ?? undefined,
        reminderEnabled: item.reminderEnabled !== false,
        reminderRecipientUserId: item.reminderRecipientUserId ?? undefined,
      });
    }
  }, [item, form]);

  return (
    <section className="page-hero">
      {contextHolder}
      <Typography.Title level={2}>证照详情</Typography.Title>
      <Typography.Paragraph type="secondary">查看并维护证照基础信息、有效期与附件。</Typography.Paragraph>
      <Card loading={isLoading}>
        {saveError ? <Alert type="error" showIcon message={saveError} style={{ marginBottom: 12 }} /> : null}
        {item ? (
          <>
            <Typography.Paragraph>持有对象：{item.ownerName} · 到期：{formatShanghaiDateTime(item.expiryDate)}</Typography.Paragraph>
            {canManage ? (
              <Form
                form={form}
                layout="vertical"
                onValuesChange={(changed) => {
                  if (changed.ownerType) {
                    form.setFieldsValue({ ownerId: undefined, certificateTypeId: undefined });
                  }
                }}
                onFinish={async (values) => {
                  if (!id) return;
                  setSaveError(null);
                  try {
                    await updateCertificate({
                      id,
                      data: {
                        ...values,
                        issueDate: toShanghaiIso(values.issueDate),
                        expiryDate: toShanghaiIso(values.expiryDate) ?? values.expiryDate,
                        reminderRecipientUserId: values.reminderRecipientUserId ?? null,
                      },
                    }).unwrap();
                    if (upload?.id) await bindFiles({ id, fileIds: [upload.id] }).unwrap();
                    messageApi.success('电子证照已更新');
                  } catch (error) {
                    const message = error instanceof Error ? error.message : '保存失败，请稍后重试';
                    setSaveError(message);
                    messageApi.error(message);
                  }
                }}
              >
                <Form.Item label="持有对象类型" name="ownerType" rules={[{ required: true }]}>
                  <Segmented
                    block
                    options={ownerTabs as unknown as Array<{ label: string; value: string }>}
                  />
                </Form.Item>
                <Form.Item label="持有对象" required>
                  <Form.Item name="ownerId" noStyle rules={[{ required: true, message: '请选择持有对象' }]}>
                    <Select aria-label="持有对象" showSearch loading={loadingOwners} placeholder="选择船舶、车辆、人员或设备" optionFilterProp="label" options={(ownerResponse?.data ?? []).map((owner) => ({ value: owner.id, label: `${owner.name} (${owner.code})` }))} />
                  </Form.Item>
                </Form.Item>
                <Form.Item name="certificateTypeId" label="证照类型" rules={[{ required: true, message: '请选择证照类型' }]}>
                  <Select showSearch loading={loadingTypes} placeholder="选择证照类型" optionFilterProp="label" options={(typeResponse?.data ?? []).map((type) => ({ value: type.id, label: `${type.name} · 提前 ${type.defaultAdvanceDays} 天提醒` }))} />
                </Form.Item>
                <Form.Item name="title" label="证照标题" rules={[{ required: true, message: '请输入证照标题' }]}><Input maxLength={128} /></Form.Item>
                <Form.Item name="certificateNo" label="证照编号"><Input maxLength={128} /></Form.Item>
                <Form.Item name="issueDate" label="签发时间" getValueProps={(value?: string) => ({ value: value ? dayjs(value) : undefined })} getValueFromEvent={(value) => value?.format('YYYY-MM-DD HH:mm')}><DatePicker showTime format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} /></Form.Item>
                <Form.Item name="expiryDate" label="到期时间" rules={[{ required: true, message: '请选择到期时间' }]} getValueProps={(value?: string) => ({ value: value ? dayjs(value) : undefined })} getValueFromEvent={(value) => value?.format('YYYY-MM-DD HH:mm')}><DatePicker showTime format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} /></Form.Item>
                <Form.Item name="advanceDays" label="提前提醒天数"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
                <Form.Item name="issuer" label="签发机构"><Input maxLength={128} /></Form.Item>
                <Form.Item name="status" label="状态" rules={[{ required: true }]}><Select options={[{ value: 'active', label: '有效' }, { value: 'expired', label: '已过期' }, { value: 'archived', label: '已归档' }]} /></Form.Item>
                <Form.Item name="remarks" label="备注"><Input.TextArea rows={3} /></Form.Item>
                <Form.Item name="reminderEnabled" label="企业微信提醒" valuePropName="checked" extra="关闭后仍保留证照，但扫描不会生成或发送提醒"><Switch /></Form.Item>
                <Form.Item name="reminderRecipientUserId" label="提醒负责人" extra="可不设置；未设置时按部门规则通知"><Select allowClear showSearch optionFilterProp="label" placeholder="可选负责人" options={(recipientResponse?.data ?? []).map((recipient) => ({ value: recipient.userId, label: `${recipient.name}${recipient.position ? ` · ${recipient.position}` : ''}` }))} /></Form.Item>
                <Form.Item label="附件上传/预览"><FileUploadField category="certificates" value={upload} onChange={setUpload} /></Form.Item>
                <Space wrap className="detail-action-bar"><Button htmlType="submit" type="primary" loading={saving}>保存</Button></Space>
              </Form>
            ) : <Alert type="info" showIcon message="你没有维护证照的权限。" />}
            <Typography.Title level={5} style={{ marginTop: 16 }}>已绑定附件</Typography.Title>
            <FileAttachmentList
              files={item.files}
              getUrl={async (file) => {
                const response = await getFileDownloadUrl({ id, fileId: file.id }).unwrap();
                return response.data.downloadUrl;
              }}
            />
          </>
        ) : null}
      </Card>
    </section>
  );
}
