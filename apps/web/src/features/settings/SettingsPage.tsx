import { Alert, Button, Card, Descriptions, Form, Input, List, Popconfirm, Select, Space, Switch, Tag, Typography, message } from 'antd';
import SettingOutlined from '@ant-design/icons/SettingOutlined';
import ApiOutlined from '@ant-design/icons/ApiOutlined';
import ClearOutlined from '@ant-design/icons/ClearOutlined';
import SendOutlined from '@ant-design/icons/SendOutlined';
import SaveOutlined from '@ant-design/icons/SaveOutlined';
import KeyOutlined from '@ant-design/icons/KeyOutlined';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppSelector } from '../../app/hooks';
import {
  type UserSettings,
  type NotificationConfigView,
  useGetNotificationConfigQuery,
  useGetNotificationDeliveriesQuery,
  useGetSettingsQuery,
  useReconcileNotificationDeliveryMutation,
  useRetryNotificationDeliveryMutation,
  useSendNotificationDraftTestMutation,
  useTestNotificationConnectionMutation,
  useUpdateNotificationConfigMutation,
  useRotateNotificationEncryptionKeyMutation,
  useUpdateSettingsMutation,
} from './settingsApi';

function notificationError(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'data' in error) {
    const data = error.data;
    if (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string') return data.message;
  }
  return fallback;
}

function notificationFormValues(config: NotificationConfigView) {
  return { agentId: config.configured ? config.agentId : undefined, secret: undefined, expectedConfigVersion: config.configVersion };
}

