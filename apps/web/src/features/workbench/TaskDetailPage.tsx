import { Button, DatePicker, Descriptions, Empty, Form, Input, List, Modal, Space, Tag, Timeline, Typography, message } from 'antd';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { formatShanghaiDateTime, toShanghaiIso } from '../../utils/dateTime';

import { type TaskActionInput, type TaskActionType, useGetTaskQuery, usePerformTaskActionMutation, useRetryTaskDeliveryMutation } from './taskApi';

const actionLabels: Record<TaskActionType, string> = {
  start: '开始', complete: '完成', block: '阻塞', reschedule: '改期', cancel: '取消',
  remind: '催办', escalate: '升级', delegate: '代理', transfer: '转移',
};
const immediateActions = new Set<TaskActionType>(['start', 'complete']);

export function TaskDetailPage() {
  const { taskId = '' } = useParams();
  const { data, isLoading, isError } = useGetTaskQuery(taskId);
  const [act, actionState] = usePerformTaskActionMutation();
  const [retry, retryState] = useRetryTaskDeliveryMutation();
  const [selectedAction, setSelectedAction] = useState<TaskActionType>();
  const [form] = Form.useForm<Omit<TaskActionInput, 'id' | 'actionType'>>();

  if (isLoading) return <Typography.Text>任务加载中...</Typography.Text>;
  if (isError || !data) return <Empty description="无权访问或任务不存在" />;
  const task = data.data;

  const perform = async (actionType: TaskActionType, values: Omit<TaskActionInput, 'id' | 'actionType'> = {}) => {
    const normalized = { ...values };
    if (values.scheduledAt) normalized.scheduledAt = toShanghaiIso(values.scheduledAt);
    if (values.dueAt) normalized.dueAt = toShanghaiIso(values.dueAt);
    if (values.delegateUntil) normalized.delegateUntil = toShanghaiIso(values.delegateUntil);
    await act({ id: task.id, actionType, ...normalized }).unwrap();
    message.success(`${actionLabels[actionType]}已完成`);
    setSelectedAction(undefined);
    form.resetFields();
  };

  const openAction = (actionType: TaskActionType) => {
    if (immediateActions.has(actionType)) void perform(actionType);
    else setSelectedAction(actionType);
  };

  return (
    <section className="workbench-page">
      <Typography.Title level={2}>{task.title}</Typography.Title>
      <Descriptions column={1}>
        <Descriptions.Item label="状态"><Tag color={task.isOverdue ? 'red' : 'blue'}>{task.isOverdue ? '逾期' : task.status}</Tag></Descriptions.Item>
        <Descriptions.Item label="计划时间">{formatShanghaiDateTime(task.scheduledAt)}</Descriptions.Item>
        <Descriptions.Item label="期限">{formatShanghaiDateTime(task.dueAt)}</Descriptions.Item>
        <Descriptions.Item label="负责人">{task.responsibleUserId}</Descriptions.Item>
      </Descriptions>
      <Space wrap>{task.availableActions?.map((action) => <Button key={action} loading={actionState.isLoading} onClick={() => openAction(action)}>{actionLabels[action]}</Button>)}</Space>

      <Typography.Title level={4} style={{ marginTop: 24 }}>企业微信消息</Typography.Title>
      {task.notificationDeliveries.length ? <List size="small" dataSource={task.notificationDeliveries} renderItem={(delivery) => (
        <List.Item actions={delivery.status === 'failed' ? [<Button key="retry" size="small" loading={retryState.isLoading} onClick={() => retry({ taskId: task.id, deliveryId: delivery.id })}>重试</Button>] : undefined}>
          <List.Item.Meta title={`${delivery.messageType} · ${delivery.status}`} description={`尝试 ${delivery.attemptCount} 次${delivery.failureReason ? ` · ${delivery.failureReason}` : ''}`} />
        </List.Item>
      )} /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无消息记录" />}

      <Typography.Title level={4}>参与人与责任轨迹</Typography.Title>
      <List size="small" dataSource={task.participants} renderItem={(participant) => <List.Item><List.Item.Meta title={`${participant.userId} · ${participant.role}`} description={`${participant.status}${participant.completedAt ? ` · 已完成 ${formatShanghaiDateTime(participant.completedAt)}` : ''}`} /></List.Item>} />
      {task.transfers.length ? <List size="small" header="转移记录" dataSource={task.transfers} renderItem={(transfer) => <List.Item>{transfer.fromUserId} → {transfer.toUserId} · {transfer.reason}</List.Item>} /> : null}
      {task.delegations.length ? <List size="small" header="代理记录" dataSource={task.delegations} renderItem={(delegation) => <List.Item>{delegation.delegatorUserId} → {delegation.delegateUserId} · {delegation.status}</List.Item>} /> : null}

      <Typography.Title level={4}>历史轨迹</Typography.Title>
      <Timeline items={task.actionLogs.map((log) => ({ children: `${actionLabels[log.actionType as TaskActionType] ?? log.actionType} · ${formatShanghaiDateTime(log.createdAt)}${log.reason ? ` · ${log.reason}` : ''}` }))} />

      <Modal title={selectedAction ? actionLabels[selectedAction] : ''} open={Boolean(selectedAction)} okText="确定" cancelText="取消" onCancel={() => setSelectedAction(undefined)} onOk={() => form.submit()} confirmLoading={actionState.isLoading} destroyOnHidden>
        <Form form={form} layout="vertical" onFinish={(values) => selectedAction && perform(selectedAction, values)}>
          <Form.Item name="reason" label="原因" rules={[{ required: true, message: '请输入原因' }]}><Input.TextArea maxLength={500} /></Form.Item>
          {selectedAction === 'reschedule' && <><Form.Item name="scheduledAt" label="新计划时间" rules={[{ required: true }]} getValueFromEvent={(value) => value?.format('YYYY-MM-DD HH:mm')}><DatePicker showTime format="YYYY-MM-DD HH:mm" /></Form.Item><Form.Item name="dueAt" label="新截止时间" rules={[{ required: true }]} getValueFromEvent={(value) => value?.format('YYYY-MM-DD HH:mm')}><DatePicker showTime format="YYYY-MM-DD HH:mm" /></Form.Item></>}
          {(selectedAction === 'remind' || selectedAction === 'escalate') && <Form.Item name="recipientUserId" label="接收人 ID（默认当前负责人）"><Input /></Form.Item>}
          {selectedAction === 'delegate' && <><Form.Item name="delegateUserId" label="代理人 ID" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="delegateUntil" label="代理截止时间" rules={[{ required: true }]} getValueFromEvent={(value) => value?.format('YYYY-MM-DD HH:mm')}><DatePicker showTime format="YYYY-MM-DD HH:mm" /></Form.Item></>}
          {selectedAction === 'transfer' && <Form.Item name="transferToUserId" label="新负责人 ID" rules={[{ required: true }]}><Input /></Form.Item>}
        </Form>
      </Modal>
    </section>
  );
}
