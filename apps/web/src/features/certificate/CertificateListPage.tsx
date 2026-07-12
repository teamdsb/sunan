import { Alert, Button, Card, Drawer, Form, Input, InputNumber, List, Pagination, Segmented, Select, Space, Typography, message } from 'antd';
import { DownOutlined, FilterOutlined, UpOutlined } from '@ant-design/icons';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { myRouteConfig } from '../../router/myRouteConfig';
import { buildDetailHref, updateSearchParams } from '../../router/myRouteState';
import { FileUploadField } from '../files/FileUploadField';
import type { FileRecord } from '../files/types';
import {
  type CertificateItem,
  type CreateCertificateInput,
  useCreateCertificateMutation,
  useGetCertificateOwnersQuery,
  useGetCertificateTypesQuery,
  useGetCertificatesQuery,
  useGetGroupedCertificatesQuery,
} from './certificateApi';
import { useGetSettingsQuery } from '../settings/settingsApi';

const ownerTabs = [
  { label: '船舶', value: 'vessel' },
  { label: '车辆', value: 'vehicle' },
  { label: '人员', value: 'personnel' },
  { label: '设备', value: 'equipment' },
] as const;
const scrollStoragePrefix = 'certificate-list-scroll:';
const certificateStatusLabelMap: Record<string, string> = {
  active: '有效',
  expired: '已过期',
  archived: '已归档',
};

function formatCertificateStatus(status: string) {
  return certificateStatusLabelMap[status] ?? '未知状态';
}

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

function toErrorMessage(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'data' in error &&
    typeof error.data === 'object' &&
    error.data !== null &&
    'message' in error.data &&
    typeof error.data.message === 'string'
  ) {
    return error.data.message;
  }

  return error instanceof Error ? error.message : '新增证照失败，请稍后重试';
}

