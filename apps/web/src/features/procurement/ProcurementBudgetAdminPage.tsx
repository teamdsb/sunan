import {
  Alert,
  Button,
  Card,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Switch,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo, useState } from 'react';
import { useAppSelector } from '../../app/hooks';
import { ResponsiveTable } from '../../components/ResponsiveTable';
import { formatShanghaiDateTime } from '../../utils/dateTime';
import {
  ProcurementBudget,
  ProcurementDepartmentCode,
  useCreateProcurementBudgetMutation,
  useGetProcurementBudgetAuditsQuery,
  useGetProcurementBudgetsQuery,
  useGetProcurementDimensionsQuery,
  useUpdateProcurementBudgetMutation,
} from './procurementApi';

interface CreateBudgetValues {
  budgetYear: number;
  departmentCode: ProcurementDepartmentCode;
  dimensionKey?: string;
  budgetAmount: number;
  changeReason: string;
}

interface EditBudgetValues {
  budgetAmount: number;
  isEnabled: boolean;
  changeReason: string;
}

const departmentOptions = [
  { label: '总经办', value: 'general_office' },
  { label: '业务部', value: 'business_dept' },
  { label: '财务部', value: 'finance_dept' },
  { label: '船务部', value: 'shipping_dept' },
  { label: '后勤部', value: 'logistics_dept' },
] satisfies Array<{ label: string; value: ProcurementDepartmentCode }>;

const enabledOptions = [
  { label: '全部状态', value: 'all' },
  { label: '仅启用', value: 'enabled' },
  { label: '仅停用', value: 'disabled' },
];

const auditActionLabels = {
  create: '创建',
  update: '调整金额',
  enable: '启用',
  disable: '停用',
};

function getDimensionType(departmentCode: ProcurementDepartmentCode) {
  if (departmentCode === 'shipping_dept') return 'vessel' as const;
  if (departmentCode === 'logistics_dept') return 'logistics_category' as const;
  return 'none' as const;
}

function formatDepartment(code: ProcurementDepartmentCode) {
  return departmentOptions.find((item) => item.value === code)?.label ?? code;
}

function formatMoney(value: number | null) {
  return value === null ? '-' : `¥${value.toFixed(2)}`;
}

