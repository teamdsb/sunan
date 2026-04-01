import { Button, Card, Input, List, Pagination, Segmented, Select, Space, Typography } from 'antd';
import { DownOutlined, FilterOutlined, UpOutlined } from '@ant-design/icons';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { myRouteConfig } from '../../router/myRouteConfig';
import { buildDetailHref, updateSearchParams } from '../../router/myRouteState';
import { useGetCertificatesQuery, useGetGroupedCertificatesQuery } from './certificateApi';
import { useGetSettingsQuery } from '../settings/settingsApi';

const ownerTabs = [
  { label: '船舶', value: 'vessel' },
  { label: '车辆', value: 'vehicle' },
  { label: '人员', value: 'personnel' },
] as const;
const scrollStoragePrefix = 'certificate-list-scroll:';

function readPageValue(value: string | null, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getScrollStorageKey(search: string): string {
  return `${scrollStoragePrefix}${search}`;
}

export function CertificateListPage() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: settings } = useGetSettingsQuery();
  const ownerType = (searchParams.get('ownerType') as 'vessel' | 'vehicle' | 'personnel' | null) || 'vessel';
  const groupBy =
    (searchParams.get('groupBy') as 'owner' | 'type' | null) || settings?.data.certificateGroupBy || 'owner';
  const status = searchParams.get('status') || undefined;
  const keyword = searchParams.get('keyword') || '';
  const [keywordDraft, setKeywordDraft] = useState(keyword);
  const page = readPageValue(searchParams.get('page'), 1);
  const pageSize = readPageValue(searchParams.get('pageSize'), 10);
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading } = useGetCertificatesQuery({ ownerType, status, keyword: keyword || undefined, page, pageSize });
  const { data: grouped } = useGetGroupedCertificatesQuery({ groupBy });

  const items = useMemo(() => data?.data ?? [], [data]);

  const applySearch = (updates: Record<string, string | number | null | undefined>) => {
    setSearchParams(updateSearchParams(location.search, updates));
  };

  useEffect(() => {
    setKeywordDraft(keyword);
  }, [keyword]);

  useEffect(() => {
    const storageKey = getScrollStorageKey(location.search);
    const savedScrollTop = window.sessionStorage.getItem(storageKey);

    if (savedScrollTop === null) {
      return;
    }

    const scrollTop = Number(savedScrollTop);
    window.scrollTo(0, Number.isFinite(scrollTop) ? scrollTop : 0);
    window.sessionStorage.removeItem(storageKey);
  }, [location.search]);

  const rememberScrollPosition = () => {
    window.sessionStorage.setItem(getScrollStorageKey(location.search), String(window.scrollY));
  };

  return (
    <section className="page-hero">
      <Typography.Title level={2}>电子证照</Typography.Title>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Segmented
          block
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
        <Button
          className="filter-panel-toggle"
          icon={showFilters ? <UpOutlined /> : <DownOutlined />}
          onClick={() => setShowFilters((current) => !current)}
        >
          {showFilters ? '收起筛选' : '展开筛选'}
        </Button>
        {showFilters ? (
          <Card size="small" className="filter-panel" title={<Space size="small"><FilterOutlined /><span>筛选条件</span></Space>}>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Segmented
                block
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
                style={{ width: '100%' }}
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
                options={[
                  { value: 'active', label: '有效' },
                  { value: 'expired', label: '已过期' },
                  { value: 'archived', label: '已归档' },
                ]}
              />
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
                    ownerType,
                    groupBy,
                    page: 1,
                    pageSize,
                    status,
                  });
                }}
              />
            </Space>
          </Card>
        ) : null}

        <Card className="status-card">
          <Typography.Text type="secondary">当前分组总数：{grouped?.data?.length ?? 0}</Typography.Text>
        </Card>

        <Card loading={isLoading}>
          <List
            dataSource={items}
            renderItem={(item) => (
              <List.Item>
                <List.Item.Meta
                  title={
                    <Link to={buildDetailHref(myRouteConfig.certificates.path, item.id, location.search)} onClick={rememberScrollPosition}>
                      {item.title}
                    </Link>
                  }
                  description={`${item.ownerName} · ${item.expiryDate} · ${item.status}`}
                />
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
                ownerType,
                groupBy,
                status,
                keyword,
              });
            }}
          />
        </Card>

        <Button type="primary" className="page-primary-action">
          新增证照
        </Button>
      </Space>
    </section>
  );
}