export function CertificateListPage() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: settings } = useGetSettingsQuery();
  const [messageApi, contextHolder] = message.useMessage();
  const ownerType = (searchParams.get('ownerType') as 'vessel' | 'vehicle' | 'personnel' | 'equipment' | null) || 'vessel';
  const groupBy =
    (searchParams.get('groupBy') as 'owner' | 'type' | null) || settings?.data.certificateGroupBy || 'owner';
  const status = searchParams.get('status') || undefined;
  const keyword = searchParams.get('keyword') || '';
  const [keywordDraft, setKeywordDraft] = useState(keyword);
  const page = readPageValue(searchParams.get('page'), 1);
  const pageSize = readPageValue(searchParams.get('pageSize'), 10);
  const [showFilters, setShowFilters] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createOwnerType, setCreateOwnerType] = useState<CertificateItem['ownerType']>(ownerType);
  const [createError, setCreateError] = useState<string | null>(null);
  const [upload, setUpload] = useState<FileRecord | null>(null);
  const [form] = Form.useForm<CreateCertificateInput>();

  const { data, isLoading } = useGetCertificatesQuery({ ownerType, status, keyword: keyword || undefined, page, pageSize });
  const { data: grouped } = useGetGroupedCertificatesQuery({ groupBy });
  const { data: typeResponse, isLoading: loadingTypes } = useGetCertificateTypesQuery({ ownerType: createOwnerType });
  const { data: ownerResponse, isLoading: loadingOwners } = useGetCertificateOwnersQuery({ ownerType: createOwnerType });
  const [createCertificate, { isLoading: creating }] = useCreateCertificateMutation();

  const items = useMemo(() => data?.data ?? [], [data]);
  const certificateTypes = useMemo(() => typeResponse?.data ?? [], [typeResponse]);
  const owners = useMemo(() => ownerResponse?.data ?? [], [ownerResponse]);

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

  const openCreateDrawer = () => {
    setCreateError(null);
    setUpload(null);
    setCreateOwnerType(ownerType);
    form.resetFields();
    form.setFieldsValue({
      ownerType,
      status: 'active',
    });
    setCreateOpen(true);
  };

  const submitCreate = async () => {
    const values = await form.validateFields();
    setCreateError(null);
    try {
      const payload: CreateCertificateInput = {
        ...values,
        ownerType: createOwnerType,
        status: values.status ?? 'active',
        ...(upload?.id ? { fileIds: [upload.id] } : {}),
      };
      await createCertificate(payload).unwrap();
      messageApi.success('电子证照已新增');
      setCreateOpen(false);
      setUpload(null);
      form.resetFields();
    } catch (error) {
      setCreateError(toErrorMessage(error));
    }
  };

  return (
    <section className="page-hero">
      {contextHolder}
      <Typography.Title level={2}>电子证照</Typography.Title>
      <Typography.Paragraph type="secondary">
        按持有对象、状态和关键词查询证照，并查看到期与附件信息。
      </Typography.Paragraph>
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
                  description={`${item.ownerName} · ${item.expiryDate} · ${formatCertificateStatus(item.status)}`}
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

        <Button type="primary" className="page-primary-action" onClick={openCreateDrawer}>
          新增证照
        </Button>
      </Space>

      <Drawer
        title="新增电子证照"
        placement="right"
        width={520}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        extra={
          <Button type="primary" loading={creating} onClick={() => void submitCreate()}>
            保存
          </Button>
        }
      >
        {createError ? <Alert type="error" showIcon message={createError} style={{ marginBottom: 12 }} /> : null}
        <Form form={form} layout="vertical" className="stacked-form" initialValues={{ ownerType: createOwnerType, status: 'active' }}>
          <Form.Item label="持有对象类型">
            <Segmented
              block
              options={ownerTabs as unknown as Array<{ label: string; value: string }>}
              value={createOwnerType}
              onChange={(value) => {
                setCreateOwnerType(value as CertificateItem['ownerType']);
                setCreateError(null);
                setUpload(null);
                form.setFieldsValue({
                  ownerType: value as CertificateItem['ownerType'],
                  ownerId: undefined,
                  certificateTypeId: undefined,
                });
              }}
            />
          </Form.Item>
          <Form.Item name="ownerType" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="ownerId" label="持有对象" rules={[{ required: true, message: '请选择持有对象' }]}>
            <Select
              showSearch
              loading={loadingOwners}
              placeholder="选择船舶、车辆、人员或设备"
              optionFilterProp="label"
              options={owners.map((item) => ({
                value: item.id,
                label: `${item.name} (${item.code})`,
              }))}
            />
          </Form.Item>
          <Form.Item name="certificateTypeId" label="证照类型" rules={[{ required: true, message: '请选择证照类型' }]}>
            <Select
              showSearch
              loading={loadingTypes}
              placeholder="选择证照类型"
              optionFilterProp="label"
              options={certificateTypes.map((item) => ({
                value: item.id,
                label: `${item.name} · 提前 ${item.defaultAdvanceDays} 天提醒`,
              }))}
            />
          </Form.Item>
          <Form.Item name="title" label="证照标题" rules={[{ required: true, message: '请输入证照标题' }]}>
            <Input placeholder="例如：苏南012 船舶国籍证书" maxLength={128} />
          </Form.Item>
          <Form.Item name="certificateNo" label="证照编号">
            <Input placeholder="证照编号" maxLength={128} />
          </Form.Item>
          <Form.Item name="issueDate" label="签发日期">
            <Input type="date" />
          </Form.Item>
          <Form.Item name="expiryDate" label="到期日" rules={[{ required: true, message: '请选择到期日' }]}>
            <Input type="date" />
          </Form.Item>
          <Form.Item name="advanceDays" label="提前提醒天数">
            <InputNumber min={1} style={{ width: '100%' }} placeholder="默认使用证照类型配置" />
          </Form.Item>
          <Form.Item name="issuer" label="签发机构">
            <Input placeholder="签发机构" maxLength={128} />
          </Form.Item>
          <Form.Item name="status" label="状态" rules={[{ required: true, message: '请选择状态' }]}>
            <Select
              options={[
                { value: 'active', label: '有效' },
                { value: 'expired', label: '已过期' },
                { value: 'archived', label: '已归档' },
              ]}
            />
          </Form.Item>
          <Form.Item name="remarks" label="备注">
            <Input.TextArea rows={3} placeholder="备注" />
          </Form.Item>
          <Form.Item label="附件">
            <FileUploadField category="certificates" value={upload} onChange={setUpload} />
          </Form.Item>
        </Form>
      </Drawer>
    </section>
  );
}
