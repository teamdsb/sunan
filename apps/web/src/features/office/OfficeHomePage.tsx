import {
  AppstoreOutlined,
  CompassOutlined,
  GlobalOutlined,
  SafetyOutlined,
  SearchOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { Alert, Button, Card, Empty, Input, Segmented, Space, Tag, Typography } from 'antd';
import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { officeRouteConfig } from '../../router/officeRouteConfig';
import { launchOfficeEntry } from './launchOfficeEntry';
import { canManageOffice } from './officePermissions';
import { OfficeEntry, useGetOfficeCategoriesQuery, useGetOfficeEntriesQuery, useOpenOfficeEntryMutation } from './officeApi';

const iconMap = {
  maritime: SafetyOutlined,
  customs: GlobalOutlined,
  border_inspection: CompassOutlined,
  vessel_inspection: SafetyOutlined,
  environment: GlobalOutlined,
  petrochemical_park: AppstoreOutlined,
  other: SettingOutlined,
} as const;

const approvalSteps = [
  { step: '01', title: '资料提交', note: '申请人上传表单与附件', status: '完成' },
  { step: '02', title: '部门审核', note: '船务部或总经办确认', status: '进行中' },
  { step: '03', title: '外部办理', note: '海事 / 船检 / 园区', status: '待触发' },
  { step: '04', title: '结果归档', note: '证照与附件回写', status: '自动' },
] as const;

function formatCategoryName(categories: Array<{ code: string; name: string }>, code: string) {
  return categories.find((category) => category.code === code)?.name ?? '未分类';
}

export function OfficeHomePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const keyword = searchParams.get('keyword') ?? '';
  const categoryCode = searchParams.get('categoryCode') ?? 'all';
  const { data: categoryResponse } = useGetOfficeCategoriesQuery();
  const { data: entryResponse, isLoading } = useGetOfficeEntriesQuery(categoryCode === 'all' ? undefined : { categoryCode });
  const [openEntry, { isLoading: isOpening }] = useOpenOfficeEntryMutation();

  const categories = categoryResponse?.data ?? [];
  const entries = useMemo(() => {
    const rows = entryResponse?.data ?? [];
    const normalized = keyword.trim().toLowerCase();
    if (!normalized) {
      return rows;
    }
    return rows.filter((entry) => `${entry.title} ${entry.summary}`.toLowerCase().includes(normalized));
  }, [entryResponse?.data, keyword]);

  const categoryOptions = [
    { label: '全部', value: 'all' },
    ...categories.map((category) => ({ label: category.name, value: category.code })),
  ];

  const updateParams = (nextValues: { keyword?: string; categoryCode?: string }) => {
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
    navigate(`${officeRouteConfig.officeSearch.path}${search.toString() ? `?${search.toString()}` : ''}`);
  };

  const handleOpen = async (entry: OfficeEntry) => {
    const response = await openEntry(entry.id).unwrap();
    launchOfficeEntry(navigate, response.data);
  };

  return (
    <>
      <section className="page-hero sunan-page-hero office-command-hero">
        <div>
          <Typography.Title level={2}>统一办事入口，按部门与主题快速办理</Typography.Title>
          <Typography.Paragraph type="secondary">
            搜索、分类、审批链路和治理台入口集中在同一屏，降低企业微信 H5 跳转成本。
          </Typography.Paragraph>
        </div>
        <Space wrap className="sunan-hero-actions">
          {canManageOffice(categories) ? (
            <Button type="primary" onClick={() => navigate(officeRouteConfig.officeAdmin.path)}>进入治理台</Button>
          ) : null}
        </Space>
      </section>

      <section className="office-search-panel">
        <Input
          value={keyword}
          onChange={(event) => updateParams({ keyword: event.target.value })}
          onPressEnter={handleSearch}
          placeholder="搜索办事入口、表单或审批事项"
          prefix={<SearchOutlined />}
        />
        <Button type="primary" onClick={handleSearch}>
          搜索
        </Button>
        <Button onClick={handleSearch}>高级筛选</Button>
      </section>

      <section className="office-filter-panel">
        <Segmented options={categoryOptions} value={categoryCode} onChange={(value) => updateParams({ categoryCode: String(value) })} />
      </section>

      <section className="office-dashboard">
        <div className="office-entry-panel">
          <div className="sunan-panel-heading">
            <Typography.Title level={2}>高频办事入口</Typography.Title>
            <Typography.Text>共 {entries.length} 个入口</Typography.Text>
          </div>
          <div className="office-card-grid" data-testid="office-entry-grid">
            {entries.length === 0 ? (
              <Card className="placeholder-card" variant="borderless">
                <Empty description={isLoading ? '办事入口加载中…' : '当前没有可访问的办事入口'} />
              </Card>
            ) : (
              entries.map((entry) => {
                const Icon = iconMap[entry.categoryCode as keyof typeof iconMap] ?? AppstoreOutlined;
                return (
                  <Card key={entry.id} className="placeholder-card office-entry-card" variant="borderless">
                    <Space direction="vertical" size="middle" className="office-entry-card-body">
                      <span className="module-entry-icon" aria-hidden="true">
                        <Icon />
                      </span>
                      <div>
                        <Typography.Title level={4}>{entry.title}</Typography.Title>
                        <Typography.Paragraph>{entry.summary}</Typography.Paragraph>
                      </div>
                      <div className="office-entry-card-footer">
                        <Tag>{formatCategoryName(categories, entry.categoryCode)}</Tag>
                        <Button type="primary" onClick={() => void handleOpen(entry)} loading={isOpening}>
                          打开入口
                        </Button>
                      </div>
                    </Space>
                  </Card>
                );
              })
            )}
          </div>
        </div>

        <aside className="office-approval-panel" aria-labelledby="office-approval-title">
          <div className="sunan-panel-heading">
            <Typography.Title level={2} id="office-approval-title">审批链路</Typography.Title>
            <Typography.Text>近 7 天</Typography.Text>
          </div>
          <div className="office-approval-list">
            {approvalSteps.map((item) => (
              <article className="office-approval-item" key={item.step}>
                <span>{item.step}</span>
                <div>
                  <strong>{item.title}</strong>
                  <small>{item.note}</small>
                </div>
                <Tag>{item.status}</Tag>
              </article>
            ))}
          </div>
        </aside>
      </section>

      <section className="sunan-alert-band">
        <Alert
          type="info"
          showIcon
          message="企业微信上线提醒"
          description="工作台主页地址、可信域名、OAuth2 回调域名和 JS 接口安全域名需要保持正式 HTTPS 域名并在企业微信后台一致配置。"
        />
      </section>
    </>
  );
}
