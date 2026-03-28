import { Button, Card, Form, Input, List, Pagination, Select, Space, Tag, Typography } from 'antd';
import { useMemo } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { myRouteConfig } from '../../router/myRouteConfig';
import { buildDetailHref, updateSearchParams } from '../../router/myRouteState';
import {
  useCreateEnterpriseProfileMutation,
  useDeleteEnterpriseProfileMutation,
  useGetEnterpriseProfilesQuery,
} from './enterpriseApi';

function readPageValue(value: string | null, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function EnterpriseProfilePage() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = readPageValue(searchParams.get('page'), 1);
  const pageSize = readPageValue(searchParams.get('pageSize'), 10);
  const category = searchParams.get('category') || undefined;
  const status = searchParams.get('status') || undefined;

  const { data, isLoading } = useGetEnterpriseProfilesQuery({ page, pageSize, category, status });
  const [createProfile, { isLoading: creating }] = useCreateEnterpriseProfileMutation();
  const [deleteProfile] = useDeleteEnterpriseProfileMutation();
  const [form] = Form.useForm<{ title: string; category: string }>();

  const profiles = useMemo(() => data?.data ?? [], [data]);

  const applySearch = (updates: Record<string, string | number | null | undefined>) => {
    setSearchParams(updateSearchParams(location.search, updates));
  };

  return (
    <section className="page-hero">
      <Typography.Title level={2}>企业资料</Typography.Title>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card>
          <Form
            form={form}
            layout="inline"
            onFinish={async (values) => {
              await createProfile({ ...values, status: 'draft' }).unwrap();
              form.resetFields();
            }}
          >
            <Form.Item name="title" rules={[{ required: true }]}>
              <Input placeholder="标题" />
            </Form.Item>
            <Form.Item name="category" rules={[{ required: true }]}>
              <Select
                style={{ width: 180 }}
                options={[{ value: 'license', label: '资质' }, { value: 'notice', label: '公告' }]}
              />
            </Form.Item>
            <Button htmlType="submit" type="primary" loading={creating}>
              新建资料
            </Button>
          </Form>
        </Card>

        <Card loading={isLoading}>
          <Space wrap style={{ marginBottom: 12 }}>
            <Select
              allowClear
              placeholder="按分类筛选"
              style={{ width: 180 }}
              value={category}
              onChange={(v) => {
                applySearch({
                  category: v || null,
                  page: 1,
                });
              }}
              options={[{ value: 'license', label: '资质' }, { value: 'notice', label: '公告' }]}
            />
            <Select
              allowClear
              placeholder="按状态筛选"
              style={{ width: 180 }}
              value={status}
              onChange={(v) => {
                applySearch({
                  status: v || null,
                  page: 1,
                });
              }}
              options={[{ value: 'draft', label: '草稿' }, { value: 'published', label: '已发布' }, { value: 'archived', label: '已归档' }]}
            />
          </Space>

          <List
            dataSource={profiles}
            locale={{ emptyText: '暂无企业资料，请调整筛选或新增资料。' }}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <Button key="delete" danger size="small" onClick={() => void deleteProfile(item.id)}>
                    删除
                  </Button>,
                  <Button key="detail" type="link">
                    <Link to={buildDetailHref(myRouteConfig.enterpriseProfile.path, item.id, location.search)}>详情</Link>
                  </Button>,
                ]}
              >
                <List.Item.Meta title={item.title} description={`${item.category} · ${item.status}`} />
                <Tag>{item.files.length} 附件</Tag>
              </List.Item>
            )}
          />

          <Pagination
            style={{ marginTop: 16, textAlign: 'right' }}
            current={page}
            pageSize={pageSize}
            total={data?.meta?.total ?? 0}
            onChange={(nextPage, nextPageSize) => {
              applySearch({
                page: nextPage,
                pageSize: nextPageSize,
                category,
                status,
              });
            }}
          />
        </Card>
      </Space>
    </section>
  );
}
