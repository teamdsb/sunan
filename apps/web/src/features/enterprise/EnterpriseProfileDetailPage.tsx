import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Popconfirm,
  Select,
  Space,
  Typography,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { FileUploadField } from '../files/FileUploadField';
import { FileAttachmentList } from '../files/FileAttachmentList';
import type { FileRecord } from '../files/types';
import {
  type EnterpriseProfile,
  useBindEnterpriseProfileFilesMutation,
  useGetEnterpriseProfileByIdQuery,
  useLazyGetEnterpriseProfileFileDownloadUrlQuery,
  useUnbindEnterpriseProfileFileMutation,
  useUpdateEnterpriseProfileMutation,
  useDeleteEnterpriseProfileMutation,
} from './enterpriseApi';
import { myRouteConfig } from '../../router/myRouteConfig';
import { resolveBackHref } from '../../router/myRouteState';

const categoryOptions = [
  { value: 'license', label: '资质' },
  { value: 'notice', label: '公告' },
];

const statusOptions = [
  { value: 'draft', label: '草稿' },
  { value: 'published', label: '已发布' },
  { value: 'archived', label: '已归档' },
];

export function EnterpriseProfileDetailPage() {
  const { id = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { data, isLoading } = useGetEnterpriseProfileByIdQuery(id, {
    skip: !id,
  });
  const [updateProfile, { isLoading: saving }] =
    useUpdateEnterpriseProfileMutation();
  const [deleteProfile] = useDeleteEnterpriseProfileMutation();
  const [bindFiles] = useBindEnterpriseProfileFilesMutation();
  const [getFileDownloadUrl] =
    useLazyGetEnterpriseProfileFileDownloadUrlQuery();
  const [unbindFile] = useUnbindEnterpriseProfileFileMutation();
  const [uploaded, setUploaded] = useState<FileRecord | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [form] = Form.useForm<{
    title: string;
    category: string;
    description?: string;
    status: EnterpriseProfile['status'];
  }>();

  const profile = data?.data;
  const canManage = profile?.canManage ?? false;

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

  return (
    <section className="page-hero">
      <Typography.Title level={2}>企业资料详情</Typography.Title>
      <Typography.Paragraph type="secondary">
        查看并维护企业资料内容、状态和附件。
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
        {canManage ? <Form
          form={form}
          layout="vertical"
          onFinish={async (values) => {
            if (!id) return;
            setSaveError(null);
            try {
              await updateProfile({ id, data: values }).unwrap();
              if (currentUpload?.id) {
                await bindFiles({ id, fileIds: [currentUpload.id] }).unwrap();
                setUploaded(null);
              }
            } catch (error) {
              setSaveError(
                error instanceof Error ? error.message : '保存失败，请稍后重试',
              );
            }
          }}
        >
          <Form.Item name="title" label="标题" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="category" label="分类" rules={[{ required: true }]}>
            <Select options={categoryOptions} />
          </Form.Item>
          <Form.Item name="status" label="状态" rules={[{ required: true }]}>
            <Select options={statusOptions} />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item label="附件上传/预览">
            <FileUploadField
              category="enterprise-profiles"
              value={currentUpload}
              onChange={setUploaded}
            />
          </Form.Item>
          <Space wrap className="detail-action-bar">
            <Button htmlType="submit" type="primary" loading={saving}>
              保存
            </Button>
            <Popconfirm title="确定删除此企业资料吗？" description="删除后将从资料列表中移除。" okText="删除" cancelText="取消" onConfirm={async () => { try { await deleteProfile(id).unwrap(); navigate(resolveBackHref(myRouteConfig.enterpriseProfile.path, location.search)); } catch (error) { setSaveError(error instanceof Error ? error.message : '删除失败'); } }}>
              <Button danger>删除</Button>
            </Popconfirm>
          </Space>
        </Form> : <Alert type="info" showIcon message="你没有维护此企业资料的权限。" />}
        {profile ? (
          <>
            <Typography.Title level={5} style={{ marginTop: 20 }}>
              已绑定附件
            </Typography.Title>
            <FileAttachmentList
              files={profile.files}
              allowDelete={canManage}
              onDelete={async (file) => {
                await unbindFile({ id, fileId: file.id }).unwrap();
              }}
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
