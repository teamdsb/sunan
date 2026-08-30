import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  Typography,
  message,
} from 'antd';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ProcurementDepartmentCode,
  ProcurementDimensionType,
  useGetProcurementDimensionsQuery,
  useCreateProcurementOrderMutation,
  useSubmitProcurementOrderMutation,
} from './procurementApi';

interface ProcurementOrderFormValues {
  departmentCode: ProcurementDepartmentCode;
  dimensionType?: ProcurementDimensionType;
  dimensionKey?: string;
  title: string;
  summary: string;
  amount: number;
  expenseDate?: string;
}

function toIsoDateTime(value: string | undefined) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

const departmentOptions = [
  { label: '总经办', value: 'general_office' },
  { label: '业务部', value: 'business_dept' },
  { label: '财务部', value: 'finance_dept' },
  { label: '船务部', value: 'shipping_dept' },
  { label: '后勤部', value: 'logistics_dept' },
];

export function ProcurementOrderCreatePage() {
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm<ProcurementOrderFormValues>();
  const [createOrder, { isLoading: isCreating }] =
    useCreateProcurementOrderMutation();
  const [submitOrder, { isLoading: isSubmitting }] =
    useSubmitProcurementOrderMutation();
  const [departmentCode, setDepartmentCode] =
    useState<ProcurementDepartmentCode>('general_office');
  const { data: dimensionResponse, isLoading: isDimensionLoading } =
    useGetProcurementDimensionsQuery(
      departmentCode === 'shipping_dept' || departmentCode === 'logistics_dept'
        ? {
            departmentCode,
            isEnabled: true,
          }
        : undefined,
    );

  const dimensionTypeOptions = useMemo(() => {
    if (departmentCode === 'shipping_dept') {
      return [{ label: '船舶', value: 'vessel' }];
    }

    if (departmentCode === 'logistics_dept') {
      return [{ label: '后勤类别', value: 'logistics_category' }];
    }

    return [{ label: '无', value: 'none' }];
  }, [departmentCode]);

  const handleDepartmentChange = (value: ProcurementDepartmentCode) => {
    setDepartmentCode(value);
    if (value === 'shipping_dept') {
      form.setFieldsValue({ dimensionType: 'vessel', dimensionKey: undefined });
      return;
    }

    if (value === 'logistics_dept') {
      form.setFieldsValue({
        dimensionType: 'logistics_category',
        dimensionKey: undefined,
      });
      return;
    }

    form.setFieldsValue({ dimensionType: 'none', dimensionKey: undefined });
  };

  const dimensionItemOptions = useMemo(
    () =>
      (dimensionResponse?.data ?? [])
        .filter(
          (item) => item.departmentCode === departmentCode && item.isEnabled,
        )
        .map((item) => ({
          label: `${item.dimensionName} (${item.dimensionKey})`,
          value: item.dimensionKey,
        })),
    [departmentCode, dimensionResponse?.data],
  );

  const normalizePayload = (values: ProcurementOrderFormValues) => {
    const payload = {
      ...values,
      title: values.title.trim(),
      summary: values.summary.trim(),
      amount: Number(values.amount),
      expenseDate: toIsoDateTime(values.expenseDate),
    };

    if (values.departmentCode === 'shipping_dept') {
      return {
        ...payload,
        dimensionType: 'vessel' as const,
      };
    }

    if (values.departmentCode === 'logistics_dept') {
      return {
        ...payload,
        dimensionType: 'logistics_category' as const,
      };
    }

    return {
      ...payload,
      dimensionType: 'none' as const,
      dimensionKey: undefined,
    };
  };

  const handleSaveDraft = async () => {
    const values = await form.validateFields();
    const created = await createOrder(normalizePayload(values)).unwrap();
    messageApi.success('采购草稿已保存');
    navigate(`/procurement/orders/${created.data.id}`);
  };

  const handleSaveAndSubmit = async () => {
    const values = await form.validateFields();
    const created = await createOrder(normalizePayload(values)).unwrap();
    await submitOrder(created.data.id).unwrap();
    messageApi.success('采购单已提交');
    navigate(`/procurement/orders/${created.data.id}`);
  };

  return (
    <>
      {contextHolder}
      <section className="page-hero">
        <Typography.Title level={2}>新建采购单</Typography.Title>
        <Typography.Paragraph type="secondary">
          支持先保存草稿，再提交审批。
        </Typography.Paragraph>
        <Button onClick={() => navigate('/procurement')}>返回采购首页</Button>
      </section>

      <section className="page-card-grid">
        <Card variant="borderless" className="placeholder-card">
          <Form
            form={form}
            layout="vertical"
            className="sunan-form-grid"
            initialValues={{
              departmentCode: 'general_office',
              dimensionType: 'none',
            }}
          >
            <Form.Item
              name="departmentCode"
              label="部门"
              rules={[{ required: true }]}
            >
              <Select
                options={departmentOptions}
                onChange={handleDepartmentChange}
              />
            </Form.Item>

            <Form.Item
              name="dimensionType"
              label="细分类型"
              rules={[{ required: true }]}
            >
              <Select
                options={dimensionTypeOptions}
                disabled={
                  departmentCode !== 'shipping_dept' &&
                  departmentCode !== 'logistics_dept'
                }
              />
            </Form.Item>

            {departmentCode === 'shipping_dept' ||
            departmentCode === 'logistics_dept' ? (
              <Form.Item
                name="dimensionKey"
                label="细分对象"
                rules={[{ required: true, message: '请填写细分对象' }]}
              >
                <Select
                  showSearch
                  loading={isDimensionLoading}
                  options={dimensionItemOptions}
                  placeholder={
                    departmentCode === 'shipping_dept'
                      ? '请选择船舶'
                      : '请选择后勤类别'
                  }
                  optionFilterProp="label"
                />
              </Form.Item>
            ) : null}

            <Form.Item
              name="title"
              label="标题"
              rules={[{ required: true, message: '请填写采购标题' }]}
            >
              <Input maxLength={128} />
            </Form.Item>

            <Form.Item
              className="sunan-form-field-wide"
              name="summary"
              label="摘要/事由"
              rules={[{ required: true, message: '请填写采购摘要' }]}
            >
              <Input.TextArea rows={4} />
            </Form.Item>

            <Form.Item
              name="amount"
              label="金额"
              rules={[{ required: true, message: '请填写采购金额' }]}
            >
              <InputNumber min={0} precision={2} />
            </Form.Item>

            <Form.Item name="expenseDate" label="费用时间（可选）">
              <Input type="datetime-local" />
            </Form.Item>

            <div className="sunan-form-actions">
              <Button
                loading={isCreating}
                onClick={() => void handleSaveDraft()}
              >
                保存草稿
              </Button>
              <Button
                type="primary"
                loading={isCreating || isSubmitting}
                onClick={() => void handleSaveAndSubmit()}
              >
                保存并提交
              </Button>
            </div>
          </Form>
        </Card>
      </section>
    </>
  );
}
