import { Button, Card, Input, List, Pagination, Segmented, Select, Space, Typography } from 'antd';
import { useMemo } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { myRouteConfig } from '../../router/myRouteConfig';
import { buildDetailHref, updateSearchParams } from '../../router/myRouteState';
import { useGetCertificatesQuery, useGetGroupedCertificatesQuery } from './certificateApi';

const ownerTabs = [
  { label: '船舶', value: 'vessel' },
  { label: '车辆', value: 'vehicle' },
  { label: '人员', value: 'personnel' },
] as const;

function readPageValue(value: string | null, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function CertificateListPage() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const ownerType = (searchParams.get('ownerType') as 'vessel' | 'vehicle' | 'personnel' | null) || 'vessel';
  const groupBy = (searchParams.get('groupBy') as 'owner' | 'type' | null) || 'owner';
  const status = searchParams.get('status') || undefined;
  const keyword = searchParams.get('keyword') || '';
  const page = readPageValue(searchParams.get('page'), 1);
  const pageSize = readPageValue(searchParams.get('pageSize'), 10);

  const { data, isLoading } = useGetCertificatesQuery({ ownerType, status, keyword: keyword || undefined, page, pageSize });
  const { data: grouped } = useGetGroupedCertificatesQuery({ groupBy });

  const items = useMemo(() => data?.data ?? [], [data]);

  const applySearch = (updates: Record<string, string | number | null | undefined>) => {
    setSearchParams(updateSearchParams(location.search, updates));
  };

  return (
    <section className="page-hero">
      <Typography.Title level={2}>电子证照</Typography.Title>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Segmented
          options={ownerTabs as unknown as Array<{ label: string; value: string }>}
          value={ownerType}
          onChange={(value) => {
            applySearch({
              ownerType: value as 'vessel' | 'vehicle' | 'personnel',
              page: 1,
              pageSize,
              groupBy,
              status,
              keyword,
            });
          }}
        />
        <Space wrap>
          <Segmented
            options={[{ label: '按对象分组', value: 'owner' }, { label: '按类型分组', value: 'type' }]}
            value={groupBy}
            onChange={(value) =>
              applySearch({
                groupBy: value as 'owner' | 'type',
                ownerType,
                page,
                pageSize,
                status,
                keyword,
              })
            }
          />
          <Select
            allowClear
            placeholder="状态"
            style={{ width: 160 }}
            value={status}
            onChange={(v) => {
              applySearch({
                status: v || null,
                ownerType,
                groupBy,
                page: 1,
                pageSize,
                keyword,
              });
            }}
            options={[{ value: 'active', label: '有效' }, { value: 'expired', label: '已过期' }, { value: 'archived', label: '已归档' }]}
          />
          <Input.Search
            placeholder="关键字"
            allowClear
            value={keyword}
            onSearch={(v) => {
              applySearch({
                keyword: v || null,
                ownerType,
                groupBy,
                page: 1,
                pageSize,
                status,
              });
            }}
            style={{ width: 220 }}
          />
        </Space>

        <Card>
          <Typography.Text type="secondary">当前分组总数：{grouped?.data?.length ?? 0}</Typography.Text>
        </Card>

        <Card loading={isLoading}>
          <List
            dataSource={items}
            renderItem={(item) => (
              <List.Item>
                <List.Item.Meta
                  title={<Link to={buildDetailHref(myRouteConfig.certificates.path, item.id, location.search)}>{item.title}</Link>}
                  description={`${item.ownerName} · ${item.expiryDate} · ${item.status}`}
                />
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
                ownerType,
                groupBy,
                status,
                keyword,
              });
            }}
          />
        </Card>

        <Button type="primary">新增证照</Button>
      </Space>
    </section>
  );
}
