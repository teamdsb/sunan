import { Button, Card, Form, Input, List, Pagination, Select, Space, Tag, Typography } from 'antd';
import { DownOutlined, FilterOutlined, UpOutlined } from '@ant-design/icons';
import { useMemo } from 'react';
import { useState } from 'react';
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

const categoryLabelMap: Record<string, string> = {
  license: '资质',
  notice: '公告',
};

const statusLabelMap: Record<string, string> = {
  draft: '草稿',
  published: '已发布',
  archived: '已归档',
};

function labelFrom(map: Record<string, string>, value: string | null | undefined, fallback: string) {
  return value ? map[value] ?? fallback : '-';
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
  const [showFilters, setShowFilters] = useState(false);

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
            data-testid="enterprise-profile-create-form"
            layout="vertical"
            className="stacked-form"
            onFinish={async (values) => {
              await createProfile({ ...values, status: 'draft' }).unwrap();
              form.resetFields();
            }}
          >
            <Form.Item name="title" label="标题" rules={[{ required: true }]}>
              <Input placeholder="标题" />
            </Form.Item>
            <Form.Item name="category" label="分类" rules={[{ required: true }]}>
              <Select
                options={[{ value: 'license', label: '资质' }, { value: 'notice', label: '公告' }]}
              />
            </Form.Item>
            <Button htmlType="submit" type="primary" loading={creating}>
              新建资料
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
                <Select
                  allowClear
                  placeholder="按分类筛选"
                  style={{ width: '100%' }}
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
                  style={{ width: '100%' }}
                  value={status}
                  onChange={(v) => {
                    applySearch({
                      status: v || null,
                      page: 1,
                    });
                  }}
                  options={[
                    { value: 'draft', label: '草稿' },
                    { value: 'published', label: '已发布' },
                    { value: 'archived', label: '已归档' },
                  ]}
                />
              </Space>
            </Card>
          ) : null}

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
                <List.Item.Meta title={item.title} description={`${labelFrom(categoryLabelMap, item.category, '未分类')} · ${labelFrom(statusLabelMap, item.status, '未知状态')}`} />
                <Tag>{item.files.length} 附件</Tag>
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
