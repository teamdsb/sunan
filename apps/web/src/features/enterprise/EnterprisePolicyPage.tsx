import { Alert, Button, Card, Form, Input, List, Pagination, Select, Space, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FileUploadField } from '../files/FileUploadField';
import type { FileRecord } from '../files/types';
import {
  useBindEnterprisePolicyFilesMutation,
  useCreateEnterprisePolicyMutation,
  useGetEnterprisePoliciesQuery,
  useGetEnterprisePolicyByIdQuery,
  useGetEnterprisePolicyVersionsQuery,
  usePublishEnterprisePolicyMutation,
  useUpdateEnterprisePolicyMutation,
} from './enterpriseApi';

export function EnterprisePolicyPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [status, setStatus] = useState<string | undefined>();
  const [keyword, setKeyword] = useState<string>('');
  const { data, isLoading } = useGetEnterprisePoliciesQuery({ page, pageSize, status, keyword: keyword || undefined });
  const [createPolicy, { isLoading: creating }] = useCreateEnterprisePolicyMutation();
  const [publishPolicy] = usePublishEnterprisePolicyMutation();
  const [form] = Form.useForm<{ title: string; policyCode: string; version: string }>();

  const policies = useMemo(() => data?.data ?? [], [data]);

  return (
    <section className="page-hero">
      <Typography.Title level={2}>企业制度</Typography.Title>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card>
          <Form
            form={form}
            layout="inline"
            onFinish={async (values) => {
              await createPolicy(values).unwrap();
              form.resetFields();
            }}
          >
            <Form.Item name="title" rules={[{ required: true }]}><Input placeholder="制度标题" /></Form.Item>
            <Form.Item name="policyCode" rules={[{ required: true }]}><Input placeholder="制度编码" /></Form.Item>
            <Form.Item name="version" initialValue="v1" rules={[{ required: true }]}><Input placeholder="版本" /></Form.Item>
            <Button htmlType="submit" type="primary" loading={creating}>新建制度</Button>
          </Form>
        </Card>

        <Card loading={isLoading}>
          <Space wrap style={{ marginBottom: 12 }}>
            <Input.Search placeholder="关键字" allowClear onSearch={(v) => { setKeyword(v); setPage(1); }} style={{ width: 220 }} />
            <Select
              allowClear
              placeholder="状态"
              style={{ width: 180 }}
              value={status}
              onChange={(v) => { setStatus(v); setPage(1); }}
              options={[{ value: 'draft', label: '草稿' }, { value: 'published', label: '已发布' }, { value: 'deprecated', label: '已废弃' }]}
            />
          </Space>
          <List
            dataSource={policies}
            renderItem={(item) => (
              <List.Item actions={[
                <Button key="publish" onClick={() => void publishPolicy(item.id)}>发布</Button>,
                <Button key="detail" type="link"><Link to={`/my/enterprise-policy/${item.id}`}>详情</Link></Button>,
              ]}>
                <List.Item.Meta title={item.title} description={`${item.policyCode} · ${item.version} · ${item.status}`} />
              </List.Item>
            )}
          />
          <Pagination
            style={{ marginTop: 16, textAlign: 'right' }}
            current={page}
            pageSize={pageSize}
            total={data?.meta?.total ?? 0}
            onChange={(nextPage, nextPageSize) => {
              setPage(nextPage);
              setPageSize(nextPageSize);
            }}
          />
        </Card>
      </Space>
    </section>
  );
}

export function EnterprisePolicyDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data, isLoading } = useGetEnterprisePolicyByIdQuery(id, { skip: !id });
  const { data: versions } = useGetEnterprisePolicyVersionsQuery(id, { skip: !id });
  const [updatePolicy, { isLoading: saving }] = useUpdateEnterprisePolicyMutation();
  const [bindFiles] = useBindEnterprisePolicyFilesMutation();
  const [uploaded, setUploaded] = useState<FileRecord | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [form] = Form.useForm<{
    title: string;
    summary?: string;
    status: import('./enterpriseApi').EnterprisePolicy['status'];
  }>();

  const policy = data?.data;

  useEffect(() => {
    if (policy) {
      form.setFieldsValue({
        title: policy.title,
        summary: policy.summary ?? undefined,
        status: policy.status,
      });
    }
  }, [policy, form]);

  return (
    <section className="page-hero">
      <Typography.Title level={2}>企业制度详情</Typography.Title>
      <Card loading={isLoading}>
        {saveError ? <Alert type="error" showIcon message={saveError} style={{ marginBottom: 12 }} /> : null}
        <Form
          form={form}
          layout="vertical"
          onFinish={async (values) => {
            if (!id) return;
            setSaveError(null);
            try {
              await updatePolicy({ id, data: values }).unwrap();
              if (uploaded?.id) {
                await bindFiles({ id, fileIds: [uploaded.id] }).unwrap();
              }
            } catch (error) {
              setSaveError(error instanceof Error ? error.message : '保存失败，请稍后重试');
            }
          }}
        >
          <Form.Item name="title" label="制度标题" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="status" label="状态" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="summary" label="摘要"><Input.TextArea rows={3} /></Form.Item>
          <Form.Item label="文件上传/预览">
            <FileUploadField category="enterprise-policies" value={uploaded} onChange={setUploaded} />
          </Form.Item>
          <Space>
            <Button htmlType="submit" type="primary" loading={saving}>保存</Button>
            <Button onClick={() => navigate('/my/enterprise-policy')}>返回列表</Button>
          </Space>
        </Form>

        <Typography.Title level={5} style={{ marginTop: 20 }}>版本历史</Typography.Title>
        <List
          size="small"
          dataSource={versions?.data ?? []}
          renderItem={(item) => <List.Item>{item.version} · {item.status}</List.Item>}
        />
      </Card>
    </section>
  );
}
