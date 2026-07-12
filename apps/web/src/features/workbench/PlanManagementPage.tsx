import { Button, Card, Empty, Form, Input, InputNumber, List, Select, Space, Tag, Typography, message } from 'antd';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { workbenchRouteConfig } from '../../router/workbenchRouteConfig';

import {
  type Plan,
  type PlanItemInput,
  useAddPlanItemMutation,
  useCreatePlanMutation,
  useGeneratePlanMutation,
  useGetGenerationRunsQuery,
  useGetPlanQuery,
  useGetPlansQuery,
  usePlanActionMutation,
} from './taskApi';

type ItemFormValue = Omit<PlanItemInput, 'participantUserIds' | 'recurrence'> & {
  participantUserIds?: string;
  startAt: string;
  dayOfMonth?: number;
  intervalDays?: number;
};

const planTypes = [
  { value: 'annual', label: '年度' },
  { value: 'monthly', label: '月度' },
  { value: 'periodic', label: '周期' },
  { value: 'one_time', label: '单次' },
];

export function PlanManagementPage() {
  const { planId } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useGetPlansQuery();
  const [selectedId, setSelectedId] = useState<string | undefined>(planId);
  const { data: detail } = useGetPlanQuery(selectedId ?? '', { skip: !selectedId });
  const { data: generationRuns } = useGetGenerationRunsQuery(selectedId ?? '', { skip: !selectedId });
  const selectedPlan = data?.data.find((plan) => plan.id === selectedId) ?? detail?.data;
  const [createPlan, creating] = useCreatePlanMutation();
  const [addItem, adding] = useAddPlanItemMutation();
  const [changeStatus, acting] = usePlanActionMutation();
  const [generate, generating] = useGeneratePlanMutation();

  const handleCreate = async (value: { title: string; planType: Plan['planType'] }) => {
    const result = await createPlan({ ...value, timeZone: 'Asia/Shanghai' }).unwrap();
    setSelectedId(result.data.id);
    navigate(workbenchRouteConfig.planDetail.buildPath(result.data.id));
    message.success('计划草稿已创建，请继续添加计划项');
  };

  const handleAddItem = async (value: ItemFormValue) => {
    if (!selectedId || !selectedPlan) return;
    const startAt = new Date(`${value.startAt.length === 16 ? `${value.startAt}:00` : value.startAt}+08:00`);
    const [, localMonth, localDay] = value.startAt.slice(0, 10).split('-').map(Number);
    const recurrence: PlanItemInput['recurrence'] = {
      kind: selectedPlan.planType,
      startAt: startAt.toISOString(),
    };
    if (selectedPlan.planType === 'monthly') recurrence.dayOfMonth = value.dayOfMonth ?? localDay;
    if (selectedPlan.planType === 'annual') {
      recurrence.month = localMonth;
      recurrence.dayOfMonth = value.dayOfMonth ?? localDay;
    }
    if (selectedPlan.planType === 'periodic') recurrence.intervalDays = value.intervalDays;
    await addItem({
      planId: selectedId,
      item: {
        title: value.title,
        responsibleUserId: value.responsibleUserId,
        participantUserIds: value.participantUserIds?.split(',').map((id) => id.trim()).filter(Boolean),
        completionRule: value.completionRule,
        quorumCount: value.quorumCount,
        dueOffsetMinutes: value.dueOffsetMinutes,
        recurrence,
        enabled: true,
      },
    }).unwrap();
    message.success('计划项已添加');
  };

  const handleGenerate = async (id: string) => {
    const start = new Date();
    const end = new Date(start);
    end.setMonth(end.getMonth() + 2);
    await generate({ id, windowStart: start.toISOString(), windowEnd: end.toISOString(), mode: 'reconcile' }).unwrap();
    message.success('生成/对账已完成');
  };

  return (
    <section className="workbench-page">
      <Typography.Title level={2}>安全计划管理</Typography.Title>
      <Form layout="inline" onFinish={handleCreate}>
        <Form.Item name="title" rules={[{ required: true, message: '请输入计划名称' }]}>
          <Input placeholder="计划名称" />
        </Form.Item>
        <Form.Item name="planType" initialValue="monthly">
          <Select style={{ width: 120 }} options={planTypes} />
        </Form.Item>
        <Button htmlType="submit" type="primary" loading={creating.isLoading}>创建草稿</Button>
      </Form>

      {isLoading ? <Typography.Text>计划加载中...</Typography.Text> : isError ? (
        <Typography.Text type="danger">计划加载失败，请重试。</Typography.Text>
      ) : data?.data.length ? (
        <List
          style={{ marginTop: 16 }}
          dataSource={data.data}
          renderItem={(plan) => (
            <List.Item
              actions={[
                <Button key="items" size="small" onClick={() => { setSelectedId(plan.id); navigate(workbenchRouteConfig.planDetail.buildPath(plan.id)); }}>计划项</Button>,
                <Button
                  key="status"
                  size="small"
                  loading={acting.isLoading}
                  disabled={plan.status === 'retired'}
                  onClick={() => changeStatus({ id: plan.id, actionType: plan.status === 'active' ? 'pause' : 'activate', reason: plan.status === 'active' ? '计划暂停' : undefined })}
                >{plan.status === 'active' ? '暂停' : '启用'}</Button>,
                <Button key="generate" size="small" disabled={plan.status !== 'active'} loading={generating.isLoading} onClick={() => handleGenerate(plan.id)}>生成/对账</Button>,
                <Button key="retire" danger size="small" disabled={plan.status === 'retired'} onClick={() => changeStatus({ id: plan.id, actionType: 'retire', reason: '停止计划' })}>退役</Button>,
              ]}
            >
              <List.Item.Meta title={plan.title} description={`${planTypes.find((item) => item.value === plan.planType)?.label} · 负责人 ${plan.ownerUserId} · ${plan.vesselId ? `船舶 ${plan.vesselId} · ` : ''}完成率 ${Math.round((plan.completionRate ?? 0) * 100)}%`} />
              <Tag color={plan.status === 'active' ? 'green' : 'default'}>{plan.status}</Tag>
            </List.Item>
          )}
        />
      ) : <Empty description="尚无安全计划" />}

      {selectedPlan && (
        <Card title={`${selectedPlan.title} · 计划项`} style={{ marginTop: 16 }}>
          <Form<ItemFormValue> layout="vertical" onFinish={handleAddItem} initialValues={{ completionRule: 'all', dueOffsetMinutes: 60 }}>
            <Space wrap align="start">
              <Form.Item name="title" label="任务名称" rules={[{ required: true }]}><Input /></Form.Item>
              <Form.Item name="responsibleUserId" label="负责人 ID" rules={[{ required: true }]}><Input /></Form.Item>
              <Form.Item name="participantUserIds" label="参与人 ID（逗号分隔）"><Input /></Form.Item>
              <Form.Item name="startAt" label="首次执行时间" rules={[{ required: true }]}><Input type="datetime-local" /></Form.Item>
              {selectedPlan.planType === 'monthly' && <Form.Item name="dayOfMonth" label="每月日期"><InputNumber min={1} max={31} /></Form.Item>}
              {selectedPlan.planType === 'periodic' && <Form.Item name="intervalDays" label="间隔天数" rules={[{ required: true }]}><InputNumber min={1} /></Form.Item>}
              <Form.Item name="completionRule" label="完成规则"><Select style={{ width: 120 }} options={[{ value: 'all', label: '全部完成' }, { value: 'any', label: '任一完成' }, { value: 'quorum', label: '达到人数' }]} /></Form.Item>
              <Form.Item noStyle shouldUpdate={(previous, current) => previous.completionRule !== current.completionRule}>{({ getFieldValue }) => getFieldValue('completionRule') === 'quorum' ? <Form.Item name="quorumCount" label="最少人数" rules={[{ required: true }]}><InputNumber min={1} /></Form.Item> : null}</Form.Item>
              <Form.Item name="dueOffsetMinutes" label="办理时限（分钟）" rules={[{ required: true }]}><InputNumber min={0} /></Form.Item>
            </Space>
            <Button htmlType="submit" type="primary" loading={adding.isLoading}>添加计划项</Button>
          </Form>
          {detail?.data.items?.length ? <List size="small" dataSource={detail.data.items} renderItem={(item) => <List.Item><List.Item.Meta title={item.title} description={`${item.responsibleUserId} · 规则 v${item.ruleVersion}`} /></List.Item>} /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="尚未添加计划项" />}
          {generationRuns?.data.length ? <List header="最近生成/对账" size="small" dataSource={generationRuns.data.slice(0, 5)} renderItem={(run) => <List.Item><List.Item.Meta title={`${run.mode} · ${run.status}`} description={`新建 ${run.createdCount} / 跳过 ${run.skippedCount} / 失败 ${run.failedCount}${run.failureMessage ? ` · ${run.failureMessage}` : ''}`} /></List.Item>} /> : null}
        </Card>
      )}
    </section>
  );
}
