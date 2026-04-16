import { Button, Card, Empty, Input, Select, Space, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { officeRouteConfig } from '../../router/officeRouteConfig';
import { launchOfficeEntry } from './launchOfficeEntry';
import { OfficeEntry, useGetOfficeCategoriesQuery, useGetOfficeEntriesQuery, useOpenOfficeEntryMutation } from './officeApi';

export function OfficeSearchPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [draftKeyword, setDraftKeyword] = useState(searchParams.get('keyword') ?? '');
  const keyword = searchParams.get('keyword') ?? undefined;
  const categoryCode = searchParams.get('categoryCode') ?? undefined;
  const { data: categoryResponse } = useGetOfficeCategoriesQuery();
  const { data: entryResponse, isLoading } = useGetOfficeEntriesQuery({ keyword, categoryCode });
  const [openEntry, { isLoading: isOpening }] = useOpenOfficeEntryMutation();

  const categories = categoryResponse?.data ?? [];
  const results = useMemo(() => entryResponse?.data ?? [], [entryResponse?.data]);

  const submitSearch = () => {
    const next = new URLSearchParams();
    if (draftKeyword.trim()) next.set('keyword', draftKeyword.trim());
    if (categoryCode) next.set('categoryCode', categoryCode);
    setSearchParams(next, { replace: true });
  };

  const handleOpen = async (entry: OfficeEntry) => {
    const response = await openEntry(entry.id).unwrap();
    launchOfficeEntry(navigate, response.data);
  };

  return (
    <>
      <section className="page-hero">
        <Typography.Title level={2}>办事搜索</Typography.Title>
        <Typography.Paragraph type="secondary">按关键词和分类过滤可访问的办事入口。</Typography.Paragraph>
        <Space wrap>
          <Input value={draftKeyword} onChange={(event) => setDraftKeyword(event.target.value)} placeholder="搜索标题或摘要" style={{ width: 260 }} />
          <Select
            value={categoryCode}
            allowClear
            placeholder="分类"
            style={{ width: 180 }}
            onChange={(value) => {
              const next = new URLSearchParams(searchParams);
              if (value) next.set('categoryCode', value);
              else next.delete('categoryCode');
              setSearchParams(next, { replace: true });
            }}
            options={categories.map((category) => ({ label: category.name, value: category.code }))}
          />
          <Button type="primary" onClick={submitSearch}>搜索</Button>
          <Button onClick={() => navigate(officeRouteConfig.officeHome.path)}>返回首页</Button>
        </Space>
      </section>

      <section className="page-card-grid office-card-grid">
        {results.length === 0 ? (
          <Card className="placeholder-card" bordered={false}>
            <Empty description={isLoading ? '搜索中…' : '没有匹配结果'} />
          </Card>
        ) : (
          results.map((entry) => (
            <Card key={entry.id} className="placeholder-card office-entry-card" bordered={false}>
              <Typography.Title level={4}>{entry.title}</Typography.Title>
              <Typography.Paragraph>{entry.summary}</Typography.Paragraph>
              <Button type="primary" loading={isOpening} onClick={() => void handleOpen(entry)}>
                打开入口
              </Button>
            </Card>
          ))
        )}
      </section>
    </>
  );
}
