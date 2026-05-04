import {
  AppstoreOutlined,
  CompassOutlined,
  GlobalOutlined,
  SafetyOutlined,
  SearchOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { Alert, Button, Card, Empty, Input, Segmented, Space, Tag, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

export function OfficeHomePage() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [categoryCode, setCategoryCode] = useState<string>('all');
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
      <section className="page-hero">
        <Typography.Title level={2}>办事</Typography.Title>
        <Typography.Paragraph type="secondary">
          在企业微信工作台内统一访问办公端口，支持按分类浏览和搜索。
        </Typography.Paragraph>
        <Space wrap>
          <Input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="搜索办事入口"
            prefix={<SearchOutlined />}
            style={{ width: 260 }}
          />
          <Button type="primary" onClick={handleSearch}>
            搜索
          </Button>
          {canManageOffice(categories) ? (
            <Button onClick={() => navigate(officeRouteConfig.officeAdmin.path)}>进入治理台</Button>
          ) : null}
        </Space>
      </section>

      <section className="page-hero office-filter-panel">
        <Segmented block options={categoryOptions} value={categoryCode} onChange={(value) => setCategoryCode(String(value))} />
      </section>

      <section className="page-card-grid office-card-grid" data-testid="office-entry-grid">
        {entries.length === 0 ? (
          <Card className="placeholder-card" bordered={false}>
            <Empty description={isLoading ? '办事入口加载中…' : '当前没有可访问的办事入口'} />
          </Card>
        ) : (
          entries.map((entry) => {
            const Icon = iconMap[entry.categoryCode as keyof typeof iconMap] ?? AppstoreOutlined;
            return (
              <Card key={entry.id} className="placeholder-card office-entry-card" bordered={false}>
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <Space>
                    <span className="my-home-shortcut-icon my-home-shortcut-icon-plain" aria-hidden="true">
                      <Icon />
                    </span>
                    <div>
                      <Typography.Title level={4}>{entry.title}</Typography.Title>
                      <Tag>{categories.find((category) => category.code === entry.categoryCode)?.name ?? entry.categoryCode}</Tag>
                    </div>
                  </Space>
                  <Typography.Paragraph>{entry.summary}</Typography.Paragraph>
                  <Button type="primary" onClick={() => void handleOpen(entry)} loading={isOpening}>
                    打开入口
                  </Button>
                </Space>
              </Card>
            );
          })
        )}
      </section>

      <section className="page-card-grid">
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
