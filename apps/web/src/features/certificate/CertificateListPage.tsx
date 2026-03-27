import { Button, Card, Input, List, Pagination, Segmented, Select, Space, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useGetCertificatesQuery, useGetGroupedCertificatesQuery } from './certificateApi';

const ownerTabs = [
  { label: '船舶', value: 'vessel' },
  { label: '车辆', value: 'vehicle' },
  { label: '人员', value: 'personnel' },
] as const;

export function CertificateListPage() {
  const [ownerType, setOwnerType] = useState<'vessel' | 'vehicle' | 'personnel'>('vessel');
  const [groupBy, setGroupBy] = useState<'owner' | 'type'>('owner');
  const [status, setStatus] = useState<string | undefined>();
  const [keyword, setKeyword] = useState<string>('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data, isLoading } = useGetCertificatesQuery({ ownerType, status, keyword: keyword || undefined, page, pageSize });
  const { data: grouped } = useGetGroupedCertificatesQuery({ groupBy });

  const items = useMemo(() => data?.data ?? [], [data]);

  return (
    <section className="page-hero">
      <Typography.Title level={2}>电子证照</Typography.Title>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Segmented
          options={ownerTabs as unknown as Array<{ label: string; value: string }>}
          value={ownerType}
          onChange={(value) => {
            setOwnerType(value as 'vessel' | 'vehicle' | 'personnel');
            setPage(1);
          }}
        />
        <Space wrap>
          <Segmented
            options={[{ label: '按对象分组', value: 'owner' }, { label: '按类型分组', value: 'type' }]}
            value={groupBy}
            onChange={(value) => setGroupBy(value as 'owner' | 'type')}
          />
          <Select
            allowClear
            placeholder="状态"
            style={{ width: 160 }}
            value={status}
            onChange={(v) => { setStatus(v); setPage(1); }}
            options={[{ value: 'active', label: '有效' }, { value: 'expired', label: '已过期' }, { value: 'archived', label: '已归档' }]}
          />
          <Input.Search placeholder="关键字" allowClear onSearch={(v) => { setKeyword(v); setPage(1); }} style={{ width: 220 }} />
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
                  title={<Link to={`/my/certificates/${item.id}`}>{item.title}</Link>}
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
              setPage(nextPage);
              setPageSize(nextPageSize);
            }}
          />
        </Card>

        <Button type="primary">新增证照</Button>
      </Space>
    </section>
  );
}
