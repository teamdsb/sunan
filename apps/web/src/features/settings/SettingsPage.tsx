import { Alert, Card, Form, Select, Switch, Typography, message } from 'antd';
import { useEffect, useState } from 'react';
import { type UserSettings, useGetSettingsQuery, useUpdateSettingsMutation } from './settingsApi';

export function SettingsPage() {
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
      <Card loading={isLoading}>
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
            <Select options={[{ value: 'owner', label: '按对象' }, { value: 'type', label: '按类型' }]} />
          </Form.Item>
          <Form.Item name="enablePushNotifications" valuePropName="checked" label="推送通知">
            <Switch />
          </Form.Item>
        </Form>
      </Card>
    </section>
  );
}
