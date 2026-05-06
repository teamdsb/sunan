import { Alert, Button, Card, Form, Input, InputNumber, Popconfirm, Select, Space, Switch, Table, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../app/hooks';
import {
  ProcurementDimensionItem,
  useCreateProcurementDimensionMutation,
  useDisableProcurementDimensionMutation,
  useGetProcurementDimensionsQuery,
  useUpdateProcurementDimensionMutation,
} from './procurementApi';

interface CreateFormValues {
  departmentCode: 'shipping_dept' | 'logistics_dept';
  dimensionType: 'vessel' | 'logistics_category';
  dimensionKey: string;
  dimensionName: string;
  sortOrder?: number;
}

const departmentOptions: Array<{ label: string; value: 'shipping_dept' | 'logistics_dept' }> = [
  { label: '船务部', value: 'shipping_dept' },
  { label: '后勤部', value: 'logistics_dept' },
];

const statusOptions: Array<{ label: string; value: 'all' | 'enabled' | 'disabled' }> = [
  { label: '全部', value: 'all' },
  { label: '仅启用', value: 'enabled' },
  { label: '仅停用', value: 'disabled' },
];

export function ProcurementDictionaryAdminPage() {
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm<CreateFormValues>();
  const currentUser = useAppSelector((state) => state.auth.currentUser);

  const canManage = Boolean(currentUser && (currentUser.roles.includes('system_admin') || currentUser.roles.includes('general_office')));

  const [departmentCode, setDepartmentCode] = useState<'shipping_dept' | 'logistics_dept'>('shipping_dept');
  const [statusFilter, setStatusFilter] = useState<'all' | 'enabled' | 'disabled'>('all');

  const { data: dimensionResponse, isLoading, refetch } = useGetProcurementDimensionsQuery({
    departmentCode,
    isEnabled: statusFilter === 'all' ? undefined : statusFilter === 'enabled',
  });

  const [createDimension, { isLoading: isCreating }] = useCreateProcurementDimensionMutation();
  const [updateDimension, { isLoading: isUpdating }] = useUpdateProcurementDimensionMutation();
  const [disableDimension, { isLoading: isDisabling }] = useDisableProcurementDimensionMutation();

  const handleDepartmentChange = (value: 'shipping_dept' | 'logistics_dept') => {
    setDepartmentCode(value);
    form.setFieldValue('departmentCode', value);
    form.setFieldValue('dimensionType', value === 'shipping_dept' ? 'vessel' : 'logistics_category');
  };

  const handleCreate = async () => {
    const values = await form.validateFields();

    await createDimension({
      departmentCode: values.departmentCode,
      dimensionType: values.dimensionType,
      dimensionKey: values.dimensionKey.trim(),
      dimensionName: values.dimensionName.trim(),
      sortOrder: values.sortOrder,
    }).unwrap();

    messageApi.success('字典项已新增');
    form.resetFields(['dimensionKey', 'dimensionName', 'sortOrder']);
    await refetch();
  };

  const handleEdit = async (item: ProcurementDimensionItem) => {
    const nextName = window.prompt('请输入新的名称', item.dimensionName);
    if (nextName === null) {
      return;
    }

    const nextSortOrderInput = window.prompt('请输入新的排序值', String(item.sortOrder));
    if (nextSortOrderInput === null) {
      return;
    }

    const nextSortOrder = Number(nextSortOrderInput);
    if (!Number.isInteger(nextSortOrder) || nextSortOrder < 0) {
      messageApi.warning('排序值必须是大于等于 0 的整数');
      return;
    }

    await updateDimension({
      id: item.id,
      data: {
        dimensionName: nextName.trim(),
        sortOrder: nextSortOrder,
      },
    }).unwrap();

    messageApi.success('字典项已更新');
    await refetch();
  };

  const columns: ColumnsType<ProcurementDimensionItem> = useMemo(
    () => [
      {
        title: '部门',
        dataIndex: 'departmentCode',
        key: 'departmentCode',
        width: 120,
        render: (value: ProcurementDimensionItem['departmentCode']) => (value === 'shipping_dept' ? '船务部' : '后勤部'),
      },
      {
        title: '类型',
        dataIndex: 'dimensionType',
        key: 'dimensionType',
        width: 140,
        render: (value: ProcurementDimensionItem['dimensionType']) => (value === 'vessel' ? '船舶' : '后勤类别'),
      },
      { title: '键值', dataIndex: 'dimensionKey', key: 'dimensionKey', width: 180 },
      { title: '名称', dataIndex: 'dimensionName', key: 'dimensionName' },
      { title: '排序', dataIndex: 'sortOrder', key: 'sortOrder', width: 100 },
      {
        title: '启用',
        dataIndex: 'isEnabled',
        key: 'isEnabled',
        width: 120,
        render: (value: boolean, row) => (
          <Switch
            checked={value}
            loading={isUpdating}
            onChange={(checked) => {
              void updateDimension({ id: row.id, data: { isEnabled: checked } })
                .unwrap()
                .then(() => {
                  messageApi.success('状态已更新');
                  return refetch();
                })
                .catch(() => {
                  messageApi.error('状态更新失败');
                });
            }}
          />
        ),
      },
      {
        title: '操作',
        key: 'actions',
        width: 220,
        render: (_, row) => (
          <Space wrap>
            <Button type="link" onClick={() => void handleEdit(row)}>
              编辑
            </Button>
            <Popconfirm
              title="确认停用该字典项？"
              okText="确认"
              cancelText="取消"
              onConfirm={() =>
                disableDimension({ id: row.id })
                  .unwrap()
                  .then(() => {
                    messageApi.success('字典项已停用');
                    return refetch();
                  })
                  .catch(() => {
                    messageApi.error('停用失败');
                  })
              }
            >
              <Button danger type="link" loading={isDisabling}>
                停用
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [disableDimension, isDisabling, isUpdating, messageApi, refetch, updateDimension],
  );

  if (!canManage) {
    return (
      <>
        {contextHolder}
        <section className="page-hero">
          <Typography.Title level={2}>字典治理</Typography.Title>
          <Button onClick={() => navigate('/procurement')}>返回采购首页</Button>
        </section>
        <section className="page-card-grid">
          <Alert type="error" showIcon message="无权限访问" description="仅总经办与系统管理员可访问字典治理页。" />
        </section>
      </>
    );
  }

  return (
    <>
      {contextHolder}
      <section className="page-hero">
        <Typography.Title level={2}>字典治理</Typography.Title>
        <Typography.Paragraph type="secondary">维护船务部和后勤部细分字典项，停用项不会在录单页出现。</Typography.Paragraph>
        <Space wrap>
          <Select style={{ width: 180 }} value={departmentCode} options={departmentOptions} onChange={handleDepartmentChange} />
          <Select style={{ width: 140 }} value={statusFilter} options={statusOptions} onChange={(value) => setStatusFilter(value)} />
          <Button onClick={() => navigate('/procurement')}>返回采购首页</Button>
        </Space>
      </section>

      <section className="page-card-grid">
        <Card variant="borderless" className="placeholder-card" title="新增字典项">
          <Form
            form={form}
            layout="inline"
            initialValues={{
              departmentCode,
              dimensionType: departmentCode === 'shipping_dept' ? 'vessel' : 'logistics_category',
            }}
          >
            <Form.Item name="departmentCode" label="部门" rules={[{ required: true }]}>
              <Select style={{ width: 140 }} options={departmentOptions} onChange={handleDepartmentChange} />
            </Form.Item>
            <Form.Item name="dimensionType" label="类型" rules={[{ required: true }]}>
              <Select
                style={{ width: 140 }}
                options={
                  form.getFieldValue('departmentCode') === 'shipping_dept'
                    ? [{ label: '船舶', value: 'vessel' }]
                    : [{ label: '后勤类别', value: 'logistics_category' }]
                }
              />
            </Form.Item>
            <Form.Item name="dimensionKey" label="键值" rules={[{ required: true, message: '请输入稳定键' }]}>
              <Input style={{ width: 180 }} maxLength={64} placeholder="如 su-nan-012 / canteen" />
            </Form.Item>
            <Form.Item name="dimensionName" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
              <Input style={{ width: 180 }} maxLength={128} />
            </Form.Item>
            <Form.Item name="sortOrder" label="排序">
              <InputNumber style={{ width: 120 }} min={0} precision={0} />
            </Form.Item>
            <Form.Item>
              <Button type="primary" loading={isCreating} onClick={() => void handleCreate()}>
                新增
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </section>

      <section className="page-card-grid">
        <Card variant="borderless" className="placeholder-card office-admin-card" title="字典项列表">
          <Table rowKey="id" loading={isLoading} columns={columns} dataSource={dimensionResponse?.data ?? []} pagination={false} />
        </Card>
      </section>
    </>
  );
}