export function SettingsPage() {
  const currentUser = useAppSelector((state) => state.auth.currentUser);
  const { data, isLoading } = useGetSettingsQuery();
  const [updateSettings] = useUpdateSettingsMutation();
  const notificationQuery = useGetNotificationConfigQuery(undefined, { skip: !currentUser?.isAdmin });
  const [updateNotificationConfig, updateNotificationState] = useUpdateNotificationConfigMutation();
  const [rotateEncryptionKey, rotateEncryptionState] = useRotateNotificationEncryptionKeyMutation();
  const [testConnection, testConnectionState] = useTestNotificationConnectionMutation();
  const [sendDraftTest, sendDraftTestState] = useSendNotificationDraftTestMutation();
  const deliveriesQuery = useGetNotificationDeliveriesQuery(undefined, { skip: !currentUser?.isAdmin });
  const [reconcileDelivery] = useReconcileNotificationDeliveryMutation();
  const [retryDelivery] = useRetryNotificationDeliveryMutation();
  const [errorText, setErrorText] = useState<string | null>(null);
  const [notificationErrorText, setNotificationErrorText] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Partial<UserSettings>>({});
  const [form] = Form.useForm<Partial<UserSettings>>();
  const [notificationForm] = Form.useForm();

  useEffect(() => {
    if (data?.data) {
      form.setFieldsValue(data.data);
      setLastSaved(data.data);
    }
  }, [data, form]);

  useEffect(() => {
    if (notificationQuery.data?.data && !notificationForm.isFieldsTouched(['agentId', 'secret'])) {
      notificationForm.setFieldsValue(notificationFormValues(notificationQuery.data.data));
    }
  }, [notificationForm, notificationQuery.data]);

  const saveNotification = async () => {
    try {
      const values = await notificationForm.validateFields(['agentId', 'secret']);
      setNotificationErrorText(null);
      const response = await updateNotificationConfig({
        expectedConfigVersion: notificationForm.getFieldValue('expectedConfigVersion'),
        agentId: values.agentId,
        secret: values.secret || undefined,
      }).unwrap();
      message.success('推送应用配置已保存');
      notificationForm.setFields([{ name: 'secret', value: undefined, touched: false }, { name: 'agentId', value: response.data.agentId, touched: false }]);
      notificationForm.setFieldValue('expectedConfigVersion', response.data.configVersion);
    } catch (error) {
      if (error && typeof error === 'object' && 'errorFields' in error) return;
      setNotificationErrorText(notificationError(error, '配置保存失败，请重试；版本冲突时请重新加载最新配置'));
    }
  };

  const clearNotification = async () => {
    try {
      const response = await updateNotificationConfig({
        expectedConfigVersion: notificationForm.getFieldValue('expectedConfigVersion'),
        clearOverride: true,
      }).unwrap();
      message.success('已清除通知应用覆盖');
      notificationForm.resetFields();
      notificationForm.setFieldValue('expectedConfigVersion', response.data.configVersion);
      setNotificationErrorText(null);
    } catch (error) {
      setNotificationErrorText(notificationError(error, '清除失败'));
    }
  };

  const testNotification = async () => {
    try {
      const values = await notificationForm.validateFields(['agentId', 'secret']);
      const response = await testConnection({ agentId: values.agentId, secret: values.secret || undefined }).unwrap();
      message.success(`连接验证成功（${String(response.data.source ?? 'draft')}），这不代表真实送达`);
    } catch (error) {
      if (error && typeof error === 'object' && 'errorFields' in error) return;
      message.error(notificationError(error, '连接验证失败'));
    }
  };

  const sendTestNotification = async () => {
    try {
      const values = await notificationForm.validateFields(['agentId', 'secret', 'testUserId']);
      const response = await sendDraftTest({ testUserId: values.testUserId, agentId: values.agentId, secret: values.secret || undefined }).unwrap();
      if (response.data.success === true && !(response.data.invalidUser as string[] | undefined)?.includes(values.testUserId)) {
        message.success('企业微信接受了定向测试消息');
      } else if (response.data.uncertain === true) {
        message.warning('发送结果不确定，请在投递记录中人工核对');
      } else {
        message.error(String(response.data.failureReason ?? '测试消息发送失败'));
      }
    } catch (error) {
      if (error && typeof error === 'object' && 'errorFields' in error) return;
      message.error(notificationError(error, '测试发送失败'));
    }
  };

  const reloadNotification = async () => {
    try {
      const response = await notificationQuery.refetch().unwrap();
      notificationForm.resetFields();
      notificationForm.setFieldsValue(notificationFormValues(response.data));
      setNotificationErrorText(null);
    } catch (error) {
      setNotificationErrorText(notificationError(error, '推送配置读取失败，当前生效应用未知。'));
    }
  };

  const rotateNotificationKey = async () => {
    try {
      const result = await rotateEncryptionKey().unwrap();
      message.success(result.data.rotated ? `密钥轮换完成，配置版本 ${result.data.configVersion}` : '通知凭据已使用当前密钥，无需轮换');
    } catch (error) {
      message.error(notificationError(error, '密钥轮换失败'));
    }
  };

  const reconcileNotification = async (id: string, delivered: boolean) => {
    try {
      await reconcileDelivery({ id, delivered }).unwrap();
      message.success('人工核对结果已记录');
    } catch (error) {
      message.error(notificationError(error, '人工核对失败，请重新加载投递记录'));
    }
  };

  const retryNotification = async (id: string) => {
    try {
      const response = await retryDelivery(id).unwrap();
      if (response.data.uncertain === true) message.warning('发送结果不确定，请人工核对');
      else if (response.data.success === true && !(response.data.invalidUser as string[] | undefined)?.length) message.success('企业微信已接受重试消息');
      else message.error(String(response.data.failureReason ?? '重试发送失败，请查看投递记录'));
    } catch (error) {
      message.error(notificationError(error, '重试失败，请重新加载投递记录'));
    }
  };

  return (
    <section className="page-hero">
      <Typography.Title level={2}>设置</Typography.Title>
      <Typography.Paragraph type="secondary">
        配置提醒视图、证照分组和消息推送偏好。
      </Typography.Paragraph>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {currentUser?.isAdmin ? (
          <Card className="settings-card" title="平台管理">
            <Typography.Paragraph type="secondary">
              用户部门、业务角色、平台状态和通讯录同步由系统管理员统一维护。
            </Typography.Paragraph>
            <Button type="primary" icon={<SettingOutlined />}>
              <Link to="/my/settings/users">打开用户管理</Link>
            </Button>
          </Card>
        ) : null}
        {currentUser?.isAdmin ? (
          <Card loading={notificationQuery.isLoading} className="settings-card" title="企业微信推送应用">
            {notificationQuery.isError || notificationErrorText ? <Alert type="error" showIcon style={{ marginBottom: 12 }} message={notificationErrorText ?? '推送配置读取失败，当前生效应用未知。'} action={<Button size="small" onClick={reloadNotification}>重新加载配置</Button>} /> : null}
            {notificationQuery.data?.data.encryptionKeyAvailable === false ? <Alert type="error" showIcon message="服务端未配置独立加密主密钥，无法保存覆盖。" /> : null}
            {notificationQuery.data?.data.configurationError ? <Alert type="error" showIcon message="后台通知覆盖配置不完整或无法解密，业务消息已停止发送；请修复密钥、补齐凭据或明确清除覆盖。" /> : null}
            <Typography.Paragraph type="secondary">
              主应用由环境变量维护并只读显示；填写同企业通知应用后，证书、采购和任务消息使用该应用。留空 Secret 会保留已存凭据，清除覆盖才会恢复主应用。
            </Typography.Paragraph>
            <Descriptions size="small" column={{ xs: 1, sm: 2 }} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="主应用 CorpID">{notificationQuery.data?.data.mainCorpId ?? '加载中'}</Descriptions.Item>
              <Descriptions.Item label="主应用 AgentID">{notificationQuery.data?.data.mainAgentId ?? '加载中'}</Descriptions.Item>
            </Descriptions>
            <Form form={notificationForm} layout="vertical" disabled={!notificationQuery.data?.data || notificationQuery.isError || updateNotificationState.isLoading || rotateEncryptionState.isLoading}>
              <Form.Item name="expectedConfigVersion" hidden><Input /></Form.Item>
              <Form.Item name="agentId" label="通知应用 AgentID" rules={[{ pattern: /^\s*\d*\s*$/, message: 'AgentID 必须是数字' }]}><Input placeholder="可选通知应用 AgentID" /></Form.Item>
              <Form.Item name="secret" label="通知应用 Secret"><Input.Password placeholder={notificationQuery.data?.data.secretStored ? '已保存，留空表示保留' : '首次保存必填'} /></Form.Item>
              <Form.Item name="testUserId" label="定向测试人员" rules={[{ required: true, whitespace: true, message: '请填写选定测试人员的 UserID' }]}><Input placeholder="企业微信 UserID" /></Form.Item>
              <Space wrap style={{ gridColumn: '1 / -1' }}>
                <Button icon={<ApiOutlined />} loading={testConnectionState.isLoading} onClick={testNotification}>验证连接</Button>
                <Button icon={<SendOutlined />} loading={sendDraftTestState.isLoading} onClick={sendTestNotification}>发送定向测试</Button>
                <Button className="notification-save-button" type="primary" icon={<SaveOutlined />} disabled={!notificationQuery.data?.data.encryptionKeyAvailable} loading={updateNotificationState.isLoading} onClick={saveNotification}>保存覆盖</Button>
                {notificationQuery.data?.data.encryptionKeyRotationAvailable ? <Popconfirm title="使用当前 env 主密钥重新加密通知凭据？" description="请先备份新旧密钥。轮换完成后可移除旧密钥配置。" onConfirm={rotateNotificationKey}><Button icon={<KeyOutlined />} loading={rotateEncryptionState.isLoading}>轮换加密密钥</Button></Popconfirm> : null}
                <Popconfirm title="清除推送应用覆盖？" description="清除后业务通知将恢复使用 env 主应用。" onConfirm={clearNotification} okText="清除覆盖" cancelText="取消">
                  <Button danger icon={<ClearOutlined />} disabled={notificationQuery.data?.data.source !== 'admin_override'} loading={updateNotificationState.isLoading}>清除覆盖</Button>
                </Popconfirm>
              </Space>
            </Form>
            <Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>
              {notificationQuery.data?.data && !notificationQuery.isError ? `当前来源：${notificationQuery.data.data.source === 'admin_override' ? '后台覆盖' : 'env 主应用'}；应用 AgentID：${notificationQuery.data.data.agentId}；配置版本：${notificationQuery.data.data.configVersion}` : '当前推送配置尚未成功读取'}
            </Typography.Paragraph>
            <Typography.Title level={5} style={{ marginTop: 24 }}>失败与待核对投递</Typography.Title>
            {deliveriesQuery.isError ? <Alert type="error" showIcon message="投递记录读取失败，不能确定是否存在待处理消息。" action={<Button size="small" onClick={() => { void deliveriesQuery.refetch(); }}>重试读取</Button>} /> : null}
            <List
              itemLayout="vertical"
              loading={deliveriesQuery.isLoading}
              dataSource={deliveriesQuery.data?.data ?? []}
              locale={{ emptyText: deliveriesQuery.isError ? '投递状态未知' : '暂无待处理投递' }}
              renderItem={(delivery) => {
                const staleSending = delivery.status === 'sending' && Date.now() - new Date(delivery.updatedAt).getTime() > 15 * 60_000;
                return (
                  <List.Item
                    actions={[
                      delivery.status === 'uncertain' || staleSending ? (
                        <Space key="reconcile">
                          <Popconfirm title="确认企业微信已接收该消息？" onConfirm={() => reconcileNotification(delivery.id, true)}><Button size="small">已送达</Button></Popconfirm>
                          <Popconfirm title="确认该消息未送达？" description="确认后可由管理员手动重试。" onConfirm={() => reconcileNotification(delivery.id, false)}><Button size="small">未送达</Button></Popconfirm>
                        </Space>
                      ) : null,
                      delivery.status === 'failed' && delivery.sourceType !== 'settings_test' ? (
                        <Popconfirm key="retry" title="按当前通知配置重试此收件人？" onConfirm={() => retryNotification(delivery.id)}><Button size="small" type="primary">手动重试</Button></Popconfirm>
                      ) : null,
                    ]}
                  >
                    <List.Item.Meta
                      title={<Space wrap><span>{delivery.sourceType} · {delivery.recipientUserId}</span><Tag color={delivery.status === 'uncertain' ? 'orange' : 'red'}>{delivery.status === 'uncertain' ? '待人工核对' : staleSending ? '发送超时' : '失败'}</Tag></Space>}
                      description={<span style={{ overflowWrap: 'anywhere' }}>{`应用 ${delivery.agentId ?? '尚未解析'} · ${delivery.configSource} v${delivery.configVersion ?? '-'} · 尝试 ${delivery.attemptCount}${delivery.failureReason ? ` · ${delivery.failureReason}` : ''}`}</span>}
                    />
                  </List.Item>
                );
              }}
            />
          </Card>
        ) : null}
        <Card loading={isLoading} className="settings-card">
          {errorText ? <Alert style={{ marginBottom: 12 }} type="error" showIcon message={errorText} /> : null}
          <Form
            form={form}
            layout="vertical"
            onValuesChange={async (_changed, values) => {
              setErrorText(null);
              try {
                await updateSettings(values).unwrap();
                setLastSaved(values);
                message.success('设置已保存');
              } catch (error) {
                form.setFieldsValue(lastSaved);
                setErrorText(error instanceof Error ? error.message : '保存失败，已回滚');
                message.error('保存失败');
              }
            }}
          >
            <Form.Item name="reminderViewMode" label="提醒视图">
              <Select options={[{ value: 'dashboard', label: '看板' }, { value: 'list', label: '列表' }]} />
            </Form.Item>
            <Form.Item name="certificateGroupBy" label="证照分组">
              <Select options={[{ value: 'type', label: '按证照分类' }]} />
            </Form.Item>
            <Form.Item name="enablePushNotifications" valuePropName="checked" label="推送通知">
              <Switch />
            </Form.Item>
          </Form>
        </Card>
      </Space>
    </section>
  );
}
