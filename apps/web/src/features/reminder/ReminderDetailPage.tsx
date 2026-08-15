import { Alert, Button, Card, Descriptions, Space, Tag, Typography, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAppSelector } from '../../app/hooks';
import { myRouteConfig } from '../../router/myRouteConfig';
import { resolveBackHref } from '../../router/myRouteState';
import {
  useAcknowledgeReminderMutation,
  useGetReminderByIdQuery,
  type ReminderItem,
} from './reminderApi';
import { canAcknowledgeReminder, canManageReminderActions, isOverdueReminder } from './reminderPermissions';

function describeAckStatus(reminder: ReminderItem): string {
  if (reminder.status === 'acknowledged') {
    return '已确认';
  }

  if (isOverdueReminder(reminder)) {
    return '逾期未确认';
  }

  return '待处理';
}

export function ReminderDetailPage() {
  const { id = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const currentUser = useAppSelector((state) => state.auth.currentUser);
  const { data, isLoading, refetch } = useGetReminderByIdQuery(id, { skip: !id });
  const [acknowledgeReminder, { isLoading: acknowledging }] = useAcknowledgeReminderMutation();
  const [localReminder, setLocalReminder] = useState<ReminderItem | null>(null);
  const [acknowledgeError, setAcknowledgeError] = useState<string | null>(null);

  useEffect(() => {
    if (data?.data) {
      setLocalReminder(data.data);
    }
  }, [data]);

  const reminder = localReminder ?? data?.data ?? null;
  const roles = useMemo(() => currentUser?.roles ?? [], [currentUser?.roles]);
  const canAcknowledge = useMemo(
    () => (reminder ? canAcknowledgeReminder(currentUser?.userId, roles, reminder) : false),
    [currentUser?.userId, reminder, roles],
  );
  const canShowAction = reminder ? canManageReminderActions(roles) || currentUser?.userId === reminder.recipientUserId : false;
  const isAcknowledged = reminder?.status === 'acknowledged';

  const handleAcknowledge = async () => {
    if (!id || !reminder) {
      return;
    }

    setAcknowledgeError(null);

    try {
      const response = await acknowledgeReminder({ id, comment: '已确认' }).unwrap();
      setLocalReminder(response.data);
      await refetch();
      message.success('提醒已确认');
    } catch (error) {
      if ((error as { status?: number }).status === 409) {
        setLocalReminder((current) =>
          current
            ? {
                ...current,
                status: 'acknowledged',
              }
            : current,
        );
        message.info('该提醒已经确认');
        return;
      }

      setAcknowledgeError(error instanceof Error ? error.message : '确认失败，请稍后重试');
    }
  };

  return (
    <section className="page-hero">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Space align="center" wrap className="detail-header-actions">
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() =>
              navigate(
                resolveBackHref(myRouteConfig.reminders.path, location.search),
              )
            }
          >
            返回提醒列表
          </Button>
          <Typography.Title level={2} style={{ marginBottom: 0 }}>
            提醒详情
          </Typography.Title>
        </Space>
        <Typography.Paragraph type="secondary">
          查看提醒状态、关联证照与处理记录。
        </Typography.Paragraph>

        <Card loading={isLoading}>
          {acknowledgeError ? <Alert type="error" showIcon message={acknowledgeError} style={{ marginBottom: 12 }} /> : null}
          {reminder ? (
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <Space wrap>
                <Tag color={isOverdueReminder(reminder) ? 'red' : 'blue'}>
                  {isOverdueReminder(reminder) ? '逾期' : '临期'}
                </Tag>
                <Tag color={isAcknowledged ? 'green' : 'gold'}>{describeAckStatus(reminder)}</Tag>
              </Space>

              <Card title="提醒摘要" size="small">
                <Descriptions column={1} bordered size="small">
                  <Descriptions.Item label="提醒编号">{reminder.id}</Descriptions.Item>
                  <Descriptions.Item label="证书标题">{reminder.certificateTitle}</Descriptions.Item>
                  <Descriptions.Item label="持有对象">{reminder.ownerName}</Descriptions.Item>
                  <Descriptions.Item label="对象类型">{reminder.ownerType}</Descriptions.Item>
                  <Descriptions.Item label="提醒类型">{reminder.reminderType}</Descriptions.Item>
                  <Descriptions.Item label="计划日期">{reminder.scheduledDate}</Descriptions.Item>
                  <Descriptions.Item label="提前天数">{reminder.daysBeforeExpiry}</Descriptions.Item>
                </Descriptions>
              </Card>

              <Card title="关联证照信息" size="small">
                <Descriptions column={1} bordered size="small">
                  <Descriptions.Item label="证照 ID">{reminder.certificateId}</Descriptions.Item>
                  <Descriptions.Item label="证照标题">{reminder.certificateTitle}</Descriptions.Item>
                  <Descriptions.Item label="接收人">{reminder.recipientUserId}</Descriptions.Item>
                </Descriptions>
              </Card>

              <Card title="处理记录" size="small">
                <Descriptions column={1} bordered size="small">
                  <Descriptions.Item label="发送时间">{reminder.sentAt ?? '未发送'}</Descriptions.Item>
                  <Descriptions.Item label="确认时间">{reminder.acknowledgedAt ?? '未确认'}</Descriptions.Item>
                  <Descriptions.Item label="确认人">{reminder.acknowledgedBy ?? '未确认'}</Descriptions.Item>
                </Descriptions>
              </Card>

              <Space wrap className="detail-action-bar">
                {canShowAction && canAcknowledge ? (
                  <Button type="primary" loading={acknowledging} onClick={handleAcknowledge}>
                    确认提醒
                  </Button>
                ) : null}
              </Space>
            </Space>
          ) : null}
        </Card>
      </Space>
    </section>
  );
}
