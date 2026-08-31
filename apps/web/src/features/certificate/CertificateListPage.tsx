import { Alert, Button, Card, DatePicker, Drawer, Form, Input, InputNumber, List, Pagination, Segmented, Select, Space, Switch, Tag, Typography, message } from 'antd';
import { EditOutlined, PlusOutlined } from '@ant-design/icons';
import { DownOutlined, FilterOutlined, UpOutlined } from '@ant-design/icons';
import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { myRouteConfig } from '../../router/myRouteConfig';
import { buildDetailHref, updateSearchParams } from '../../router/myRouteState';
import { useAppSelector } from '../../app/hooks';
import { canManageCompanyContent } from '../auth/permissions';
import { FileUploadField } from '../files/FileUploadField';
import type { FileRecord } from '../files/types';
import {
  type CertificateItem,
  type CreateCertificateInput,
  useCreateCertificateMutation,
  useGetCertificateOwnersQuery,
  useGetCertificateReminderRecipientsQuery,
  useGetCertificateTypesQuery,
  useGetCertificatesQuery,
  useGetGroupedCertificatesQuery,
} from './certificateApi';
import { formatShanghaiDateTime, toShanghaiIso } from '../../utils/dateTime';

const ownerTabs = [
  { label: '船舶', value: 'vessel' },
  { label: '车辆', value: 'vehicle' },
  { label: '人员', value: 'personnel' },
  { label: '设备', value: 'equipment' },
] as const;
const scrollStoragePrefix = 'certificate-list-scroll:';
const ownerTypeLabelMap: Record<string, string> = { vessel: '船舶', vehicle: '车辆', personnel: '人员', equipment: '设备' };

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
  const roles = useAppSelector((state) => state.auth.currentUser?.roles ?? []);
  const canManage = canManageCompanyContent(roles);
  const [searchParams, setSearchParams] = useSearchParams();
  const [messageApi, contextHolder] = message.useMessage();
  const ownerType = (searchParams.get('ownerType') as 'vessel' | 'vehicle' | 'personnel' | 'equipment' | null) || 'vessel';
  const rawGroupBy = searchParams.get('groupBy');
  const groupBy = 'type' as const;
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
  const { data: recipientResponse } = useGetCertificateReminderRecipientsQuery(undefined, { skip: !canManage });
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
    if (!rawGroupBy || rawGroupBy === 'type') {
      return;
    }

    const next = new URLSearchParams(searchParams);
    next.set('groupBy', 'type');
    setSearchParams(next, { replace: true });
  }, [rawGroupBy, searchParams, setSearchParams]);

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
    setCreateError(null);
    try {
      const values = await form.validateFields();
      const payload: CreateCertificateInput = {
        ...values,
        ownerType: createOwnerType,
        issueDate: toShanghaiIso(values.issueDate),
        expiryDate: toShanghaiIso(values.expiryDate) ?? values.expiryDate,
        reminderRecipientUserId: values.reminderRecipientUserId ?? null,
        status: values.status ?? 'active',
        ...(upload?.id ? { fileIds: [upload.id] } : {}),
      };
      await createCertificate(payload).unwrap();
      messageApi.success('电子证照已新增');
      setCreateOpen(false);
      setUpload(null);
      form.resetFields();
    } catch (error) {
      const message = toErrorMessage(error);
      setCreateError(message);
      messageApi.error(message);
    }
  };

  return (
    <section className="page-hero">
      {contextHolder}
      <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
        <div>
          <Typography.Title level={2} style={{ marginBottom: 4 }}>电子证照</Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>按证照分类管理持有对象的证照、有效期、提醒和附件。</Typography.Paragraph>
        </div>
        {canManage ? <Button aria-label="新增证照" type="primary" icon={<PlusOutlined />} onClick={openCreateDrawer}>新增证照</Button> : null}
      </Space>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Segmented
          block
          options={ownerTabs as unknown as Array<{ label: string; value: string }>}
          value={ownerType}
          onChange={(value) => {
            applySearch({
              ownerType: value as CertificateItem['ownerType'],
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
              <Button type="link" size="small" onClick={() => applySearch({ groupBy: 'type', ownerType, page, pageSize, status, keyword })}>按类型分组</Button>
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

        <Card className="status-card" title="按证照分类">
          <Space direction="vertical" style={{ width: '100%' }} size="small">
            <Typography.Text strong>
              证照总数：{(grouped?.data ?? []).reduce((total, group) => total + group.count, 0)}
            </Typography.Text>
            {(grouped?.data ?? []).length ? (grouped?.data ?? []).map((group) => (
              <Space key={group.groupKey} style={{ justifyContent: 'space-between', width: '100%' }}>
                <Typography.Text>{group.groupLabel}</Typography.Text>
                <Typography.Text type="secondary">{group.count} 张</Typography.Text>
              </Space>
            )) : <Typography.Text type="secondary">暂无分组数据</Typography.Text>}
          </Space>
        </Card>

        <Card loading={isLoading}>
          <List
            dataSource={items}
            renderItem={(item) => (
              <List.Item>
                <List.Item.Meta
                  title={<Space><Link to={buildDetailHref(myRouteConfig.certificates.path, item.id, location.search)} onClick={rememberScrollPosition}>{item.title}</Link><Tag>{item.certificateTypeName}</Tag></Space>}
                  description={<Space direction="vertical" size={2}><Typography.Text>持有对象：{item.ownerName}（{ownerTypeLabelMap[item.ownerType] ?? item.ownerType}）</Typography.Text><Typography.Text type="secondary">编号：{item.certificateNo || '-'} · 签发：{formatShanghaiDateTime(item.issueDate)} · 到期：{formatShanghaiDateTime(item.expiryDate)}</Typography.Text><Typography.Text type="secondary">签发机构：{item.issuer || '-'} · 附件：{(item.files ?? []).length} 个 · 提醒：{item.reminderEnabled === false ? '已关闭' : item.reminderRecipientUserId || '按部门规则'}</Typography.Text></Space>}
                />
                {canManage ? <Button type="link" icon={<EditOutlined />} href={buildDetailHref(myRouteConfig.certificates.path, item.id, location.search)} onClick={rememberScrollPosition}>编辑</Button> : null}
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

      </Space>

      {canManage ? <Drawer
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
          <Form.Item label="持有对象" required>
            <Form.Item name="ownerId" noStyle rules={[{ required: true, message: '请选择持有对象' }]}>
              <Select aria-label="持有对象" showSearch loading={loadingOwners} placeholder="选择船舶、车辆、人员或设备" optionFilterProp="label" options={owners.map((item) => ({ value: item.id, label: `${item.name} (${item.code})` }))} />
            </Form.Item>
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
          <Form.Item name="issueDate" label="签发日期" getValueProps={(value?: string) => ({ value: value ? dayjs(value) : undefined })} getValueFromEvent={(value) => value?.format('YYYY-MM-DD HH:mm')}>
            <DatePicker showTime format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="expiryDate" label="到期日" rules={[{ required: true, message: '请选择到期日' }]} getValueProps={(value?: string) => ({ value: value ? dayjs(value) : undefined })} getValueFromEvent={(value) => value?.format('YYYY-MM-DD HH:mm')}>
            <DatePicker showTime format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} />
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
          <Form.Item name="reminderEnabled" label="企业微信提醒" valuePropName="checked" initialValue={true} extra="关闭后仍可保存证照，不生成提醒"><Switch /></Form.Item>
          <Form.Item name="reminderRecipientUserId" label="提醒负责人" extra="可不设置；未设置时按部门规则通知"><Select allowClear showSearch optionFilterProp="label" placeholder="可选负责人" options={(recipientResponse?.data ?? []).map((recipient) => ({ value: recipient.userId, label: `${recipient.name}${recipient.position ? ` · ${recipient.position}` : ''}` }))} /></Form.Item>
          <Form.Item label="附件">
            <FileUploadField category="certificates" value={upload} onChange={setUpload} />
          </Form.Item>
        </Form>
      </Drawer> : null}
    </section>
  );
}
