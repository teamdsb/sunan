import { Alert, Button, Card, Form, Input, List, Space, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { FileUploadField } from '../files/FileUploadField';
import type { FileRecord } from '../files/types';
import { myRouteConfig } from '../../router/myRouteConfig';
import { resolveBackHref } from '../../router/myRouteState';
import { useBindCertificateFilesMutation, useGetCertificateByIdQuery, useUpdateCertificateMutation } from './certificateApi';

export function CertificateDetailPage() {
  const { id = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { data, isLoading } = useGetCertificateByIdQuery(id, { skip: !id });
  const [updateCertificate, { isLoading: saving }] = useUpdateCertificateMutation();
  const [bindFiles] = useBindCertificateFilesMutation();
  const [upload, setUpload] = useState<FileRecord | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [form] = Form.useForm<{
    title: string;
    expiryDate: string;
    status: import('./certificateApi').CertificateItem['status'];
  }>();
  const item = data?.data;
  const backHref = resolveBackHref(myRouteConfig.certificates.path, location.search);

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
      <Card loading={isLoading}>
        {saveError ? <Alert type="error" showIcon message={saveError} style={{ marginBottom: 12 }} /> : null}
        {item ? (
          <>
            <Typography.Paragraph>持有对象：{item.ownerName}</Typography.Paragraph>
            <Form
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
                  setSaveError(error instanceof Error ? error.message : '保存失败，请稍后重试');
                }
              }}
            >
              <Form.Item name="title" label="标题" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item name="expiryDate" label="到期日" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item name="status" label="状态" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item label="附件上传/预览">
                <FileUploadField category="certificates" value={upload} onChange={setUpload} />
              </Form.Item>
              <Space>
                <Button htmlType="submit" type="primary" loading={saving}>
                  保存
                </Button>
                <Button onClick={() => navigate(backHref)}>返回列表</Button>
              </Space>
            </Form>
            <Typography.Title level={5} style={{ marginTop: 16 }}>
              已绑定附件
            </Typography.Title>
            <List dataSource={item.files} renderItem={(file) => <List.Item>{file.fileName}</List.Item>} />
          </>
        ) : null}
      </Card>
    </section>
  );
}
