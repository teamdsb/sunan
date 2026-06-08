import { PlusOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Drawer, Form, Input, InputNumber, Select, Space, Table, Tag, Typography, message } from 'antd';
import { useMemo, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import { canManageOffice } from './officePermissions';
import {
  OfficeAdminEntry,
  OfficeAuditRecord,
  OfficeEntryMutationPayload,
  useCreateOfficeEntryMutation,
  useDisableOfficeEntryMutation,
  useGetOfficeAdminAuditsQuery,
  useGetOfficeAdminEntriesQuery,
  useGetOfficeCategoriesQuery,
  usePublishOfficeEntryMutation,
  useUpdateOfficeEntryMutation,
} from './officeApi';

const roleLabelMap: Record<string, string> = {
  all_authenticated: '全体成员',
  system_admin: '系统管理员',
  general_office: '总经办',
  finance: '财务部',
  business: '业务部',
  shipping: '船务部',
  logistics: '后勤部',
  crew: '船员',
};

const roleOptions = Object.entries(roleLabelMap).map(([value, label]) => ({ label, value }));

const statusLabelMap: Record<string, string> = {
  draft: '草稿',
  published: '已发布',
  disabled: '已停用',
};

const auditActionLabelMap: Record<string, string> = {
  create: '创建',
  update: '更新',
  publish: '发布',
  disable: '停用',
  open: '打开',
};

const targetTypeOptions = [
  { label: '外部地址', value: 'external_url' },
  { label: '站内路由', value: 'internal_route' },
];

const openModeOptions = [
  { label: '当前 WebView', value: 'current_webview' },
  { label: '新窗口', value: 'new_window' },
];

function formatCategoryName(categories: Array<{ code: string; name: string }>, code: string) {
  return categories.find((category) => category.code === code)?.name ?? '未分类';
}

function formatEntryStatus(status: string) {
  return statusLabelMap[status] ?? '未知状态';
}

function formatAuditAction(action: string) {
  return auditActionLabelMap[action] ?? '其他操作';
}

export function OfficeAdminPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const { data: categoryResponse } = useGetOfficeCategoriesQuery();
  const categories = categoryResponse?.data ?? [];
  const [query, setQuery] = useState<{
    keyword?: string;
    categoryCode?: string;
    status?: 'draft' | 'published' | 'disabled';
  }>({});
  const { data: entryResponse, isLoading } = useGetOfficeAdminEntriesQuery(query);
  const [createEntry, { isLoading: isCreating }] = useCreateOfficeEntryMutation();
  const [updateEntry, { isLoading: isUpdating }] = useUpdateOfficeEntryMutation();
  const [publishEntry, { isLoading: isPublishing }] = usePublishOfficeEntryMutation();
  const [disableEntry, { isLoading: isDisabling }] = useDisableOfficeEntryMutation();
  const [open, setOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<OfficeAdminEntry | null>(null);
  const [auditAction, setAuditAction] = useState<OfficeAuditRecord['action'] | undefined>(undefined);
  const [auditEntryId, setAuditEntryId] = useState<string | undefined>(undefined);
  const { data: auditResponse, isLoading: isAuditLoading } = useGetOfficeAdminAuditsQuery({
    action: auditAction,
    entryId: auditEntryId,
    page: 1,
    pageSize: 20,
  });
  const [form] = Form.useForm<OfficeEntryMutationPayload>();

  const entries = entryResponse?.data ?? [];
  const manageable = canManageOffice(categories);
  const categoryOptions = categories.filter((category) => category.canManage).map((category) => ({ label: category.name, value: category.code }));
  const audits = auditResponse?.data ?? [];

  const columns: ColumnsType<OfficeAdminEntry> = useMemo(
    () => [
      { title: '标题', dataIndex: 'title', key: 'title' },
      {
        title: '分类',
        dataIndex: 'categoryCode',
        key: 'categoryCode',
        render: (value: string) => formatCategoryName(categories, value),
      },
      { title: '目标', dataIndex: 'targetValue', key: 'targetValue', ellipsis: true },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        render: (value: string) => <Tag color={value === 'published' ? 'green' : value === 'disabled' ? 'default' : 'gold'}>{formatEntryStatus(value)}</Tag>,
      },
      {
        title: '操作',
        key: 'actions',
        render: (_, record) => (
          <Space wrap>
            <Button onClick={() => handleEdit(record)}>编辑</Button>
            <Button type="primary" ghost disabled={record.status === 'published'} loading={isPublishing} onClick={() => void handlePublish(record.id)}>
              发布
            </Button>
            <Button danger ghost disabled={record.status === 'disabled'} loading={isDisabling} onClick={() => void handleDisable(record.id)}>
              停用
            </Button>
          </Space>
        ),
      },
    ],
    [categories, isDisabling, isPublishing],
  );

  const auditColumns: ColumnsType<OfficeAuditRecord> = useMemo(
    () => [
      { title: '时间', dataIndex: 'createdAt', key: 'createdAt', render: (value: string) => new Date(value).toLocaleString('zh-CN') },
      { title: '动作', dataIndex: 'action', key: 'action', render: (value: string) => formatAuditAction(value) },
      { title: '入口', dataIndex: 'entryTitle', key: 'entryTitle' },
      { title: '分类', dataIndex: 'categoryCode', key: 'categoryCode', render: (value: string) => formatCategoryName(categories, value) },
      { title: '操作人', dataIndex: 'operatorUserId', key: 'operatorUserId' },
    ],
    [categories],
  );

  const handleCreate = () => {
    setEditingEntry(null);
    form.resetFields();
    form.setFieldsValue({ openMode: 'current_webview', visibilityRoles: ['all_authenticated'] });
    setOpen(true);
  };

  const handleEdit = (entry: OfficeAdminEntry) => {
    setEditingEntry(entry);
    form.setFieldsValue({
      categoryCode: entry.categoryCode,
      title: entry.title,
      summary: entry.summary,
      iconType: entry.iconType,
      targetType: entry.targetType,
      targetValue: entry.targetValue,
      openMode: entry.openMode,
      visibilityRoles: entry.visibilityRoles,
      managerRoles: entry.managerRoles,
      sortOrder: entry.sortOrder,
    });
    setOpen(true);
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    if (editingEntry) {
      await updateEntry({ id: editingEntry.id, data: values }).unwrap();
      messageApi.success('办事入口已更新');
    } else {
      await createEntry(values).unwrap();
      messageApi.success('办事入口已创建');
    }
    setOpen(false);
  };

  const handlePublish = async (id: string) => {
    await publishEntry(id).unwrap();
    messageApi.success('办事入口已发布');
  };

  const handleDisable = async (id: string) => {
    await disableEntry(id).unwrap();
    messageApi.success('办事入口已停用');
  };

  if (!manageable) {
    return (
      <section className="page-hero">
        <Typography.Title level={2}>办事治理台</Typography.Title>
        <Alert type="warning" showIcon message="当前账号没有办事分类维护权限。" />
      </section>
    );
  }

  return (
    <>
      {contextHolder}
      <section className="page-hero">
        <Typography.Title level={2}>办事治理台</Typography.Title>
        <Typography.Paragraph type="secondary">按分类分权维护办事入口，并执行发布与停用治理。</Typography.Paragraph>
        <Space wrap>
          <Input.Search
            placeholder="搜索标题或摘要"
            allowClear
            onSearch={(value) => setQuery((prev) => ({ ...prev, keyword: value || undefined }))}
            style={{ width: 260 }}
          />
          <Select
            placeholder="分类"
            allowClear
            style={{ width: 180 }}
            onChange={(value) => setQuery((prev) => ({ ...prev, categoryCode: value }))}
            options={categoryOptions}
          />
          <Select
            placeholder="状态"
            allowClear
            style={{ width: 160 }}
            onChange={(value) => setQuery((prev) => ({ ...prev, status: value }))}
            options={[
              { label: '草稿', value: 'draft' },
              { label: '已发布', value: 'published' },
              { label: '已停用', value: 'disabled' },
            ]}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>新增入口</Button>
        </Space>
      </section>

      <section className="page-card-grid">
        <Card variant="borderless" className="placeholder-card office-admin-card">
          <Table rowKey="id" loading={isLoading} columns={columns} dataSource={entries} pagination={false} />
        </Card>
      </section>

      <section className="page-card-grid">
        <Card
          variant="borderless"
          className="placeholder-card office-admin-card"
          title="最近审计记录"
          extra={
            <Space wrap>
              <Select
                allowClear
                placeholder="动作"
                style={{ width: 140 }}
                value={auditAction}
                onChange={(value) => setAuditAction(value)}
                options={[
                  { label: '创建', value: 'create' },
                  { label: '更新', value: 'update' },
                  { label: '发布', value: 'publish' },
                  { label: '停用', value: 'disable' },
                  { label: '打开', value: 'open' },
                ]}
              />
              <Select
                allowClear
                placeholder="入口"
                style={{ width: 220 }}
                value={auditEntryId}
                onChange={(value) => setAuditEntryId(value)}
                options={entries.map((entry) => ({ label: entry.title, value: entry.id }))}
              />
            </Space>
          }
        >
          <Table rowKey="id" loading={isAuditLoading} columns={auditColumns} dataSource={audits} pagination={false} />
        </Card>
      </section>

      <Drawer
        title={editingEntry ? '编辑办事入口' : '新增办事入口'}
        width={460}
        open={open}
        onClose={() => setOpen(false)}
        extra={
          <Space>
            <Button onClick={() => setOpen(false)}>取消</Button>
            <Button type="primary" loading={isCreating || isUpdating} onClick={() => void handleSave()}>
              保存
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item name="categoryCode" label="分类" rules={[{ required: true }]}>
            <Select options={categoryOptions} />
          </Form.Item>
          <Form.Item name="title" label="标题" rules={[{ required: true }]}>
            <Input maxLength={128} />
          </Form.Item>
          <Form.Item name="summary" label="摘要" rules={[{ required: true }]}>
            <Input.TextArea rows={4} maxLength={500} />
          </Form.Item>
          <Form.Item name="iconType" label="图标类型" rules={[{ required: true }]}>
            <Input maxLength={64} />
          </Form.Item>
          <Form.Item name="targetType" label="目标类型" rules={[{ required: true }]}>
            <Select options={targetTypeOptions} />
          </Form.Item>
          <Form.Item name="targetValue" label="目标值" rules={[{ required: true }]}>
            <Input maxLength={2048} placeholder="https://example.com 或 /office/search" />
          </Form.Item>
          <Form.Item name="openMode" label="打开方式" rules={[{ required: true }]}>
            <Select options={openModeOptions} />
          </Form.Item>
          <Form.Item name="visibilityRoles" label="可见角色" rules={[{ required: true }]}>
            <Select mode="multiple" options={roleOptions} />
          </Form.Item>
          <Form.Item name="managerRoles" label="管理角色">
            <Select mode="multiple" options={roleOptions} />
          </Form.Item>
          <Form.Item name="sortOrder" label="排序号">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Drawer>
    </>
  );
}
