import { Alert, Button, Card, Form, Input, List, Pagination, Select, Space, Typography } from 'antd';
import { DownOutlined, FilterOutlined, UpOutlined } from '@ant-design/icons';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { FileUploadField } from '../files/FileUploadField';
import type { FileRecord } from '../files/types';
import { myRouteConfig } from '../../router/myRouteConfig';
import { buildDetailHref, resolveBackHref, updateSearchParams } from '../../router/myRouteState';
import {
  type EnterprisePolicy,
  useBindEnterprisePolicyFilesMutation,
  useCreateEnterprisePolicyMutation,
  useGetEnterprisePoliciesQuery,
  useGetEnterprisePolicyByIdQuery,
  useGetEnterprisePolicyVersionsQuery,
  usePublishEnterprisePolicyMutation,
  useUpdateEnterprisePolicyMutation,
} from './enterpriseApi';

function readPageValue(value: string | null, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const policyStatusLabelMap: Record<string, string> = {
  draft: '草稿',
  published: '已发布',
  deprecated: '已废弃',
};

function formatPolicyStatus(status: string) {
  return policyStatusLabelMap[status] ?? '未知状态';
}

export function EnterprisePolicyPage() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = readPageValue(searchParams.get('page'), 1);
  const pageSize = readPageValue(searchParams.get('pageSize'), 10);
  const status = searchParams.get('status') || undefined;
  const keyword = searchParams.get('keyword') || '';
  const [keywordDraft, setKeywordDraft] = useState(keyword);

  const { data, isLoading } = useGetEnterprisePoliciesQuery({ page, pageSize, status, keyword: keyword || undefined });
  const [createPolicy, { isLoading: creating }] = useCreateEnterprisePolicyMutation();
  const [publishPolicy] = usePublishEnterprisePolicyMutation();
  const [form] = Form.useForm<{ title: string; policyCode: string; version: string }>();
  const [showFilters, setShowFilters] = useState(false);

  const policies = useMemo(() => data?.data ?? [], [data]);

  const applySearch = (updates: Record<string, string | number | null | undefined>) => {
    setSearchParams(updateSearchParams(location.search, updates));
  };

  useEffect(() => {
    setKeywordDraft(keyword);
  }, [keyword]);

  return (
    <section className="page-hero">
      <Typography.Title level={2}>企业制度</Typography.Title>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card>
          <Form
            form={form}
            data-testid="enterprise-policy-create-form"
            layout="vertical"
            className="stacked-form"
            onFinish={async (values) => {
              await createPolicy(values).unwrap();
              form.resetFields();
            }}
          >
            <Form.Item name="title" label="制度标题" rules={[{ required: true }]}>
              <Input placeholder="制度标题" />
            </Form.Item>
            <Form.Item name="policyCode" label="制度编码" rules={[{ required: true }]}>
              <Input placeholder="制度编码" />
            </Form.Item>
            <Form.Item name="version" label="版本" initialValue="v1" rules={[{ required: true }]}>
              <Input placeholder="版本" />
            </Form.Item>
            <Button htmlType="submit" type="primary" loading={creating}>
              新建制度
            </Button>
          </Form>
        </Card>

        <Card loading={isLoading}>
          <Button
            className="filter-panel-toggle"
            icon={showFilters ? <UpOutlined /> : <DownOutlined />}
            onClick={() => setShowFilters((current) => !current)}
          >
            {showFilters ? '收起筛选' : '展开筛选'}
          </Button>
          {showFilters ? (
            <Card size="small" className="filter-panel" title={<Space size="small"><FilterOutlined /><span>筛选条件</span></Space>}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Input.Search
                  placeholder="关键字"
                  allowClear
                  value={keywordDraft}
                  onChange={(event) => {
                    setKeywordDraft(event.target.value);
                  }}
                  onSearch={(v) => {
                    applySearch({
                      keyword: v || null,
                      page: 1,
                      pageSize,
                      status,
                    });
                  }}
                />
                <Select
                  allowClear
                  placeholder="状态"
                  style={{ width: '100%' }}
                  value={status}
                  onChange={(v) => {
                    applySearch({
                      status: v || null,
                      page: 1,
                      pageSize,
                      keyword,
                    });
                  }}
                  options={[
                    { value: 'draft', label: '草稿' },
                    { value: 'published', label: '已发布' },
                    { value: 'deprecated', label: '已废弃' },
                  ]}
                />
              </Space>
            </Card>
          ) : null}
          <List
            dataSource={policies}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <Button key="publish" onClick={() => void publishPolicy(item.id)}>
                    发布
                  </Button>,
                  <Button key="detail" type="link">
                    <Link to={buildDetailHref(myRouteConfig.enterprisePolicy.path, item.id, location.search)}>详情</Link>
                  </Button>,
                ]}
              >
                <List.Item.Meta title={item.title} description={`${item.policyCode} · ${item.version} · ${formatPolicyStatus(item.status)}`} />
              </List.Item>
            )}
          />
          <Pagination
            className="list-pagination"
            current={page}
            pageSize={pageSize}
            total={data?.meta?.total ?? 0}
            responsive
            showLessItems
            onChange={(nextPage, nextPageSize) => {
              applySearch({
                page: nextPage,
                pageSize: nextPageSize,
                status,
                keyword,
              });
            }}
          />
        </Card>
      </Space>
    </section>
  );
}

export function EnterprisePolicyDetailPage() {
  const { id = '' } = useParams();
  const location = useLocation();
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
    status: EnterprisePolicy['status'];
  }>();
  const policy = data?.data;
  const backHref = resolveBackHref(myRouteConfig.enterprisePolicy.path, location.search);

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
          <Form.Item name="title" label="制度标题" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="status" label="状态" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'draft', label: '草稿' },
                { value: 'published', label: '已发布' },
                { value: 'deprecated', label: '已废弃' },
              ]}
            />
          </Form.Item>
          <Form.Item name="summary" label="摘要">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item label="文件上传/预览">
            <FileUploadField category="enterprise-policies" value={uploaded} onChange={setUploaded} />
          </Form.Item>
          <Space wrap className="detail-action-bar">
            <Button htmlType="submit" type="primary" loading={saving}>
              保存
            </Button>
            <Button onClick={() => navigate(backHref, { replace: true })}>返回列表</Button>
          </Space>
        </Form>

        <Typography.Title level={5} style={{ marginTop: 20 }}>
          版本历史
        </Typography.Title>
        <List
          size="small"
          dataSource={versions?.data ?? []}
          renderItem={(item) => <List.Item>{item.version} · {formatPolicyStatus(item.status)}</List.Item>}
        />
      </Card>
    </section>
  );
}
