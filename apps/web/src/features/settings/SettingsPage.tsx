import { Alert, Button, Card, Form, Select, Space, Switch, Typography, message } from 'antd';
import SettingOutlined from '@ant-design/icons/SettingOutlined';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppSelector } from '../../app/hooks';
import { type UserSettings, useGetSettingsQuery, useUpdateSettingsMutation } from './settingsApi';

export function SettingsPage() {
  const currentUser = useAppSelector((state) => state.auth.currentUser);
  const { data, isLoading } = useGetSettingsQuery();
  const [updateSettings] = useUpdateSettingsMutation();
  const [errorText, setErrorText] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Partial<UserSettings>>({});
  const [form] = Form.useForm<Partial<UserSettings>>();

  useEffect(() => {
    if (data?.data) {
      form.setFieldsValue(data.data);
      setLastSaved(data.data);
    }
  }, [data, form]);

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
