import {
  AppstoreOutlined,
  CompassOutlined,
  GlobalOutlined,
  ReconciliationOutlined,
  RightOutlined,
  SafetyOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { Alert, Button, Input, Segmented, Typography } from 'antd';
import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { officeRouteConfig } from '../../router/officeRouteConfig';
import { launchOfficeEntry } from './launchOfficeEntry';
import { canManageOffice } from './officePermissions';
import {
  OfficeEntry,
  useGetOfficeCategoriesQuery,
  useGetOfficeEntriesQuery,
  useOpenOfficeEntryMutation,
} from './officeApi';

const iconMap = {
  maritime: SafetyOutlined,
  customs: GlobalOutlined,
  border_inspection: CompassOutlined,
  vessel_inspection: ReconciliationOutlined,
  environment: GlobalOutlined,
  petrochemical_park: AppstoreOutlined,
  other: AppstoreOutlined,
} as const;

function formatCategoryName(
  categories: Array<{ code: string; name: string }>,
  code: string,
) {
  return (
    categories.find((category) => category.code === code)?.name ?? '未分类'
  );
}

export function OfficeHomePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const keyword = searchParams.get('keyword') ?? '';
  const categoryCode = searchParams.get('categoryCode') ?? 'all';
  const { data: categoryResponse, isError: categoriesError } =
    useGetOfficeCategoriesQuery();
  const {
    data: entryResponse,
    isLoading,
    isError: entriesError,
  } = useGetOfficeEntriesQuery(
    categoryCode === 'all' ? undefined : { categoryCode },
  );
  const [openEntry, { isLoading: isOpening }] = useOpenOfficeEntryMutation();

  const categories = categoryResponse?.data ?? [];
  const entries = useMemo(() => {
    const rows = entryResponse?.data ?? [];
    const normalized = keyword.trim().toLowerCase();
    if (!normalized) {
      return rows;
    }
    return rows.filter((entry) =>
      `${entry.title} ${entry.summary}`.toLowerCase().includes(normalized),
    );
  }, [entryResponse?.data, keyword]);

  const categoryOptions = [
    { label: '全部', value: 'all' },
    ...categories
      .filter((category) => category.code !== 'other')
      .map((category) => ({ label: category.name, value: category.code })),
  ];

  const updateParams = (nextValues: {
    keyword?: string;
    categoryCode?: string;
  }) => {
    const next = new URLSearchParams(searchParams);
    if (nextValues.keyword !== undefined) {
      const nextKeyword = nextValues.keyword.trim();
      if (nextKeyword) next.set('keyword', nextKeyword);
      else next.delete('keyword');
    }
    if (nextValues.categoryCode !== undefined) {
      if (nextValues.categoryCode === 'all') next.delete('categoryCode');
      else next.set('categoryCode', nextValues.categoryCode);
    }
    setSearchParams(next, { replace: true });
  };

  const handleSearch = () => {
    const search = new URLSearchParams();
    if (keyword.trim()) search.set('keyword', keyword.trim());
    if (categoryCode !== 'all') search.set('categoryCode', categoryCode);
    navigate(
      `${officeRouteConfig.officeSearch.path}${search.toString() ? `?${search.toString()}` : ''}`,
    );
  };

  const handleOpen = async (entry: OfficeEntry) => {
    const response = await openEntry(entry.id).unwrap();
    launchOfficeEntry(navigate, response.data);
  };

  const featuredEntries = entries.slice(0, 3);

  return (
    <div className="office-mobile-home">
      {categoriesError || entriesError ? (
        <Alert
          type="error"
          showIcon
          message="办事入口加载失败"
          description="请检查网络后刷新页面。"
        />
      ) : null}
      <section
        className="office-mobile-hero"
        aria-labelledby="office-home-title"
      >
        <div className="office-mobile-hero-copy">
          <Typography.Title level={1} id="office-home-title">
            办事中心
          </Typography.Title>
          <Typography.Paragraph>搜索并打开办事入口</Typography.Paragraph>
        </div>
        <div className="office-mobile-hero-action">
          {canManageOffice(categories) ? (
            <Button
              type="primary"
              aria-label="进入治理台"
              icon={<AppstoreOutlined />}
              onClick={() => navigate(officeRouteConfig.officeAdmin.path)}
            >
              治理台
            </Button>
          ) : null}
        </div>
      </section>

      <section className="office-search-panel office-mobile-search-panel">
        <Input.Search
          value={keyword}
          onChange={(event) => updateParams({ keyword: event.target.value })}
          onSearch={handleSearch}
          placeholder="搜索办事入口"
          prefix={<SearchOutlined />}
          enterButton="搜索"
        />
      </section>

      <section className="office-filter-panel office-mobile-filter-panel">
        <Segmented
          options={categoryOptions}
          value={categoryCode}
          onChange={(value) => updateParams({ categoryCode: String(value) })}
        />
      </section>

      <section className="office-dashboard office-mobile-dashboard">
        <div className="office-entry-panel office-mobile-entry-panel">
          <div className="sunan-panel-heading">
            <Typography.Title level={2}>办事入口</Typography.Title>
            <Button type="link" onClick={handleSearch}>
              全部办事 <RightOutlined />
            </Button>
          </div>
          <div className="office-card-grid" data-testid="office-entry-grid">
            {featuredEntries.length === 0 ? (
              <div className="office-mobile-empty">
                {isLoading ? '办事入口加载中…' : '当前没有可访问的办事入口'}
              </div>
            ) : (
              featuredEntries.map((entry) => {
                const Icon =
                  iconMap[entry.categoryCode as keyof typeof iconMap] ??
                  AppstoreOutlined;

                return (
                  <button
                    type="button"
                    key={entry.id}
                    className="office-entry-card office-mobile-entry-row"
                    onClick={() => void handleOpen(entry)}
                    disabled={isOpening}
                    aria-label={`打开入口 ${entry.title}`}
                  >
                    <span className="module-entry-icon" aria-hidden="true">
                      <Icon />
                    </span>
                    <span className="office-mobile-entry-copy">
                      <span className="office-mobile-entry-title">
                        <Typography.Title level={3}>
                          {entry.title}
                        </Typography.Title>
                        <em>
                          {formatCategoryName(categories, entry.categoryCode)}
                        </em>
                      </span>
                      <Typography.Paragraph>
                        {entry.summary}
                      </Typography.Paragraph>
                    </span>
                    <RightOutlined
                      className="office-mobile-row-chevron"
                      aria-hidden="true"
                    />
                  </button>
                );
              })
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
