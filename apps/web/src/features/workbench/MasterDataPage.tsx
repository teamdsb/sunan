import { Alert, Card, Empty, Input, List, Segmented, Select, Space, Spin, Tag, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { useGetMasterDataEquipmentQuery, useGetMasterDataPersonnelQuery, useGetMasterDataSelectorQuery, useGetMasterDataVesselsQuery } from './masterDataApi';

type MasterType = 'vessels' | 'personnel' | 'equipment';
const labels: Record<MasterType, string> = { vessels: '船舶', personnel: '人员', equipment: '设备' };

export function MasterDataPage() {
  const [type, setType] = useState<MasterType>('vessels');
  const [keyword, setKeyword] = useState('');
  const vessels = useGetMasterDataVesselsQuery(); const personnel = useGetMasterDataPersonnelQuery(); const equipment = useGetMasterDataEquipmentQuery();
  const selector = useGetMasterDataSelectorQuery({ type, keyword: keyword || undefined });
  const list = type === 'vessels' ? vessels : type === 'personnel' ? personnel : equipment;
  const options = useMemo(() => (selector.data?.data ?? []).map((item) => ({ value: item.id, label: `${item.name}${item.code ? ` (${item.code})` : ''}` })), [selector.data]);
  if (list.isError) return <section className="page-hero"><Alert type="error" showIcon message="主数据加载失败" description="请检查网络后重试。" /></section>;
  return <section className="page-hero" data-testid="master-data-page"><Typography.Title level={2}>安全主数据中心</Typography.Title><Typography.Paragraph type="secondary">船舶、人员和设备统一关联。新业务选择器仅显示有效且有权限的对象，历史详情保留停用对象和当时名称。</Typography.Paragraph><Space direction="vertical" style={{ width: '100%' }}>
    <Segmented block value={type} options={Object.entries(labels).map(([value, label]) => ({ value, label }))} onChange={(value) => { setType(value as MasterType); setKeyword(''); }} />
    <Card title="受控搜索选择器" size="small"><Space direction="vertical" style={{ width: '100%' }}><Input.Search aria-label="搜索主数据" placeholder="按名称或编码搜索，不需输入 UUID" value={keyword} onChange={(event) => setKeyword(event.target.value)} /><Select aria-label="选择主数据" showSearch loading={selector.isLoading} optionFilterProp="label" placeholder={`选择有效${labels[type]}`} options={options} notFoundContent={selector.isLoading ? <Spin size="small" /> : '没有可选择的有效对象'} /></Space></Card>
    <Card title={`${labels[type]}档案`} loading={list.isLoading}>{(list.data?.data ?? []).length ? <List dataSource={list.data?.data} renderItem={(item) => <List.Item><List.Item.Meta title={item.name} description={item.code ?? item.id} /><Tag color="green">有效</Tag></List.Item>} /> : <Empty description="暂无可见主数据" />}</Card>
  </Space></section>;
}
