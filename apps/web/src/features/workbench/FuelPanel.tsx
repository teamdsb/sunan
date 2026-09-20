import {
  Alert,
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  InputNumber,
  List,
  Select,
  Space,
  Typography,
  message,
} from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ResponsiveTable } from '../../components/ResponsiveTable';
import { toShanghaiIso } from '../../utils/dateTime';
import { useGetMasterDataSelectorQuery } from './masterDataApi';
import { WorkbenchRecordDetail } from './workbenchApi';
import {
  FuelActual,
  useExportBusinessMutation,
  useFuelStatisticsQuery,
  useSaveFuelActualMutation,
  useSaveFuelMeasurementMutation,
} from './businessApi';
import { businessError } from './LearningPanel';
const units = [
  { value: 'L', label: '升（L）' },
  { value: 't', label: '吨（t）' },
];
export function FuelActualPanel({ record }: { record: WorkbenchRecordDetail }) {
  const [save, saving] = useSaveFuelActualMutation();
  const [messages, context] = message.useMessage();
  const actual = record.payload.fuelActual as FuelActual | undefined;
  return (
    <Card size="small" title="实际加注登记">
      {context}
      <Typography.Paragraph>
        审批通过后登记实际加注，系统据此计算月报。申请数量不会直接计为实际加注。
      </Typography.Paragraph>
      {record.canRecordFuel ? (
        <Form
          key={record.id}
          layout="vertical"
          initialValues={{
            amount: actual?.amount,
            fuelType: actual?.fuelType ?? record.payload.fuelType,
            unit: actual?.unit ?? 'L',
            occurredAt: actual ? dayjs(actual.occurredAt) : undefined,
          }}
          onFinish={async (values) => {
            try {
              await save({
                recordId: record.id,
                data: {
                  ...values,
                  occurredAt: toShanghaiIso(values.occurredAt)!,
                },
              }).unwrap();
              messages.success('实际加注已保存，月报已更新');
            } catch (error) {
              messages.error(businessError(error));
            }
          }}
        >
          <Form.Item
            name="fuelType"
            label="油品"
            rules={[{ required: true, whitespace: true }]}
          >
            <Input maxLength={64} />
          </Form.Item>
          <Form.Item name="unit" label="计量单位" rules={[{ required: true }]}>
            <Select options={units} />
          </Form.Item>
          <Form.Item
            name="amount"
            label="实际加注量"
            rules={[{ required: true }]}
          >
            <InputNumber min={0.001} max={1e9} precision={3} />
          </Form.Item>
          <Form.Item
            name="occurredAt"
            label="实际加注时间"
            rules={[{ required: true }]}
          >
            <DatePicker showTime format="YYYY-MM-DD HH:mm" />
          </Form.Item>
          <Button htmlType="submit" type="primary" loading={saving.isLoading}>
            保存实际加注
          </Button>
        </Form>
      ) : (
        <Typography.Text>
          {actual
            ? `已登记 ${actual.amount} ${actual.unit}`
            : '待审批通过后登记'}
        </Typography.Text>
      )}
    </Card>
  );
}
export function FuelStatisticsPanel() {
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'));
  const {
    currentData: data,
    isFetching: isLoading,
    isError,
    refetch,
  } = useFuelStatisticsQuery(month);
  const { data: vessels } = useGetMasterDataSelectorQuery({ type: 'vessels' });
  const [save, saving] = useSaveFuelMeasurementMutation(),
    [exportReport, exporting] = useExportBusinessMutation();
  const [messages, context] = message.useMessage();
  const [form] = Form.useForm();
  return (
    <Card title="燃油月报与余量">
      {context}
      <Space direction="vertical" style={{ width: '100%' }}>
        <Space wrap>
          <DatePicker
            picker="month"
            value={dayjs(`${month}-01`)}
            allowClear={false}
            onChange={(value) => {
              if (value) {
                setMonth(value.format('YYYY-MM'));
                form.resetFields();
              }
            }}
          />
          <Button
            loading={exporting.isLoading}
            onClick={async () => {
              try {
                const result = await exportReport({
                  kind: 'fuel',
                  month,
                }).unwrap();
                window.open(
                  result.data.downloadUrl,
                  '_blank',
                  'noopener,noreferrer',
                );
              } catch (error) {
                messages.error(businessError(error));
              }
            }}
          >
            导出燃油月报
          </Button>
        </Space>
        <Typography.Text type="secondary">
          月耗 = 期初余量 + 实际加注 −
          月末实测。期初自动承接上月实测；不同油品和单位分别计算。
        </Typography.Text>
        {isError ? (
          <Alert
            type="error"
            message="燃油统计加载失败"
            action={<Button onClick={() => void refetch()}>重试</Button>}
          />
        ) : (
          <>
            <ResponsiveTable
              loading={isLoading}
              rowKey={(row) => `${row.vesselId}:${row.fuelType}:${row.unit}`}
              dataSource={data?.data.rows ?? []}
              columns={[
                { title: '船舶', dataIndex: 'vesselName' },
                { title: '油品', dataIndex: 'fuelType' },
                { title: '单位', dataIndex: 'unit' },
                {
                  title: '期初',
                  dataIndex: 'openingBalance',
                  render: (v: number | null) => v ?? '未登记',
                },
                { title: '实际加注', dataIndex: 'bunkeredAmount' },
                {
                  title: '月耗',
                  dataIndex: 'consumedAmount',
                  render: (v: number | null) => v ?? '待核对',
                },
                {
                  title: '月末实测',
                  dataIndex: 'closingBalance',
                  render: (v: number | null) => v ?? '未登记',
                },
                {
                  title: '操作',
                  render: (_, r) =>
                    data?.data.canMeasure ? (
                      <Button
                        onClick={() =>
                          form.setFieldsValue({
                            vesselId: r.vesselId,
                            fuelType: r.fuelType,
                            unit: r.unit,
                            openingBalance: r.openingBalance ?? undefined,
                            closingBalance: r.closingBalance ?? undefined,
                            lowFuelThreshold: r.lowFuelThreshold ?? undefined,
                          })
                        }
                      >
                        更正测量
                      </Button>
                    ) : null,
                },
                {
                  title: '提示',
                  render: (_, r) => (
                    <Space direction="vertical">
                      {r.lowFuel && (
                        <Typography.Text type="danger">
                          余量低于或等于提醒值
                        </Typography.Text>
                      )}
                      {r.issues.map((issue) => (
                        <Typography.Text key={issue} type="warning">
                          {issue}
                        </Typography.Text>
                      ))}
                    </Space>
                  ),
                },
              ]}
            />
            {!!data?.data.unconfirmed.length && (
              <Alert
                type="warning"
                message="以下已批准申请尚未登记实际加注"
                description={
                  <List
                    dataSource={data.data.unconfirmed}
                    renderItem={(r) => (
                      <List.Item>
                        <Link to={`/workbench/records/${r.recordId}`}>
                          {r.title}
                        </Link>
                      </List.Item>
                    )}
                  />
                }
              />
            )}
          </>
        )}
        {data?.data.canMeasure && (
          <Card size="small" title="登记或更正月末实测余量">
            <Form
              form={form}
              key={month}
              layout="vertical"
              initialValues={{ unit: 'L' }}
              onFinish={async (values) => {
                try {
                  await save({ ...values, month }).unwrap();
                  messages.success('月末实测已保存');
                  form.resetFields();
                } catch (error) {
                  messages.error(businessError(error));
                }
              }}
            >
              <Form.Item
                name="vesselId"
                label="船舶"
                rules={[{ required: true }]}
              >
                <Select
                  showSearch
                  optionFilterProp="label"
                  options={vessels?.data.map((v) => ({
                    value: v.id,
                    label: v.name,
                  }))}
                />
              </Form.Item>
              <Form.Item
                name="fuelType"
                label="油品"
                rules={[{ required: true, whitespace: true }]}
              >
                <Input maxLength={64} />
              </Form.Item>
              <Form.Item
                name="unit"
                label="计量单位"
                rules={[{ required: true }]}
              >
                <Select options={units} />
              </Form.Item>
              <Form.Item
                name="openingBalance"
                label="首次期初余量（有上月实测时自动使用上月值）"
              >
                <InputNumber min={0} max={1e9} precision={3} />
              </Form.Item>
              <Form.Item
                name="closingBalance"
                label="月末实测余量"
                rules={[{ required: true }]}
              >
                <InputNumber min={0} max={1e9} precision={3} />
              </Form.Item>
              <Form.Item
                name="lowFuelThreshold"
                label="低余量提醒值（与所选单位一致）"
              >
                <InputNumber min={0} max={1e9} precision={3} />
              </Form.Item>
              <Button
                htmlType="submit"
                type="primary"
                loading={saving.isLoading}
              >
                保存月末实测
              </Button>
            </Form>
          </Card>
        )}
      </Space>
    </Card>
  );
}