export function ProcurementBudgetAdminPage() {
  const currentUser = useAppSelector((state) => state.auth.currentUser);
  const canManage = Boolean(
    currentUser &&
    (currentUser.roles.includes('system_admin') ||
      currentUser.roles.includes('general_office')),
  );
  const [messageApi, contextHolder] = message.useMessage();
  const [createForm] = Form.useForm<CreateBudgetValues>();
  const [editForm] = Form.useForm<EditBudgetValues>();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [departmentCode, setDepartmentCode] = useState<
    ProcurementDepartmentCode | undefined
  >();
  const [enabledFilter, setEnabledFilter] = useState<
    'all' | 'enabled' | 'disabled'
  >('all');
  const [editingBudget, setEditingBudget] = useState<ProcurementBudget | null>(
    null,
  );
  const [auditBudget, setAuditBudget] = useState<ProcurementBudget | null>(
    null,
  );
  const createDepartmentCode =
    Form.useWatch('departmentCode', createForm) ?? 'general_office';
  const dimensionDepartment =
    createDepartmentCode === 'shipping_dept' ||
    createDepartmentCode === 'logistics_dept'
      ? createDepartmentCode
      : undefined;

  const {
    data: budgetResponse,
    isLoading,
    refetch,
  } = useGetProcurementBudgetsQuery(
    {
      year,
      departmentCode,
      isEnabled:
        enabledFilter === 'all' ? undefined : enabledFilter === 'enabled',
    },
    { skip: !canManage },
  );
  const { data: dimensionResponse } = useGetProcurementDimensionsQuery(
    dimensionDepartment
      ? { departmentCode: dimensionDepartment, isEnabled: true }
      : undefined,
    { skip: !dimensionDepartment || !canManage },
  );
  const { data: auditResponse, isLoading: auditsLoading } =
    useGetProcurementBudgetAuditsQuery(auditBudget?.id ?? '', {
      skip: !auditBudget || !canManage,
    });
  const [createBudget, { isLoading: isCreating }] =
    useCreateProcurementBudgetMutation();
  const [updateBudget, { isLoading: isUpdating }] =
    useUpdateProcurementBudgetMutation();

  const columns: ColumnsType<ProcurementBudget> = useMemo(
    () => [
      { title: '年度', dataIndex: 'budgetYear', key: 'budgetYear', width: 88 },
      {
        title: '部门',
        dataIndex: 'departmentCode',
        key: 'departmentCode',
        width: 110,
        render: (value: ProcurementDepartmentCode) => formatDepartment(value),
      },
      {
        title: '分类',
        dataIndex: 'dimensionName',
        key: 'dimensionName',
        width: 150,
      },
      {
        title: '预算',
        dataIndex: 'budgetAmount',
        key: 'budgetAmount',
        width: 130,
        render: (value: number) => formatMoney(value),
      },
      {
        title: '已执行',
        dataIndex: 'executedAmount',
        key: 'executedAmount',
        width: 130,
        render: (value: number) => formatMoney(value),
      },
      {
        title: '执行率',
        dataIndex: 'executionRate',
        key: 'executionRate',
        width: 110,
        render: (value: number, row) => (
          <Tag color={row.isOverBudget ? 'red' : value >= 80 ? 'gold' : 'blue'}>
            {value.toFixed(1)}%
          </Tag>
        ),
      },
      {
        title: '状态',
        dataIndex: 'isEnabled',
        key: 'isEnabled',
        width: 90,
        render: (value: boolean) => (
          <Tag color={value ? 'green' : 'default'}>
            {value ? '启用' : '停用'}
          </Tag>
        ),
      },
      {
        title: '操作',
        key: 'actions',
        width: 160,
        fixed: 'right',
        render: (_, row) => (
          <Space size={4}>
            <Button
              type="link"
              onClick={() => {
                setEditingBudget(row);
                editForm.setFieldsValue({
                  budgetAmount: row.budgetAmount,
                  isEnabled: row.isEnabled,
                  changeReason: '',
                });
              }}
            >
              调整
            </Button>
            <Button type="link" onClick={() => setAuditBudget(row)}>
              审计
            </Button>
          </Space>
        ),
      },
    ],
    [editForm],
  );

  const handleCreate = async () => {
    const values = await createForm.validateFields();
    const dimensionType = getDimensionType(values.departmentCode);
    await createBudget({
      budgetYear: values.budgetYear,
      departmentCode: values.departmentCode,
      dimensionType,
      dimensionKey: dimensionType === 'none' ? undefined : values.dimensionKey,
      budgetAmount: values.budgetAmount,
      changeReason: values.changeReason.trim(),
    }).unwrap();
    messageApi.success('年度预算已新增');
    createForm.resetFields(['dimensionKey', 'budgetAmount', 'changeReason']);
    await refetch();
  };

  const handleUpdate = async () => {
    if (!editingBudget) return;
    const values = await editForm.validateFields();
    await updateBudget({
      id: editingBudget.id,
      data: {
        budgetAmount: values.budgetAmount,
        isEnabled: values.isEnabled,
        changeReason: values.changeReason.trim(),
      },
    }).unwrap();
    messageApi.success('年度预算已调整');
    setEditingBudget(null);
    await refetch();
  };

  if (!canManage) {
    return (
      <>
        {contextHolder}
        <section className="page-hero sunan-page-hero">
          <Typography.Title level={2}>年度采购预算</Typography.Title>
          <Typography.Paragraph type="secondary">
            按年度、部门和采购分类配置并核对预算执行情况。
          </Typography.Paragraph>
        </section>
        <section className="page-card-grid">
          <Alert
            type="error"
            showIcon
            message="无权限访问"
            description="仅总经办与系统管理员可维护年度采购预算。"
          />
        </section>
      </>
    );
  }

  return (
    <>
      {contextHolder}
      <section className="page-hero sunan-page-hero">
        <div>
          <Typography.Title level={2}>年度采购预算</Typography.Title>
          <Typography.Paragraph type="secondary">
            预算按年度、部门和采购分类配置；执行额以后端终审采购单的费用日期为准。
          </Typography.Paragraph>
        </div>
      </section>

      <section className="page-card-grid">
        <Card
          variant="borderless"
          className="placeholder-card"
          title="查询预算"
        >
          <div className="sunan-query-grid">
            <InputNumber
              min={2000}
              max={2100}
              value={year}
              onChange={(value) => setYear(value ?? currentYear)}
            />
            <Select
              allowClear
              placeholder="全部部门"
              value={departmentCode}
              options={departmentOptions}
              onChange={setDepartmentCode}
            />
            <Select
              value={enabledFilter}
              options={enabledOptions}
              onChange={setEnabledFilter}
            />
          </div>
        </Card>
      </section>

      <section className="page-card-grid">
        <Card
          variant="borderless"
          className="placeholder-card"
          title="新增预算"
        >
          <Form
            form={createForm}
            layout="vertical"
            className="sunan-form-grid"
            initialValues={{
              budgetYear: currentYear,
              departmentCode: 'general_office',
            }}
          >
            <Form.Item
              name="budgetYear"
              label="年度"
              rules={[{ required: true, message: '请输入年度' }]}
            >
              <InputNumber min={2000} max={2100} precision={0} />
            </Form.Item>
            <Form.Item
              name="departmentCode"
              label="部门"
              rules={[{ required: true, message: '请选择部门' }]}
            >
              <Select
                options={departmentOptions}
                onChange={() =>
                  createForm.setFieldValue('dimensionKey', undefined)
                }
              />
            </Form.Item>
            <Form.Item
              name="dimensionKey"
              label="采购分类"
              rules={[
                {
                  required: Boolean(dimensionDepartment),
                  message: '请选择采购分类',
                },
              ]}
            >
              <Select
                disabled={!dimensionDepartment}
                placeholder={
                  dimensionDepartment ? '请选择后台字典项' : '未细分'
                }
                options={(dimensionResponse?.data ?? []).map((item) => ({
                  label: item.dimensionName,
                  value: item.dimensionKey,
                }))}
              />
            </Form.Item>
            <Form.Item
              name="budgetAmount"
              label="预算金额"
              rules={[{ required: true, message: '请输入预算金额' }]}
            >
              <InputNumber min={0.01} precision={2} prefix="¥" />
            </Form.Item>
            <Form.Item
              className="sunan-form-field-wide"
              name="changeReason"
              label="设置原因"
              rules={[
                { required: true, whitespace: true, message: '请填写设置原因' },
              ]}
            >
              <Input maxLength={500} placeholder="例如：2026 年度预算批复" />
            </Form.Item>
            <div className="sunan-form-actions">
              <Button
                type="primary"
                loading={isCreating}
                onClick={() => void handleCreate()}
              >
                新增预算
              </Button>
            </div>
          </Form>
        </Card>
      </section>

      <section className="page-card-grid">
        <Card
          variant="borderless"
          className="placeholder-card office-admin-card"
          title="预算列表"
        >
          <ResponsiveTable
            rowKey="id"
            loading={isLoading}
            columns={columns}
            dataSource={budgetResponse?.data ?? []}
            scroll={{ x: 980 }}
            pagination={false}
          />
        </Card>
      </section>

      <Modal
        title="调整年度预算"
        open={Boolean(editingBudget)}
        okText="保存调整"
        cancelText="取消"
        confirmLoading={isUpdating}
        onOk={() => void handleUpdate()}
        onCancel={() => setEditingBudget(null)}
      >
        <Form form={editForm} layout="vertical" className="sunan-control-block">
          <Form.Item label="预算范围">
            <Input
              disabled
              value={
                editingBudget
                  ? `${formatDepartment(editingBudget.departmentCode)} / ${editingBudget.dimensionName}`
                  : ''
              }
            />
          </Form.Item>
          <Form.Item
            name="budgetAmount"
            label="预算金额"
            rules={[{ required: true }]}
          >
            <InputNumber min={0.01} precision={2} prefix="¥" />
          </Form.Item>
          <Form.Item name="isEnabled" label="是否启用" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="停用" />
          </Form.Item>
          <Form.Item
            name="changeReason"
            label="调整原因"
            rules={[
              { required: true, whitespace: true, message: '请填写调整原因' },
            ]}
          >
            <Input.TextArea maxLength={500} rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title={
          auditBudget ? `${auditBudget.dimensionName}预算审计` : '预算审计'
        }
        open={Boolean(auditBudget)}
        width={520}
        onClose={() => setAuditBudget(null)}
      >
        <ResponsiveTable
          rowKey="id"
          loading={auditsLoading}
          dataSource={auditResponse?.data ?? []}
          pagination={false}
          scroll={{ x: 520 }}
          columns={[
            {
              title: '动作',
              dataIndex: 'action',
              key: 'action',
              width: 100,
              render: (value: keyof typeof auditActionLabels) =>
                auditActionLabels[value],
            },
            {
              title: '变更',
              key: 'change',
              width: 160,
              render: (_, row) =>
                `${formatMoney(row.beforeAmount)} → ${formatMoney(row.afterAmount)}`,
            },
            { title: '原因', dataIndex: 'changeReason', key: 'changeReason' },
            {
              title: '时间',
              dataIndex: 'changedAt',
              key: 'changedAt',
              width: 170,
              render: (value: string) =>
                formatShanghaiDateTime(value),
            },
          ]}
        />
      </Drawer>
    </>
  );
}
