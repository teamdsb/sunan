import { Alert, Button, Card, Form, Input, Space, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAppSelector } from '../../app/hooks';
import { canManageCompanyContent } from '../auth/permissions';
import { FileUploadField } from '../files/FileUploadField';
import { FileAttachmentList } from '../files/FileAttachmentList';
import type { FileRecord } from '../files/types';
import {
  type CertificateItem,
  useBindCertificateFilesMutation,
  useGetCertificateByIdQuery,
  useLazyGetCertificateFileDownloadUrlQuery,
  useUpdateCertificateMutation,
} from './certificateApi';

export function CertificateDetailPage() {
  const { id = '' } = useParams();
  const roles = useAppSelector((state) => state.auth.currentUser?.roles ?? []);
  const canManage = canManageCompanyContent(roles);
  const { data, isLoading } = useGetCertificateByIdQuery(id, { skip: !id });
  const [updateCertificate, { isLoading: saving }] =
    useUpdateCertificateMutation();
  const [bindFiles] = useBindCertificateFilesMutation();
  const [getFileDownloadUrl] = useLazyGetCertificateFileDownloadUrlQuery();
  const [upload, setUpload] = useState<FileRecord | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [form] = Form.useForm<{
    title: string;
    expiryDate: string;
    status: CertificateItem['status'];
  }>();
  const item = data?.data;

  useEffect(() => {
    if (item) {
      form.setFieldsValue({
        title: item.title,
        expiryDate: item.expiryDate,
        status: item.status,
      });
    }
  }, [item, form]);

  return (
    <section className="page-hero">
      <Typography.Title level={2}>证照详情</Typography.Title>
      <Typography.Paragraph type="secondary">
        查看并维护证照基础信息、有效期与附件。
      </Typography.Paragraph>
      <Card loading={isLoading}>
        {saveError ? (
          <Alert
            type="error"
            showIcon
            message={saveError}
            style={{ marginBottom: 12 }}
          />
        ) : null}
        {item ? (
          <>
            <Typography.Paragraph>
              持有对象：{item.ownerName}
            </Typography.Paragraph>
            {canManage ? <Form
              form={form}
              layout="vertical"
              onFinish={async (values) => {
                if (!id) return;
                setSaveError(null);
                try {
                  await updateCertificate({ id, data: values }).unwrap();
                  if (upload?.id) {
                    await bindFiles({ id, fileIds: [upload.id] }).unwrap();
                  }
                } catch (error) {
                  setSaveError(
                    error instanceof Error
                      ? error.message
                      : '保存失败，请稍后重试',
                  );
                }
              }}
            >
              <Form.Item name="title" label="标题" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item
                name="expiryDate"
                label="到期日"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
              <Form.Item
                name="status"
                label="状态"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
              <Form.Item label="附件上传/预览">
                <FileUploadField
                  category="certificates"
                  value={upload}
                  onChange={setUpload}
                />
              </Form.Item>
              <Space wrap className="detail-action-bar">
                <Button htmlType="submit" type="primary" loading={saving}>
                  保存
                </Button>
              </Space>
            </Form> : <Alert type="info" showIcon message="你没有维护证照的权限。" />}
            <Typography.Title level={5} style={{ marginTop: 16 }}>
              已绑定附件
            </Typography.Title>
            <FileAttachmentList
              files={item.files}
              getUrl={async (file) => {
                const response = await getFileDownloadUrl({
                  id,
                  fileId: file.id,
                }).unwrap();
                return response.data.downloadUrl;
              }}
            />
          </>
        ) : null}
      </Card>
    </section>
  );
}
