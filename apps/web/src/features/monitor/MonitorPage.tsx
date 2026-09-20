import {
  Alert,
  Button,
  Card,
  Empty,
  Form,
  Input,
  InputNumber,
  List,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Tag,
  Typography,
  message,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAppSelector } from '../../app/hooks';
import { useGetMasterDataSelectorQuery } from '../workbench/masterDataApi';
import {
  useCreateShipMonitorMutation,
  useDeleteShipMonitorMutation,
  useGetShipMonitorsQuery,
  useUpdateShipMonitorMutation,
  type MonitorInput,
  type MonitorItem,
} from './monitorApi';

type MonitorFormValues = MonitorInput;

function getApiErrorMessage(error: unknown, fallback: string) {
  const data = (error as { data?: { message?: string | string[] } } | undefined)
    ?.data;
  const messageValue = data?.message;
  if (Array.isArray(messageValue)) return messageValue.join('；');
  return messageValue || (error instanceof Error ? error.message : fallback);
}

function isMonitorUrl(value: string) {
  try {
    const url = new URL(value.trim());
    return (
      /^https?:\/\//i.test(value.trim()) &&
      ['http:', 'https:'].includes(url.protocol) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

export function MonitorPage() {
  const { vesselId } = useParams();
  const roles = useAppSelector((state) => state.auth.currentUser?.roles ?? []);
  const isManager = roles.includes('system_admin');
  const [editing, setEditing] = useState<MonitorItem | null>(null);
  const [preview, setPreview] = useState<MonitorItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm<MonitorFormValues>();

  const listQuery = useGetShipMonitorsQuery({
    vesselId,
    activeOnly: !isManager,
  });
  const { currentData: data, isError, refetch } = listQuery;
  const isLoading = listQuery.isLoading || (listQuery.isFetching && !data);
  const selectorQuery = useGetMasterDataSelectorQuery(
    { type: 'vessels' },
    { skip: !isManager },
  );
  const [createMonitor, createState] = useCreateShipMonitorMutation();
  const [updateMonitor, updateState] = useUpdateShipMonitorMutation();
  const [deleteMonitor] = useDeleteShipMonitorMutation();
  const monitors = useMemo(
    () => (data?.data ?? []).filter((item) => isManager || item.isActive),
    [data, isManager],
  );
  const vesselOptions = useMemo(() => {
    const options = (selectorQuery.data?.data ?? []).map((item) => ({
      value: item.id,
      label: `${item.name}${item.code ? ` (${item.code})` : ''}`,
      disabled: false,
    }));
    if (
      editing &&
      !options.some((option) => option.value === editing.vesselId)
    ) {
      options.push({
        value: editing.vesselId,
        label: `${editing.vesselName ?? '原船舶'}（已不可选择）`,
        disabled: true,
      });
    }
    return options;
  }, [selectorQuery.data, editing]);

  const resetForm = () => {
    setEditing(null);
    form.resetFields();
  };

  useEffect(() => {
    setEditing(null);
    setPreview(null);
    if (!isManager) return;
    form.resetFields();
    form.setFieldsValue({ vesselId });
  }, [form, vesselId, isManager]);

  const submit = async (values: MonitorFormValues) => {
    if (busy) return;
    setBusy(true);
    const payload = {
      ...values,
      monitorName: values.monitorName.trim(),
      endpointUrl: values.endpointUrl.trim(),
    };
    try {
      if (editing) {
        await updateMonitor({ id: editing.id, data: payload }).unwrap();
        messageApi.success('监控入口已更新');
      } else {
        await createMonitor(payload).unwrap();
        messageApi.success('监控入口已新增');
      }
      resetForm();
    } catch (error) {
      messageApi.error(
        getApiErrorMessage(error, editing ? '更新失败' : '新增失败'),
      );
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (item: MonitorItem) => {
    setEditing(item);
    form.setFieldsValue({
      vesselId: item.vesselId,
      monitorName: item.monitorName,
      endpointUrl: item.endpointUrl,
      accessMode: item.accessMode,
      sortOrder: item.sortOrder,
      isActive: item.isActive,
    });
  };

  const toggleActive = async (item: MonitorItem) => {
    if (busy) return;
    setBusy(true);
    try {
      await updateMonitor({
        id: item.id,
        data: { isActive: !item.isActive },
      }).unwrap();
      if (editing?.id === item.id)
        form.setFieldsValue({ isActive: !item.isActive });
      messageApi.success(item.isActive ? '监控入口已停用' : '监控入口已启用');
    } catch (error) {
      messageApi.error(getApiErrorMessage(error, '状态更新失败'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (item: MonitorItem) => {
    if (busy) return;
    setBusy(true);
    try {
      await deleteMonitor(item.id).unwrap();
      if (editing?.id === item.id) resetForm();
      if (preview?.id === item.id) setPreview(null);
      messageApi.success('监控入口已删除');
    } catch (error) {
      messageApi.error(getApiErrorMessage(error, '删除失败'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="page-hero">
      {contextHolder}
      <Typography.Title level={2}>船舶监控</Typography.Title>
      {vesselId ? <Link to="/my/monitors">查看全部船舶监控</Link> : null}
      <Typography.Paragraph type="secondary">
        {isManager
          ? '系统管理员可新增与配置监控入口。'
          : '当前账号仅可查看启用中的监控入口。'}
      </Typography.Paragraph>
      <Space direction="vertical" style={{ width: '100%' }}>
        {isManager ? (
          <Card title={editing ? '编辑监控入口' : '新增监控入口'}>
            {selectorQuery.isError ? (
              <Alert
                type="error"
                showIcon
                message="船舶列表加载失败"
                action={
                  <Button onClick={() => void selectorQuery.refetch()}>
                    重试船舶列表
                  </Button>
                }
              />
            ) : null}
            {!selectorQuery.isError &&
            !selectorQuery.isLoading &&
            !vesselOptions.length ? (
              <Alert
                type="info"
                showIcon
                message="暂无有效船舶，请先在证书对象中维护船舶。"
              />
            ) : null}
            <Form<MonitorFormValues>
              data-testid="monitor-create-form"
              form={form}
              layout="vertical"
              className="stacked-form"
              initialValues={{
                vesselId,
                accessMode: 'external',
                sortOrder: 0,
                isActive: true,
              }}
              disabled={busy}
              onFinish={submit}
            >
              <Form.Item
                name="vesselId"
                label="船舶"
                rules={[{ required: true, message: '请选择船舶' }]}
              >
                <Select
                  disabled={Boolean(vesselId) && !editing}
                  showSearch
                  optionFilterProp="label"
                  loading={selectorQuery.isLoading}
                  placeholder="选择船舶"
                  options={vesselOptions}
                  notFoundContent={
                    selectorQuery.isLoading ? '船舶加载中…' : '暂无可选择船舶'
                  }
                />
              </Form.Item>
              <Form.Item
                name="monitorName"
                label="监控名称"
                rules={[
                  {
                    required: true,
                    whitespace: true,
                    message: '请输入监控名称',
                  },
                  { max: 128, message: '监控名称最多 128 字' },
                ]}
              >
                <Input placeholder="监控名称" maxLength={128} />
              </Form.Item>
              <Form.Item
                name="endpointUrl"
                label="监控地址"
                rules={[
                  {
                    validator: (_, value: string) =>
                      value && isMonitorUrl(value)
                        ? Promise.resolve()
                        : Promise.reject(
                            new Error(
                              '请输入以 http:// 或 https:// 开头的监控地址',
                            ),
                          ),
                  },
                ]}
              >
                <Input placeholder="监控地址，如 https://monitor.example.com" />
              </Form.Item>
              <Space wrap>
                <Form.Item
                  name="accessMode"
                  label="访问方式"
                  rules={[{ required: true }]}
                >
                  <Select
                    style={{ width: 140 }}
                    options={[
                      { value: 'external', label: '外部打开' },
                      { value: 'embed', label: '页面嵌入' },
                    ]}
                  />
                </Form.Item>
                <Form.Item name="sortOrder" label="排序">
                  <InputNumber min={0} max={2147483647} precision={0} />
                </Form.Item>
                <Form.Item name="isActive" label="启用" valuePropName="checked">
                  <Switch />
                </Form.Item>
              </Space>
              <Space>
                <Button
                  htmlType="submit"
                  type="primary"
                  loading={createState.isLoading || updateState.isLoading}
                  disabled={
                    busy ||
                    selectorQuery.isLoading ||
                    selectorQuery.isError ||
                    (!editing && !vesselOptions.length)
                  }
                >
                  {editing ? '保存监控' : '新增监控'}
                </Button>
                {editing ? <Button onClick={resetForm}>取消编辑</Button> : null}
              </Space>
            </Form>
          </Card>
        ) : null}
        {isError ? (
          <Alert
            type="error"
            showIcon
            message="监控列表加载失败"
            description="请检查网络后重试。"
            action={
              <Button size="small" onClick={() => void refetch()}>
                重试
              </Button>
            }
          />
        ) : null}
        {!isError ? (
          <Card
            loading={isLoading}
            title={vesselId ? '当前船舶监控入口' : '全部船舶监控入口'}
          >
            {monitors.length ? (
              <List
                dataSource={monitors}
                renderItem={(item) => (
                  <List.Item
                    actions={[
                      item.isActive && isMonitorUrl(item.endpointUrl) ? (
                        item.accessMode === 'embed' ? (
                          <Button
                            key="open"
                            type="link"
                            onClick={() => setPreview(item)}
                          >
                            查看监控
                          </Button>
                        ) : (
                          <a
                            key="open"
                            href={item.endpointUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            打开
                          </a>
                        )
                      ) : null,
                      ...(isManager
                        ? [
                            <Button
                              key="edit"
                              type="link"
                              disabled={busy}
                              onClick={() => startEdit(item)}
                            >
                              编辑
                            </Button>,
                            <Button
                              key="toggle"
                              type="link"
                              disabled={busy}
                              onClick={() => void toggleActive(item)}
                            >
                              {item.isActive ? '停用' : '启用'}
                            </Button>,
                            <Popconfirm
                              key="delete"
                              title="确定删除此监控入口吗？"
                              description="删除后不会再出现在监控入口列表中。"
                              okText="删除"
                              cancelText="取消"
                              onConfirm={() => remove(item)}
                            >
                              <Button danger type="link" disabled={busy}>
                                删除
                              </Button>
                            </Popconfirm>,
                          ]
                        : []),
                    ].filter(Boolean)}
                  >
                    <List.Item.Meta
                      title={
                        <Space>
                          {item.monitorName}
                          <Tag color={item.isActive ? 'green' : 'default'}>
                            {item.isActive ? '启用' : '禁用'}
                          </Tag>
                        </Space>
                      }
                      description={
                        <span style={{ overflowWrap: 'anywhere' }}>
                          {item.vesselName ??
                            item.vesselCode ??
                            '船舶信息不可用'}{' '}
                          · {item.endpointUrl}
                        </span>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty description={isLoading ? '加载中…' : '暂无监控入口'} />
            )}
          </Card>
        ) : null}
      </Space>
      <Modal
        title={preview?.monitorName}
        open={Boolean(preview)}
        onCancel={() => setPreview(null)}
        footer={null}
        width={960}
        destroyOnHidden
      >
        {preview ? (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Typography.Paragraph>
              若平台不支持嵌入或无法加载，请
              <a href={preview.endpointUrl} target="_blank" rel="noreferrer">
                外部打开
              </a>
              。
            </Typography.Paragraph>
            <iframe
              title={preview.monitorName}
              src={preview.endpointUrl}
              style={{ width: '100%', height: '60vh', border: 0 }}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              referrerPolicy="no-referrer"
              allowFullScreen
            />
          </Space>
        ) : null}
      </Modal>
    </section>
  );
}
