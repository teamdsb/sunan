import { Alert, Button, Card, Form, Input, Space, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { myRouteConfig } from '../../router/myRouteConfig';
import { resolveBackHref } from '../../router/myRouteState';
import { FileUploadField } from '../files/FileUploadField';
import type { FileRecord } from '../files/types';
import {
  type EnterpriseProfile,
  useBindEnterpriseProfileFilesMutation,
  useGetEnterpriseProfileByIdQuery,
  useUpdateEnterpriseProfileMutation,
} from './enterpriseApi';

export function EnterpriseProfileDetailPage() {
  const { id = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { data, isLoading } = useGetEnterpriseProfileByIdQuery(id, { skip: !id });
  const [updateProfile, { isLoading: saving }] = useUpdateEnterpriseProfileMutation();
  const [bindFiles] = useBindEnterpriseProfileFilesMutation();
  const [uploaded, setUploaded] = useState<FileRecord | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [form] = Form.useForm<{
    title: string;
    category: string;
    description?: string;
    status: EnterpriseProfile['status'];
  }>();

  const profile = data?.data;

  useEffect(() => {
    if (profile) {
      form.setFieldsValue({
        title: profile.title,
        category: profile.category,
        description: profile.description ?? undefined,
        status: profile.status,
      });
    }
  }, [profile, form]);

  const currentUpload = useMemo(() => uploaded, [uploaded]);
  const backHref = resolveBackHref(myRouteConfig.enterpriseProfile.path, location.search);

  return (
    <section className="page-hero">
      <Typography.Title level={2}>企业资料详情</Typography.Title>
      <Card loading={isLoading}>
        {saveError ? <Alert type="error" showIcon message={saveError} style={{ marginBottom: 12 }} /> : null}
        <Form
          form={form}
          layout="vertical"
          onFinish={async (values) => {
            if (!id) return;
            setSaveError(null);
            try {
              await updateProfile({ id, data: values }).unwrap();
              if (currentUpload?.id) {
                await bindFiles({ id, fileIds: [currentUpload.id] }).unwrap();
              }
            } catch (error) {
              setSaveError(error instanceof Error ? error.message : '保存失败，请稍后重试');
            }
          }}
        >
          <Form.Item name="title" label="标题" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="category" label="分类" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="status" label="状态" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="description" label="描述"><Input.TextArea rows={3} /></Form.Item>
          <Form.Item label="附件上传/预览">
            <FileUploadField category="enterprise-profiles" value={currentUpload} onChange={setUploaded} />
          </Form.Item>
          <Space>
            <Button htmlType="submit" type="primary" loading={saving}>保存</Button>
            <Button onClick={() => navigate(backHref, { replace: true })}>返回列表</Button>
          </Space>
        </Form>
      </Card>
    </section>
  );
}
