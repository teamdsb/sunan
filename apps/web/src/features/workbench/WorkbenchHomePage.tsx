import {
  Alert,
  Button,
  Card,
  Drawer,
  Empty,
  Form,
  Input,
  List,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { useMemo, useState } from 'react';
import {
  WorkbenchModuleSchemaField,
  WorkbenchRecordDetail,
  WorkbenchRecordSummary,
  useCreateWorkbenchRecordMutation,
  useGetWorkbenchDashboardQuery,
  useGetWorkbenchModuleSchemaQuery,
  useGetWorkbenchRecordQuery,
  useGetWorkbenchRecordsQuery,
  usePerformWorkbenchRecordActionMutation,
} from './workbenchApi';

const departmentLabelMap: Record<string, string> = {
  general_office: '总经办',
  finance: '财务部',
  business: '业务部',
  shipping: '船务部',
  logistics: '后勤部',
  workgroup: '工作组',
};

const templateColorMap: Record<string, string> = {
  ledger_form: 'geekblue',
  operation_flow: 'purple',
  inspection_rectification: 'volcano',
  attendance_statistics: 'green',
  service_asset: 'gold',
  wecom_approval: 'cyan',
};

function renderDynamicField(field: WorkbenchModuleSchemaField) {
  if (field.inputType === 'textarea') {
    return <Input.TextArea rows={3} placeholder={field.placeholder} />;
  }

  return <Input type={field.inputType === 'number' ? 'number' : 'text'} placeholder={field.placeholder} />;
}

function getCurrentStep(record: WorkbenchRecordDetail) {
  return record.steps.find((step) => step.status === 'in_progress') ?? record.steps.find((step) => step.status === 'pending') ?? null;
}

export function WorkbenchHomePage() {
  const [activeModuleCode, setActiveModuleCode] = useState<string | null>(null);
  const [activeRecordId, setActiveRecordId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm();

  const { data: dashboardResponse, isLoading: dashboardLoading } = useGetWorkbenchDashboardQuery();
  const { data: recordsResponse, isLoading: recordsLoading } = useGetWorkbenchRecordsQuery(
    activeModuleCode ? { moduleCode: activeModuleCode, page: 1, pageSize: 20 } : { page: 1, pageSize: 20 },
  );
  const { data: detailResponse, isFetching: detailLoading } = useGetWorkbenchRecordQuery(activeRecordId ?? '', {
    skip: !activeRecordId,
  });

  const { data: moduleSchemaResponse, isLoading: schemaLoading } = useGetWorkbenchModuleSchemaQuery(activeModuleCode ?? '', {
    skip: !activeModuleCode,
  });

  const [createWorkbenchRecord, { isLoading: creatingRecord }] = useCreateWorkbenchRecordMutation();
  const [performWorkbenchRecordAction, { isLoading: actionSubmitting }] = usePerformWorkbenchRecordActionMutation();

  const dashboard = dashboardResponse?.data;
  const records = recordsResponse?.data ?? [];
  const moduleCards = useMemo(() => dashboard?.modules ?? [], [dashboard?.modules]);
  const activeModule = moduleCards.find((item) => item.moduleCode === activeModuleCode) ?? null;
  const detailModule = detailResponse?.data ? moduleCards.find((item) => item.moduleCode === detailResponse.data.moduleCode) ?? null : null;
  const canCreateRecord =
    activeModule?.templateType === 'ledger_form' ||
    activeModule?.templateType === 'operation_flow' ||
    activeModule?.templateType === 'inspection_rectification';

  const openCreateDrawer = () => {
    form.resetFields();
    setCreateOpen(true);
  };

  const submitCreateRecord = async () => {
    if (!activeModuleCode) return;

    const values = await form.validateFields();
    const payloadEntries = Object.entries(values.payload ?? {}).filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '');
    const payload = Object.fromEntries(payloadEntries);

    await createWorkbenchRecord({
      moduleCode: activeModuleCode,
      title: values.title,
      summary: values.summary,
      vesselId: values.vesselId,
      occurredAt: values.occurredAt,
      payload,
    }).unwrap();

    setCreateOpen(false);
    form.resetFields();
    if (activeModule?.templateType === 'operation_flow') {
      messageApi.success('作业闭环记录已创建，可在详情中推进步骤');
      return;
    }
    if (activeModule?.templateType === 'inspection_rectification') {
      messageApi.success('检查整改记录已创建，可在详情中推进整改闭环');
      return;
    }
    messageApi.success('台账记录已创建');
  };

  const triggerRecordAction = async (
    recordId: string,
    actionType: 'start' | 'complete_step' | 'submit_review' | 'request_rework' | 'close_record',
    payload?: Record<string, unknown>,
  ) => {
    const result = await performWorkbenchRecordAction({
      recordId,
      data: {
        actionType,
        payload,
      },
    }).unwrap();

    messageApi.success(`动作已执行：${result.data.acceptedAction} -> ${result.data.status}`);
  };

  return (
    <>
      {contextHolder}
      <section className="page-hero">
        <Typography.Title level={2}>工作平台</Typography.Title>
        <Typography.Paragraph type="secondary">
          Wave 5 已接入检查整改能力：总经办与船务部 `inspection_rectification` 模块可创建检查单并推进整改闭环。
        </Typography.Paragraph>
      </section>

      <section className="page-card-grid workbench-stats-grid">
        <Card className="placeholder-card" bordered={false}>
          <Statistic title="当前待办" value={dashboard?.pendingTotal ?? 0} loading={dashboardLoading} />
        </Card>
        <Card className="placeholder-card" bordered={false}>
          <Statistic title="待审批" value={dashboard?.approvalPendingTotal ?? 0} loading={dashboardLoading} />
        </Card>
      </section>

      <section className="page-card-grid">
        {dashboard?.alerts.map((alert) => (
          <Alert key={alert.code} type="info" showIcon message={alert.message} />
        ))}
      </section>

      <section className="page-card-grid workbench-module-grid" data-testid="workbench-module-grid">
        {moduleCards.length === 0 ? (
          <Card className="placeholder-card" bordered={false}>
            <Empty description={dashboardLoading ? '工作平台模块加载中…' : '暂无可访问模块'} />
          </Card>
        ) : (
          moduleCards.map((item) => {
            const selected = activeModuleCode === item.moduleCode;
            return (
              <Card key={item.moduleCode} className="placeholder-card" bordered={false}>
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <Space wrap>
                    <Typography.Title level={4}>{item.moduleName}</Typography.Title>
                    <Tag>{departmentLabelMap[item.departmentCode] ?? item.departmentCode}</Tag>
                    <Tag color={templateColorMap[item.templateType] ?? 'default'}>{item.templateType}</Tag>
                    {item.requiresApproval ? <Tag color="cyan">企业微信审批</Tag> : null}
                  </Space>
                  <Typography.Text type="secondary">待办：{item.pendingCount}</Typography.Text>
                  <Button type={selected ? 'primary' : 'default'} onClick={() => setActiveModuleCode(item.moduleCode)}>
                    {selected ? '已选中' : '查看记录'}
                  </Button>
                </Space>
              </Card>
            );
          })
        )}
      </section>

      <section className="page-card-grid">
        <Card className="placeholder-card" bordered={false}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
              <Typography.Title level={4}>{activeModuleCode ? `模块记录：${activeModuleCode}` : '全部模块记录'}</Typography.Title>
              {canCreateRecord ? (
                <Button type="primary" onClick={openCreateDrawer}>
                  {activeModule?.templateType === 'operation_flow'
                    ? '新建作业闭环记录'
                    : activeModule?.templateType === 'inspection_rectification'
                      ? '新建检查整改记录'
                      : '新建台账记录'}
                </Button>
              ) : null}
            </Space>

            <Table<WorkbenchRecordSummary>
              rowKey="id"
              loading={recordsLoading}
              dataSource={records}
              pagination={false}
              locale={{ emptyText: '暂无记录' }}
              columns={[
                {
                  title: '标题',
                  dataIndex: 'title',
                  key: 'title',
                  render: (_value: string, record) => (
                    <Button type="link" onClick={() => setActiveRecordId(record.id)}>
                      {record.title}
                    </Button>
                  ),
                },
                {
                  title: '状态',
                  dataIndex: 'status',
                  key: 'status',
                  width: 160,
                },
                {
                  title: '审批通道',
                  dataIndex: 'approvalChannel',
                  key: 'approvalChannel',
                  width: 160,
                },
                {
                  title: '时间',
                  dataIndex: 'occurredAt',
                  key: 'occurredAt',
                  width: 220,
                },
              ]}
            />
          </Space>
        </Card>
      </section>

      <Drawer
        title="记录详情"
        placement="right"
        width={560}
        open={Boolean(activeRecordId)}
        onClose={() => setActiveRecordId(null)}
      >
        {detailResponse?.data ? (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
              <Typography.Title level={4}>{detailResponse.data.title}</Typography.Title>
              <Typography.Paragraph>{detailResponse.data.summary}</Typography.Paragraph>
              <Space wrap>
                <Tag>{detailResponse.data.status}</Tag>
                <Tag>{detailResponse.data.approvalChannel}</Tag>
                {detailResponse.data.externalStatus ? <Tag color="cyan">{detailResponse.data.externalStatus}</Tag> : null}
              </Space>
            </div>

            <div>
              <Typography.Title level={5}>步骤</Typography.Title>
              <List
                bordered
                dataSource={detailResponse.data.steps}
                locale={{ emptyText: '台账类模块默认无步骤' }}
                renderItem={(step) => (
                  <List.Item>
                    <Space direction="vertical" size={2}>
                      <Typography.Text strong>{step.stepName}</Typography.Text>
                      <Typography.Text type="secondary">
                        {step.stepCode} / {step.status}
                      </Typography.Text>
                    </Space>
                  </List.Item>
                )}
              />
              {detailResponse.data.steps.length > 0 ? (
                <Space wrap style={{ marginTop: 12 }}>
                  {detailResponse.data.status === 'assigned' ? (
                    <Button
                      type="primary"
                      loading={actionSubmitting}
                      onClick={() => void triggerRecordAction(detailResponse.data.id, 'start')}
                    >
                      开始作业
                    </Button>
                  ) : null}
                  {detailResponse.data.status === 'in_progress' ? (
                    <>
                      <Button
                        loading={actionSubmitting}
                        onClick={() => {
                          const currentStep = getCurrentStep(detailResponse.data);
                          if (!currentStep) {
                            messageApi.warning('当前没有可推进步骤');
                            return;
                          }
                          void triggerRecordAction(detailResponse.data.id, 'complete_step', {
                            stepCode: currentStep.stepCode,
                            rectificationRequired: false,
                          });
                        }}
                      >
                        完成当前步骤
                      </Button>
                      {detailModule?.templateType === 'inspection_rectification' ? (
                        <Button
                          loading={actionSubmitting}
                          onClick={() => {
                            const currentStep = getCurrentStep(detailResponse.data);
                            if (!currentStep) {
                              messageApi.warning('当前没有可推进步骤');
                              return;
                            }
                            void triggerRecordAction(detailResponse.data.id, 'complete_step', {
                              stepCode: currentStep.stepCode,
                              rectificationRequired: true,
                              rectificationStatus: 'submitted',
                            });
                          }}
                        >
                          标记整改并推进
                        </Button>
                      ) : null}
                    </>
                  ) : null}
                  {detailResponse.data.status === 'rework_required' ? (
                    <Button
                      loading={actionSubmitting}
                      onClick={() => {
                        const currentStep = getCurrentStep(detailResponse.data);
                        if (!currentStep) {
                          messageApi.warning('当前没有可推进步骤');
                          return;
                        }
                        void triggerRecordAction(detailResponse.data.id, 'complete_step', {
                          stepCode: currentStep.stepCode,
                          rectificationRequired: true,
                          rectificationStatus: 'completed',
                        });
                      }}
                    >
                      整改完成并继续
                    </Button>
                  ) : null}
                  {detailResponse.data.status === 'pending_review' ? (
                    <>
                      <Button
                        type="primary"
                        loading={actionSubmitting}
                        onClick={() => void triggerRecordAction(detailResponse.data.id, 'submit_review')}
                      >
                        提交审核
                      </Button>
                      {detailModule?.templateType === 'inspection_rectification' ? (
                        <Button loading={actionSubmitting} onClick={() => void triggerRecordAction(detailResponse.data.id, 'request_rework')}>
                          退回整改
                        </Button>
                      ) : null}
                    </>
                  ) : null}
                  {detailResponse.data.status !== 'closed' && detailResponse.data.status !== 'archived' ? (
                    <Button
                      danger
                      loading={actionSubmitting}
                      onClick={() => void triggerRecordAction(detailResponse.data.id, 'close_record')}
                    >
                      关闭记录
                    </Button>
                  ) : null}
                </Space>
              ) : null}
            </div>

            <div>
              <Typography.Title level={5}>台账字段</Typography.Title>
              <List
                bordered
                dataSource={Object.entries(detailResponse.data.payload)}
                locale={{ emptyText: '暂无字段数据' }}
                renderItem={([key, value]) => (
                  <List.Item>
                    <Space>
                      <Tag>{key}</Tag>
                      <Typography.Text>{String(value)}</Typography.Text>
                    </Space>
                  </List.Item>
                )}
              />
            </div>

            <div>
              <Typography.Title level={5}>附件</Typography.Title>
              <List
                bordered
                dataSource={detailResponse.data.attachments}
                locale={{ emptyText: '暂无附件' }}
                renderItem={(attachment) => (
                  <List.Item>
                    <Space>
                      <Tag>{attachment.category}</Tag>
                      <Typography.Text>{attachment.fileName}</Typography.Text>
                    </Space>
                  </List.Item>
                )}
              />
            </div>

            <div>
              <Typography.Title level={5}>操作日志</Typography.Title>
              <List
                bordered
                dataSource={detailResponse.data.actionLogs}
                locale={{ emptyText: '暂无日志' }}
                renderItem={(log) => (
                  <List.Item>
                    <Space direction="vertical" size={2}>
                      <Typography.Text strong>{log.actionType}</Typography.Text>
                      <Typography.Text type="secondary">
                        {log.operatorUserId}：{log.fromStatus} → {log.toStatus}
                      </Typography.Text>
                    </Space>
                  </List.Item>
                )}
              />
            </div>
          </Space>
        ) : (
          <Empty description={detailLoading ? '详情加载中…' : '请选择记录'} />
        )}
      </Drawer>

      <Drawer
        title={
          activeModule
            ? `${activeModule.templateType === 'operation_flow'
                ? '新建作业闭环记录'
                : activeModule.templateType === 'inspection_rectification'
                  ? '新建检查整改记录'
                  : '新建台账记录'} - ${activeModule.moduleName}`
            : '新建记录'
        }
        placement="right"
        width={560}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        extra={
          <Button type="primary" onClick={() => void submitCreateRecord()} loading={creatingRecord}>
            提交
          </Button>
        }
      >
        {!activeModuleCode ? (
          <Empty description="请先选择模块" />
        ) : (
          <Form layout="vertical" form={form}>
            <Form.Item label="记录标题" name="title" rules={[{ required: true, message: '请输入记录标题' }]}>
              <Input placeholder="输入记录标题" />
            </Form.Item>
            <Form.Item label="摘要" name="summary" rules={[{ required: true, message: '请输入摘要' }]}>
              <Input.TextArea rows={3} placeholder="输入摘要说明" />
            </Form.Item>
            <Form.Item label="发生时间（ISO，可选）" name="occurredAt">
              <Input placeholder="例如：2026-04-21T08:00:00.000Z" />
            </Form.Item>
            <Form.Item label="船舶ID（可选）" name="vesselId">
              <Input placeholder="例如：sunan-012" />
            </Form.Item>

            {moduleSchemaResponse?.data.templateType === 'operation_flow' && moduleSchemaResponse.data.stepTemplates?.length ? (
              <Card size="small" style={{ marginBottom: 12 }} loading={schemaLoading}>
                <Typography.Title level={5}>流程步骤（自动初始化）</Typography.Title>
                <List
                  size="small"
                  bordered
                  dataSource={moduleSchemaResponse.data.stepTemplates}
                  renderItem={(step) => (
                    <List.Item>
                      <Space>
                        <Tag>{step.stepCode}</Tag>
                        <Typography.Text>{step.stepName}</Typography.Text>
                      </Space>
                    </List.Item>
                  )}
                />
              </Card>
            ) : null}

            {moduleSchemaResponse?.data.templateType === 'inspection_rectification' && moduleSchemaResponse.data.stepTemplates?.length ? (
              <Card size="small" style={{ marginBottom: 12 }} loading={schemaLoading}>
                <Typography.Title level={5}>整改步骤（自动初始化）</Typography.Title>
                <List
                  size="small"
                  bordered
                  dataSource={moduleSchemaResponse.data.stepTemplates}
                  renderItem={(step) => (
                    <List.Item>
                      <Space>
                        <Tag>{step.stepCode}</Tag>
                        <Typography.Text>{step.stepName}</Typography.Text>
                      </Space>
                    </List.Item>
                  )}
                />
              </Card>
            ) : null}

            {moduleSchemaResponse?.data.sections.map((section) => (
              <Card key={section.key} size="small" style={{ marginBottom: 12 }} loading={schemaLoading}>
                <Typography.Title level={5}>{section.title}</Typography.Title>
                {section.fields.map((field) => (
                  <Form.Item
                    key={field.key}
                    label={field.label}
                    name={['payload', field.key]}
                    rules={field.required ? [{ required: true, message: `请填写${field.label}` }] : undefined}
                  >
                    {renderDynamicField(field)}
                  </Form.Item>
                ))}
              </Card>
            ))}
          </Form>
        )}
      </Drawer>
    </>
  );
}
