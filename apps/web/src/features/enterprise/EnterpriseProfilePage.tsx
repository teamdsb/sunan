import { Button, Card, Form, Input, List, Pagination, Select, Space, Tag, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCreateEnterpriseProfileMutation, useDeleteEnterpriseProfileMutation, useGetEnterpriseProfilesQuery } from './enterpriseApi';

export function EnterpriseProfilePage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [category, setCategory] = useState<string | undefined>();
  const [status, setStatus] = useState<string | undefined>();

  const { data, isLoading } = useGetEnterpriseProfilesQuery({ page, pageSize, category, status });
  const [createProfile, { isLoading: creating }] = useCreateEnterpriseProfileMutation();
  const [deleteProfile] = useDeleteEnterpriseProfileMutation();
  const [form] = Form.useForm<{ title: string; category: string }>();

  const profiles = useMemo(() => data?.data ?? [], [data]);

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
            <Button htmlType="submit" type="primary" loading={creating}>新建资料</Button>
          </Form>
        </Card>

        <Card loading={isLoading}>
          <Space wrap style={{ marginBottom: 12 }}>
            <Select
              allowClear
              placeholder="按分类筛选"
              style={{ width: 180 }}
              value={category}
              onChange={(v) => { setCategory(v); setPage(1); }}
              options={[{ value: 'license', label: '资质' }, { value: 'notice', label: '公告' }]}
            />
            <Select
              allowClear
              placeholder="按状态筛选"
              style={{ width: 180 }}
              value={status}
              onChange={(v) => { setStatus(v); setPage(1); }}
              options={[{ value: 'draft', label: '草稿' }, { value: 'published', label: '已发布' }, { value: 'archived', label: '已归档' }]}
            />
          </Space>

          <List
            dataSource={profiles}
            locale={{ emptyText: '暂无企业资料，请调整筛选或新增资料。' }}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <Button key="delete" danger size="small" onClick={() => void deleteProfile(item.id)}>删除</Button>,
                  <Button key="detail" type="link"><Link to={`/my/enterprise-profile/${item.id}`}>详情</Link></Button>,
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
              setPage(nextPage);
              setPageSize(nextPageSize);
            }}
          />
        </Card>
      </Space>
    </section>
  );
}
