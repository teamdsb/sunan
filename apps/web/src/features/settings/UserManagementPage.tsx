import {
  Alert,
  Avatar,
  Button,
  Card,
  Col,
  Descriptions,
  Drawer,
  Empty,
  Form,
  Input,
  List,
  Modal,
  Pagination,
  Result,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Switch,
  Tag,
  Typography,
  message,
} from 'antd';
import ReloadOutlined from '@ant-design/icons/ReloadOutlined';
import SearchOutlined from '@ant-design/icons/SearchOutlined';
import SettingOutlined from '@ant-design/icons/SettingOutlined';
import SyncOutlined from '@ant-design/icons/SyncOutlined';
import UserOutlined from '@ant-design/icons/UserOutlined';
import { useEffect, useMemo, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { baseApi } from '../../app/baseApi';
import {
  BUSINESS_ROLE_LABELS,
  type BusinessRole,
  type DepartmentMode,
  type RoleMode,
  type SyncBatch,
  type UpdateUserDirectoryInput,
  useGetAdminDepartmentsQuery,
  useGetAdminSyncBatchQuery,
  useGetAdminUserQuery,
  useListAdminUsersQuery,
  useStartAdminUserSyncMutation,
  useUpdateAdminUserMutation,
} from './userDirectoryApi';

const roleOptions = (Object.entries(BUSINESS_ROLE_LABELS) as Array<[BusinessRole, string]>).map(
  ([value, label]) => ({ value, label }),
);

const formatDate = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '未知';

const statusLabel = (status: string) => {
  if (status === 'active' || status === 'enabled' || status === 'succeeded') return '正常';
  if (status === 'inactive' || status === 'disabled' || status === 'failed') return '不可用';
  if (status === 'partial') return '部分成功';
  if (status === 'running') return '进行中';
  return '未知';
};

const roleLabels = (roles: string[]) =>
  roles.map((role) => BUSINESS_ROLE_LABELS[role as BusinessRole] ?? (role === 'system_admin' ? '系统管理员' : role));

type EditValues = {
  departmentMode: DepartmentMode;
  manualDepartmentIds: number[];
  roleMode: RoleMode;
  manualRoles: BusinessRole[];
  platformStatus: 'enabled' | 'disabled';
  reason: string;
};

export function UserManagementPage() {
  const currentUser = useAppSelector((state) => state.auth.currentUser);
  const dispatch = useAppDispatch();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    departmentId: undefined as number | undefined,
    role: undefined as BusinessRole | 'system_admin' | undefined,
    platformStatus: undefined as 'enabled' | 'disabled' | undefined,
    isSystemAdmin: undefined as boolean | undefined,
    hasLoggedIn: undefined as boolean | undefined,
    hasOverrides: undefined as boolean | undefined,
  });
  const [page, setPage] = useState(1);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [conflictText, setConflictText] = useState<string | null>(null);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [lastSyncBatch, setLastSyncBatch] = useState<SyncBatch | null>(null);
  const [previewValues, setPreviewValues] = useState<Partial<EditValues>>({});
  const [editForm] = Form.useForm<EditValues>();

  const query = useMemo(
    () => ({
      search: search.trim() || undefined,
      ...filters,
      page,
      pageSize: 20,
    }),
    [filters, page, search],
  );
  const usersQuery = useListAdminUsersQuery(query);
  const departmentsQuery = useGetAdminDepartmentsQuery();
  const detailQuery = useGetAdminUserQuery(selectedUserId ?? '', { skip: !selectedUserId });
  const [startSync, startSyncState] = useStartAdminUserSyncMutation();
  const [updateUser, updateState] = useUpdateAdminUserMutation();
  const syncQuery = useGetAdminSyncBatchQuery(activeBatchId ?? '', {
    skip: !activeBatchId,
    pollingInterval: activeBatchId ? 1500 : 0,
  });
  const syncStatus = syncQuery.data?.data.status;
  const displayedSyncBatch = syncQuery.data?.data ?? lastSyncBatch;

  useEffect(() => {
    if (syncQuery.data?.data) setLastSyncBatch(syncQuery.data.data);
  }, [syncQuery.data]);

  useEffect(() => {
    const latestBatch = departmentsQuery.data?.data.scope;
    if (!activeBatchId && latestBatch?.batchId && latestBatch.batchId !== lastSyncBatch?.id) {
      setActiveBatchId(latestBatch.batchId);
    }
  }, [activeBatchId, departmentsQuery.data?.data.scope, lastSyncBatch?.id]);

  useEffect(() => {
    if (syncStatus && syncStatus !== 'running') {
      setActiveBatchId(null);
      usersQuery.refetch();
      departmentsQuery.refetch();
    }
  }, [departmentsQuery.refetch, syncStatus, usersQuery.refetch]);

  if (!currentUser) {
    return <section className="page-hero"><Spin /></section>;
  }

  if (!currentUser.isAdmin) {
    return <Result status="403" title="无权访问" subTitle="用户管理仅对系统管理员开放。" />;
  }

  const detail = detailQuery.data?.data;
  const departmentOptions = (departmentsQuery.data?.data.items ?? []).map((department) => ({
    value: department.id,
    label: department.name,
    roles: department.roles,
  }));

  const openEditor = () => {
    if (!detail) return;
    setConflictText(null);
    const initialValues: EditValues = {
      departmentMode: detail.platform.departmentMode,
      manualDepartmentIds: detail.platform.manualDepartmentIds,
      roleMode: detail.platform.roleMode,
      manualRoles: detail.platform.manualRoles,
      platformStatus: detail.platform.status,
      reason: '',
    };
    editForm.setFieldsValue(initialValues);
    setPreviewValues(initialValues);
    setEditOpen(true);
  };

  const startDirectorySync = async () => {
    try {
      const response = await startSync().unwrap();
      setActiveBatchId(response.data.id);
      message.info('通讯录同步已开始');
    } catch (error) {
      const response = error as { data?: { message?: string; batchId?: string; data?: { batchId?: string } }; error?: string };
      const batchId = response.data?.batchId ?? response.data?.data?.batchId;
      if (batchId) setActiveBatchId(batchId);
      message.error(response.data?.message ?? response.error ?? '同步启动失败');
    }
  };

  const saveUser = async (values: EditValues) => {
    if (!detail) return;
    setConflictText(null);
    const input: UpdateUserDirectoryInput = {
      ...values,
      reason: values.reason.trim(),
      expectedAuthorizationVersion: detail.platform.authorizationVersion,
    };
    try {
      const response = await updateUser({ userId: detail.userId, input }).unwrap();
      setEditOpen(false);
      setSelectedUserId(response.data.userId);
      message.success('用户授权已保存');
      dispatch(baseApi.util.invalidateTags([
        'CurrentUser',
        'ProcurementOrder',
        'ProcurementApproval',
        'ProcurementReport',
        'ProcurementReportApproval',
        'Certificate',
        'CertificateOwner',
        'Reminder',
        'ReminderDashboard',
        'Workbench',
        'WorkbenchRecord',
        'EnterpriseProfile',
        'EnterprisePolicy',
      ]));
    } catch (error) {
      const response = error as { status?: number; data?: { message?: string } };
      if (response.status === 409) {
        setConflictText('该用户已被其他管理员修改，请刷新详情后确认当前表单内容再保存。');
        await detailQuery.refetch();
        return;
      }
      message.error(response.data?.message ?? '保存失败，当前表单未丢失');
    }
  };

  const previewDepartments = previewValues.departmentMode === 'manual'
    ? (previewValues.manualDepartmentIds ?? []).map((id) => departmentOptions.find((item) => item.value === id)?.label ?? `部门 ${id}`)
    : detail?.source.departments ?? [];
  const previewRoles = previewValues.roleMode === 'manual'
    ? ['all_authenticated', ...(detail?.effective.isSystemAdmin ? ['system_admin'] : []), ...(previewValues.manualRoles ?? [])]
    : previewValues.departmentMode === 'manual'
      ? ['all_authenticated', ...(detail?.effective.isSystemAdmin ? ['system_admin'] : []), ...new Set((previewValues.manualDepartmentIds ?? []).flatMap((id) => departmentOptions.find((item) => item.value === id)?.roles ?? []))]
      : detail?.source.roles ?? detail?.effective.roles ?? [];
  const previewAvailable = detail
    ? detail.source.status !== 'inactive' && (detail.effective.isSystemAdmin || previewValues.platformStatus !== 'disabled')
    : false;

  return (
    <section className="page-hero">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Row align="middle" justify="space-between" gutter={[16, 16]}>
          <Col flex="auto">
            <Typography.Title level={2} style={{ marginBottom: 4 }}>用户管理</Typography.Title>
            <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
              管理企业微信成员的平台部门、业务角色和平台状态。管理员资格仍由 env 提供。
            </Typography.Paragraph>
          </Col>
          <Col>
            <Space wrap>
              <Button icon={<ReloadOutlined />} onClick={() => usersQuery.refetch()}>刷新</Button>
              <Button type="primary" icon={<SyncOutlined />} loading={startSyncState.isLoading} onClick={startDirectorySync}>
                同步通讯录
              </Button>
            </Space>
          </Col>
        </Row>

        {usersQuery.data?.data.scope.coverageStatus !== 'verified' ? (
          <Alert type="warning" showIcon message="当前覆盖范围未验证" description={usersQuery.data?.data.scope.coverageNote} />
        ) : null}
        {usersQuery.isError ? <Alert type="error" showIcon message="用户目录加载失败" description="请检查权限或网络后重试。" /> : null}
        {displayedSyncBatch ? (
          <Alert
            type={displayedSyncBatch.status === 'failed' ? 'error' : displayedSyncBatch.status === 'partial' ? 'warning' : 'info'}
            showIcon
            icon={<SyncOutlined spin={displayedSyncBatch.status === 'running'} />}
            message={`同步${statusLabel(displayedSyncBatch.status)}`}
            description={`读取 ${displayedSyncBatch.readCount}，新增 ${displayedSyncBatch.createdCount}，更新 ${displayedSyncBatch.updatedCount}，失败 ${displayedSyncBatch.failedCount}。${displayedSyncBatch.coverageNote}`}
          />
        ) : null}

        <Card>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Row gutter={[12, 12]}>
              <Col xs={24} md={8}>
                <Input
                  allowClear
                  prefix={<SearchOutlined />}
                  placeholder="搜索姓名或 UserID"
                  value={search}
                  onChange={(event) => { setSearch(event.target.value); setPage(1); }}
                />
              </Col>
              <Col xs={12} md={4}>
                <Select allowClear style={{ width: '100%' }} placeholder="有效部门" options={departmentOptions} value={filters.departmentId} onChange={(value) => { setFilters((current) => ({ ...current, departmentId: value })); setPage(1); }} />
              </Col>
              <Col xs={12} md={4}>
                <Select allowClear style={{ width: '100%' }} placeholder="业务角色" options={roleOptions} value={filters.role} onChange={(value) => { setFilters((current) => ({ ...current, role: value })); setPage(1); }} />
              </Col>
              <Col xs={12} md={4}>
                <Select allowClear style={{ width: '100%' }} placeholder="平台状态" options={[{ value: 'enabled', label: '已启用' }, { value: 'disabled', label: '已停用' }]} value={filters.platformStatus} onChange={(value) => { setFilters((current) => ({ ...current, platformStatus: value })); setPage(1); }} />
              </Col>
              <Col xs={12} md={4}>
                <Select allowClear style={{ width: '100%' }} placeholder="登录状态" options={[{ value: true, label: '已登录' }, { value: false, label: '未登录或未知' }]} value={filters.hasLoggedIn} onChange={(value) => { setFilters((current) => ({ ...current, hasLoggedIn: value })); setPage(1); }} />
              </Col>
            </Row>
            <Space wrap>
              <Switch checked={filters.isSystemAdmin === true} onChange={(checked) => { setFilters((current) => ({ ...current, isSystemAdmin: checked ? true : undefined })); setPage(1); }} />
              <Typography.Text>仅看 env 管理员</Typography.Text>
              <Switch checked={filters.hasOverrides === true} onChange={(checked) => { setFilters((current) => ({ ...current, hasOverrides: checked ? true : undefined })); setPage(1); }} />
              <Typography.Text>仅看人工覆盖</Typography.Text>
            </Space>
          </Space>
        </Card>

        <Card bodyStyle={{ padding: 0 }}>
          {usersQuery.isLoading ? <div style={{ padding: 48, textAlign: 'center' }}><Spin /></div> : null}
          {!usersQuery.isLoading && usersQuery.data?.data.items.length === 0 ? <Empty description="没有符合条件的用户" style={{ padding: 48 }} /> : null}
          {!usersQuery.isLoading && usersQuery.data?.data.items.length ? (
            <List
              dataSource={usersQuery.data.data.items}
              renderItem={(item) => (
                <List.Item
                  key={item.userId}
                  actions={[<Button key="detail" type="link" onClick={() => setSelectedUserId(item.userId)}>查看详情</Button>]}
                >
                  <List.Item.Meta
                    avatar={item.avatar ? <Avatar src={item.avatar} /> : <Avatar icon={<UserOutlined />} />}
                    title={<Space wrap><Typography.Text strong>{item.name}</Typography.Text>{item.effective.isSystemAdmin ? <Tag color="gold">env 管理员</Tag> : null}{item.platform.departmentMode === 'manual' || item.platform.roleMode === 'manual' ? <Tag color="blue">人工覆盖</Tag> : null}</Space>}
                    description={<Space wrap><span>{item.userId}</span><span>来源：{item.source.departments.join('、') || '无'}</span><span>生效：{item.effective.departments.join('、') || '无有效部门'}</span><span>{roleLabels(item.effective.roles).join('、')}</span><Tag color={item.platform.status === 'enabled' ? 'green' : 'red'}>{item.platform.status === 'enabled' ? '已启用' : '已停用'}</Tag>{item.source.loginStatus === 'logged_in' ? <Tag>已登录</Tag> : <Tag>未登录或未知</Tag>}</Space>}
                  />
                </List.Item>
              )}
            />
          ) : null}
          {usersQuery.data?.data ? <Pagination current={page} pageSize={usersQuery.data.data.pageSize} total={usersQuery.data.data.total} showSizeChanger={false} onChange={(nextPage) => setPage(nextPage)} style={{ padding: 16, textAlign: 'right' }} /> : null}
        </Card>
      </Space>

      <Drawer
        open={Boolean(selectedUserId)}
        width={Math.min(620, window.innerWidth - 24)}
        title={detail ? `${detail.name} · 用户详情` : '用户详情'}
        onClose={() => setSelectedUserId(null)}
        extra={<Button type="primary" icon={<SettingOutlined />} disabled={!detail} onClick={openEditor}>编辑授权</Button>}
      >
        {detailQuery.isFetching && !detail ? <Spin /> : null}
        {detail ? (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="UserID">{detail.userId}</Descriptions.Item>
              <Descriptions.Item label="来源状态"><Tag>{statusLabel(detail.source.status)}</Tag></Descriptions.Item>
              <Descriptions.Item label="来源部门">{detail.source.departments.join('、') || '无'}</Descriptions.Item>
              <Descriptions.Item label="来源职位">{detail.source.position || '未填写'}</Descriptions.Item>
              <Descriptions.Item label="上次登录">{formatDate(detail.source.lastLoginAt)}</Descriptions.Item>
              <Descriptions.Item label="上次同步">{formatDate(detail.source.lastSyncAt)}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="平台设置">
              <Descriptions size="small" column={1}>
                <Descriptions.Item label="部门模式">{detail.platform.departmentMode === 'manual' ? '人工指定' : '跟随企业微信'}</Descriptions.Item>
                <Descriptions.Item label="角色模式">{detail.platform.roleMode === 'manual' ? '人工指定' : '自动计算'}</Descriptions.Item>
                <Descriptions.Item label="平台状态">{detail.platform.status === 'enabled' ? '已启用' : `已停用：${detail.platform.statusReason || '未填写原因'}`}</Descriptions.Item>
                <Descriptions.Item label="授权版本">{detail.platform.authorizationVersion}</Descriptions.Item>
              </Descriptions>
            </Card>
            <Card size="small" title="当前生效">
              <Space direction="vertical">
                <Typography.Text>部门：{detail.effective.departments.join('、') || '无有效部门'}</Typography.Text>
                <Typography.Text>角色：{roleLabels(detail.effective.roles).join('、')}</Typography.Text>
                <Typography.Text>可用：{detail.effective.available ? '是' : '否'}</Typography.Text>
                {detail.effective.isSystemAdmin ? <Typography.Text type="warning">系统管理员资格来源：env</Typography.Text> : null}
              </Space>
            </Card>
            <Card size="small" title="变更历史">
              <List size="small" dataSource={detail.audits ?? []} locale={{ emptyText: '暂无变更记录' }} renderItem={(audit) => <List.Item><List.Item.Meta title={`${formatDate(audit.createdAt)} · ${audit.actorUserId}`} description={`${audit.reason}（版本 ${audit.authorizationVersion ?? '-'}）`} /></List.Item>} />
            </Card>
          </Space>
        ) : null}
      </Drawer>

      <Modal
        open={editOpen}
        title={detail ? `编辑 ${detail.name} 的授权` : '编辑授权'}
        width={Math.min(680, window.innerWidth - 24)}
        okText="保存授权"
        cancelText="取消"
        confirmLoading={updateState.isLoading}
        onCancel={() => setEditOpen(false)}
        onOk={() => editForm.submit()}
        destroyOnClose={false}
      >
        {conflictText ? <Alert type="warning" showIcon message={conflictText} style={{ marginBottom: 16 }} /> : null}
        <Form
          form={editForm}
          layout="vertical"
          onFinish={saveUser}
          onValuesChange={(_changed, values) => {
            setPreviewValues(values);
            setConflictText(null);
          }}
        >
          <Form.Item name="departmentMode" label="部门来源" rules={[{ required: true }]}>
            <Select options={[{ value: 'follow_wecom', label: '跟随企业微信部门' }, { value: 'manual', label: '人工指定部门' }]} />
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(previous, current) => previous.departmentMode !== current.departmentMode}>
            {({ getFieldValue }) => getFieldValue('departmentMode') === 'manual' ? <Form.Item name="manualDepartmentIds" label="人工部门"><Select mode="multiple" options={departmentOptions} placeholder="选择已同步部门；留空表示无部门范围" /></Form.Item> : null}
          </Form.Item>
          <Form.Item name="roleMode" label="业务角色来源" rules={[{ required: true }]}>
            <Select options={[{ value: 'auto', label: '按有效部门自动计算' }, { value: 'manual', label: '人工指定业务角色' }]} />
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(previous, current) => previous.roleMode !== current.roleMode}>
            {({ getFieldValue }) => getFieldValue('roleMode') === 'manual' ? <Form.Item name="manualRoles" label="人工业务角色"><Select mode="multiple" allowClear options={roleOptions} placeholder="留空表示不授予额外业务角色" /></Form.Item> : null}
          </Form.Item>
          <Form.Item name="platformStatus" label="平台状态" rules={[{ required: true }]}>
            <Select options={[{ value: 'enabled', label: '启用' }, { value: 'disabled', label: '停用' }]} disabled={detail?.effective.isSystemAdmin} />
          </Form.Item>
          <Form.Item name="reason" label="变更原因" rules={[{ required: true, whitespace: true, message: '请填写变更原因' }]}>
            <Input.TextArea rows={3} placeholder="说明本次授权或状态变更的原因" />
          </Form.Item>
          <Card size="small" title="保存前预览">
            <Row gutter={16}>
              <Col span={12}><Statistic title="有效部门" value={previewDepartments.join('、') || '无'} valueStyle={{ fontSize: 14 }} /></Col>
              <Col span={12}><Statistic title="有效角色" value={roleLabels(previewRoles).join('、')} valueStyle={{ fontSize: 14 }} /></Col>
            </Row>
            <Typography.Paragraph type={previewAvailable ? 'success' : 'danger'} style={{ marginTop: 12, marginBottom: 0 }}>
              保存后账号{previewAvailable ? '可用' : '不可用'}；env 管理员资格只读，企业微信不可用状态优先。
            </Typography.Paragraph>
            {detail?.platform.departmentMode === 'manual' && previewValues.departmentMode === 'follow_wecom' ? (
              <Typography.Paragraph type="warning" style={{ marginTop: 8, marginBottom: 0 }}>
                恢复跟随后，部门将采用最近一次企业微信来源；人工业务角色保持不变。
              </Typography.Paragraph>
            ) : null}
            {detail?.platform.roleMode === 'manual' && previewValues.roleMode === 'auto' ? (
              <Typography.Paragraph type="warning" style={{ marginTop: 8, marginBottom: 0 }}>
                恢复自动角色后，业务角色按有效部门计算；人工部门保持不变。
              </Typography.Paragraph>
            ) : null}
          </Card>
        </Form>
      </Modal>
    </section>
  );
}
