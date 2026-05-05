import {
  Alert,
  Button,
  Card,
  Drawer,
  Empty,
  Form,
  Input,
  List,
  Progress,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  WorkbenchModuleSchemaField,
  WorkbenchRecordDetail,
  WorkbenchRecordSummary,
  useCreateWorkbenchRecordMutation,
  useGetWorkbenchDashboardQuery,
  useGetWorkbenchAttendanceStatisticsQuery,
  useLazyGetWorkbenchPrintSnapshotQuery,
  useGetWorkbenchModuleSchemaQuery,
  useGetWorkbenchRecordQuery,
  useGetWorkbenchRecordsQuery,
  useLaunchWorkbenchApprovalMutation,
  usePerformWorkbenchRecordActionMutation,
  useUploadWorkbenchRecordAttachmentMutation,
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
  if (field.key === 'learningStatus') {
    return (
      <Select
        placeholder={field.placeholder}
        options={[
          { value: 'not_started', label: '未开始' },
          { value: 'in_progress', label: '进行中' },
          { value: 'completed', label: '已完成' },
        ]}
      />
    );
  }
  if (field.inputType === 'textarea') {
    return <Input.TextArea rows={3} placeholder={field.placeholder} />;
  }

  return <Input type={field.inputType === 'number' ? 'number' : 'text'} placeholder={field.placeholder} />;
}

function getCurrentStep(record: WorkbenchRecordDetail) {
  return record.steps.find((step) => step.status === 'in_progress') ?? record.steps.find((step) => step.status === 'pending') ?? null;
}

export interface WorkbenchHomePageProps {
  initialModuleCode?: string | null;
  initialRecordId?: string | null;
  statisticsOnly?: boolean;
  routeAware?: boolean;
  heroTitle?: string;
  heroDescription?: string;
  moduleFilter?: 'all' | 'requiresApproval';
  recordListTitle?: string;
}

export function WorkbenchHomePage({
  initialModuleCode = null,
  initialRecordId = null,
  statisticsOnly = false,
  routeAware = false,
  heroTitle = '工作平台',
  heroDescription = 'M6 正在收口工作平台全量模块、企业微信正式上线与生产交付闭环。',
  moduleFilter = 'all',
  recordListTitle,
}: WorkbenchHomePageProps = {}) {
  const [activeModuleCode, setActiveModuleCode] = useState<string | null>(initialModuleCode);
  const [activeRecordId, setActiveRecordId] = useState<string | null>(initialRecordId);
  const [createOpen, setCreateOpen] = useState(false);
  const [statisticsMonth, setStatisticsMonth] = useState('2026-04');
  const [trainingProgressPercent, setTrainingProgressPercent] = useState<string>('0');
  const [trainingProgressStatus, setTrainingProgressStatus] = useState<'not_started' | 'in_progress' | 'completed'>('not_started');
  const [meetingPhotoFileId, setMeetingPhotoFileId] = useState('');
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const { data: dashboardResponse, isLoading: dashboardLoading } = useGetWorkbenchDashboardQuery();
  const dashboard = dashboardResponse?.data;
  const moduleCards = useMemo(() => dashboard?.modules ?? [], [dashboard?.modules]);
  const activeModule = moduleCards.find((item) => item.moduleCode === activeModuleCode) ?? null;
  const approvalModuleCodes = useMemo(
    () => new Set(moduleCards.filter((item) => item.requiresApproval).map((item) => item.moduleCode)),
    [moduleCards],
  );
  const recordsQuery = activeModuleCode
    ? { moduleCode: activeModuleCode, page: 1, pageSize: 20 }
    : moduleFilter === 'requiresApproval'
      ? { requiresApproval: true, page: 1, pageSize: 20 }
      : { page: 1, pageSize: 20 };
  const { data: recordsResponse, isLoading: recordsLoading } = useGetWorkbenchRecordsQuery(recordsQuery);
  const { data: detailResponse, isFetching: detailLoading } = useGetWorkbenchRecordQuery(activeRecordId ?? '', {
    skip: !activeRecordId,
  });

  const { data: moduleSchemaResponse, isLoading: schemaLoading } = useGetWorkbenchModuleSchemaQuery(activeModuleCode ?? '', {
    skip: !activeModuleCode,
  });
  const { data: attendanceStatisticsResponse, isLoading: attendanceStatisticsLoading } = useGetWorkbenchAttendanceStatisticsQuery(statisticsMonth ? { month: statisticsMonth } : undefined, {
    skip: !statisticsOnly && activeModule?.templateType !== 'attendance_statistics',
  });

  const [createWorkbenchRecord, { isLoading: creatingRecord }] = useCreateWorkbenchRecordMutation();
  const [performWorkbenchRecordAction, { isLoading: actionSubmitting }] = usePerformWorkbenchRecordActionMutation();
  const [uploadWorkbenchRecordAttachment, { isLoading: uploadingAttachment }] = useUploadWorkbenchRecordAttachmentMutation();
  const [launchWorkbenchApproval, { isLoading: launchingApproval }] = useLaunchWorkbenchApprovalMutation();
  const [triggerPrintSnapshot, { isFetching: printingSnapshot }] = useLazyGetWorkbenchPrintSnapshotQuery();

  const records = useMemo(() => {
    const source = recordsResponse?.data ?? [];
    if (moduleFilter !== 'requiresApproval' || activeModuleCode) {
      return source;
    }
    return source.filter((record) => approvalModuleCodes.has(record.moduleCode));
  }, [activeModuleCode, approvalModuleCodes, moduleFilter, recordsResponse?.data]);
  const visibleModuleCards = useMemo(
    () => moduleCards.filter((item) => (moduleFilter === 'requiresApproval' ? item.requiresApproval : true)),
    [moduleCards, moduleFilter],
  );
  const detailModule = detailResponse?.data ? moduleCards.find((item) => item.moduleCode === detailResponse.data.moduleCode) ?? null : null;
  const isAttendanceView = statisticsOnly || activeModule?.templateType === 'attendance_statistics';
  const resolvedRecordListTitle =
    recordListTitle ??
    (activeModule ? `模块记录：${activeModule.moduleName}` : moduleFilter === 'requiresApproval' ? '审批相关记录' : '全部模块记录');
  const canCreateRecord =
    activeModule?.templateType === 'ledger_form' ||
    activeModule?.templateType === 'operation_flow' ||
    activeModule?.templateType === 'inspection_rectification' ||
    activeModule?.templateType === 'attendance_statistics' ||
    activeModule?.templateType === 'service_asset' ||
    activeModule?.templateType === 'wecom_approval';

  useEffect(() => {
    setActiveModuleCode(initialModuleCode);
  }, [initialModuleCode]);

  useEffect(() => {
    setActiveRecordId(initialRecordId);
  }, [initialRecordId]);

  useEffect(() => {
    if (!detailResponse?.data?.moduleCode) {
      return;
    }
    if (!activeModuleCode) {
      setActiveModuleCode(detailResponse.data.moduleCode);
    }
  }, [activeModuleCode, detailResponse?.data?.moduleCode]);

  useEffect(() => {
    if (!detailResponse?.data) {
      setTrainingProgressPercent('0');
      setTrainingProgressStatus('not_started');
      setMeetingPhotoFileId('');
      return;
    }
    if (detailResponse.data.moduleCode === 'goa_training') {
      const progressRaw = detailResponse.data.payload.learningProgressPercent;
      const progressNumber =
        typeof progressRaw === 'number' ? progressRaw : Number(String(progressRaw ?? '').trim());
      setTrainingProgressPercent(Number.isFinite(progressNumber) ? String(progressNumber) : '0');
      const statusRaw = String(detailResponse.data.payload.learningStatus ?? '').trim();
      if (statusRaw === 'in_progress' || statusRaw === 'completed' || statusRaw === 'not_started') {
        setTrainingProgressStatus(statusRaw);
      } else {
        setTrainingProgressStatus('not_started');
      }
    } else {
      setTrainingProgressPercent('0');
      setTrainingProgressStatus('not_started');
    }
    setMeetingPhotoFileId('');
  }, [detailResponse?.data]);

  const goHome = () => navigate('/workbench');
  const openModule = (moduleCode: string) => {
    if (routeAware) {
      navigate(`/workbench/modules/${moduleCode}`);
      return;
    }
    setActiveModuleCode(moduleCode);
  };

  const openRecord = (recordId: string) => {
    if (routeAware) {
      navigate(`/workbench/records/${recordId}`);
      return;
    }
    setActiveRecordId(recordId);
  };

  const closeRecord = () => {
    if (routeAware) {
      if (activeModuleCode && !statisticsOnly) {
        navigate(`/workbench/modules/${activeModuleCode}`);
        return;
      }
      if (statisticsOnly) {
        navigate('/workbench/statistics/attendance');
        return;
      }
      goHome();
      return;
    }
    setActiveRecordId(null);
  };

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
    if (activeModule?.templateType === 'attendance_statistics') {
      messageApi.success('考勤统计记录已创建，可在统计看板查看汇总');
      return;
    }
    if (activeModule?.templateType === 'service_asset') {
      messageApi.success('资产服务记录已创建，可持续跟踪处理状态');
      return;
    }
    if (activeModule?.templateType === 'wecom_approval') {
      messageApi.success('审批记录已创建，可在详情中发起企业微信审批');
      return;
    }
    messageApi.success('台账记录已创建');
  };

  const triggerRecordAction = async (
    recordId: string,
    actionType: 'start' | 'complete_step' | 'update_payload' | 'submit_review' | 'request_rework' | 'close_record',
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

  const triggerLaunchApproval = async () => {
    if (!detailResponse?.data) return;
    const record = detailResponse.data;
    const result = await launchWorkbenchApproval({
      moduleCode: record.moduleCode,
      businessRecordId: record.id,
      templateCode: `${record.moduleCode}_v1`,
      title: record.title,
      applicantUserId: 'current_user',
      summary: record.summary,
      payload: record.payload,
    }).unwrap();

    messageApi.success(`审批已发起：${result.data.processInstanceId}`);
  };

  const triggerPrint = async (paperSize: 'A4' | 'A3') => {
    if (!detailResponse?.data) return;
    const result = await triggerPrintSnapshot({ recordId: detailResponse.data.id, paperSize }).unwrap();
    messageApi.success(`打印快照已生成：${result.data.paperSize} / ${result.data.renderedFormat}`);
  };

  const triggerTrainingProgressUpdate = async () => {
    if (!detailResponse?.data || detailResponse.data.moduleCode !== 'goa_training') return;
    const parsed = Number(trainingProgressPercent);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
      messageApi.warning('学习进度需为 0-100 的数字');
      return;
    }
    await triggerRecordAction(detailResponse.data.id, 'update_payload', {
      learningStatus: trainingProgressStatus,
      learningProgressPercent: parsed,
      ...(trainingProgressStatus === 'completed' ? { completedAt: new Date().toISOString().slice(0, 10) } : {}),
    });
  };

  const triggerUploadMeetingPhoto = async () => {
    if (!detailResponse?.data || detailResponse.data.moduleCode !== 'goa_meeting') return;
    const fileId = meetingPhotoFileId.trim();
    if (!fileId) {
      messageApi.warning('请先输入会议照片 fileId');
      return;
    }

    await uploadWorkbenchRecordAttachment({
      recordId: detailResponse.data.id,
      data: {
        category: 'meeting_photo',
        fileId,
        remark: 'WaveB 会议照片上传',
      },
    }).unwrap();

    const existingRaw = String(detailResponse.data.payload.photoAttachmentIds ?? '').trim();
    const existing = existingRaw
      ? existingRaw
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      : [];
    const nextIds = Array.from(new Set([...existing, fileId]));
    await triggerRecordAction(detailResponse.data.id, 'update_payload', {
      photoAttachmentIds: nextIds.join(','),
    });
    setMeetingPhotoFileId('');
    messageApi.success('会议照片已上传并写入会议字段');
  };

  return (
    <>
      {contextHolder}
      <section className="page-hero">
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <Typography.Title level={2}>{heroTitle}</Typography.Title>
          <Typography.Paragraph type="secondary">{heroDescription}</Typography.Paragraph>
          {routeAware ? (
            <Space wrap>
              <Button onClick={goHome}>返回工作台首页</Button>
              <Button onClick={() => navigate('/workbench/statistics/attendance')}>考勤统计</Button>
              <Button onClick={() => navigate('/workbench/approvals')}>审批看板</Button>
            </Space>
          ) : null}
        </Space>
      </section>

      <section className="page-card-grid workbench-stats-grid">
        <Card className="placeholder-card" variant="borderless">
          <Statistic title="当前待办" value={dashboard?.pendingTotal ?? 0} loading={dashboardLoading} />
        </Card>
        <Card className="placeholder-card" variant="borderless">
          <Statistic title="待审批" value={dashboard?.approvalPendingTotal ?? 0} loading={dashboardLoading} />
        </Card>
      </section>

      <section className="page-card-grid">
        {dashboard?.alerts.map((alert) => (
          <Alert key={alert.code} type="info" showIcon message={alert.message} />
        ))}
      </section>

      {!statisticsOnly ? (
        <section className="page-card-grid workbench-module-grid" data-testid="workbench-module-grid">
          {visibleModuleCards.length === 0 ? (
            <Card className="placeholder-card" variant="borderless">
              <Empty description={dashboardLoading ? '工作平台模块加载中…' : '暂无可访问模块'} />
            </Card>
          ) : (
            visibleModuleCards.map((item) => {
              const selected = activeModuleCode === item.moduleCode;
              return (
                <Card key={item.moduleCode} className="placeholder-card" variant="borderless">
                  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    <Space wrap>
                      <Typography.Title level={4}>{item.moduleName}</Typography.Title>
                      <Tag>{departmentLabelMap[item.departmentCode] ?? item.departmentCode}</Tag>
                      <Tag color={templateColorMap[item.templateType] ?? 'default'}>{item.templateType}</Tag>
                      {item.requiresApproval ? <Tag color="cyan">企业微信审批</Tag> : null}
                    </Space>
                    <Typography.Text type="secondary">待办：{item.pendingCount}</Typography.Text>
                    <Button type={selected ? 'primary' : 'default'} onClick={() => openModule(item.moduleCode)}>
                      {selected ? '已选中' : '查看记录'}
                    </Button>
                  </Space>
                </Card>
              );
            })
          )}
        </section>
      ) : null}

      <section className="page-card-grid">
        <Card className="placeholder-card" variant="borderless">
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
              <Typography.Title level={4}>{resolvedRecordListTitle}</Typography.Title>
              {canCreateRecord ? (
                <Button type="primary" onClick={openCreateDrawer}>
                  {activeModule?.templateType === 'operation_flow'
                    ? '新建作业闭环记录'
                    : activeModule?.templateType === 'inspection_rectification'
                      ? '新建检查整改记录'
                      : activeModule?.templateType === 'attendance_statistics'
                        ? '新建考勤统计记录'
                        : activeModule?.templateType === 'service_asset'
                          ? '新建资产服务记录'
                          : activeModule?.templateType === 'wecom_approval'
                            ? '新建审批记录'
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
                    <Button type="link" onClick={() => openRecord(record.id)}>
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

      {isAttendanceView ? (
        <section className="page-card-grid">
          <Card className="placeholder-card" variant="borderless">
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Space wrap>
                <Typography.Title level={4}>月度考勤统计</Typography.Title>
                <Input
                  value={statisticsMonth}
                  onChange={(event) => setStatisticsMonth(event.target.value)}
                  placeholder="YYYY-MM"
                  style={{ width: 160 }}
                />
              </Space>
              <Space wrap>
                <Statistic title="总签到数" value={attendanceStatisticsResponse?.data.summary.totalCheckIns ?? 0} loading={attendanceStatisticsLoading} />
                <Statistic
                  title="财务/船务签到"
                  value={attendanceStatisticsResponse?.data.summary.financeAndShippingCheckIns ?? 0}
                  loading={attendanceStatisticsLoading}
                />
                <Statistic
                  title="业务/工作组签到"
                  value={attendanceStatisticsResponse?.data.summary.operationFlowCheckIns ?? 0}
                  loading={attendanceStatisticsLoading}
                />
                <Statistic title="上午签到" value={attendanceStatisticsResponse?.data.summary.morningCount ?? 0} loading={attendanceStatisticsLoading} />
                <Statistic title="下午签到" value={attendanceStatisticsResponse?.data.summary.afternoonCount ?? 0} loading={attendanceStatisticsLoading} />
                <Statistic title="钦州范围内" value={attendanceStatisticsResponse?.data.summary.inRangeCount ?? 0} loading={attendanceStatisticsLoading} />
                <Statistic title="钦州范围外" value={attendanceStatisticsResponse?.data.summary.outRangeCount ?? 0} loading={attendanceStatisticsLoading} />
                <Statistic
                  title="出差/外派"
                  value={attendanceStatisticsResponse?.data.summary.businessTripCount ?? 0}
                  loading={attendanceStatisticsLoading}
                />
              </Space>
              <Table
                rowKey="moduleCode"
                size="small"
                loading={attendanceStatisticsLoading}
                dataSource={attendanceStatisticsResponse?.data.moduleTotals ?? []}
                pagination={false}
                columns={[
                  { title: '模块', dataIndex: 'moduleName', key: 'moduleName' },
                  { title: '部门', dataIndex: 'departmentCode', key: 'departmentCode', width: 140 },
                  { title: '记录数', dataIndex: 'recordCount', key: 'recordCount', width: 120 },
                ]}
              />
            </Space>
          </Card>
        </section>
      ) : null}

      <Drawer
        title="记录详情"
        placement="right"
        width={560}
        open={Boolean(activeRecordId)}
        onClose={closeRecord}
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
              {detailModule?.supportsPrint ? (
                <Space wrap style={{ marginTop: 12 }}>
                  <Button loading={printingSnapshot} onClick={() => void triggerPrint('A4')}>
                    打印 A4
                  </Button>
                  <Button loading={printingSnapshot} onClick={() => void triggerPrint('A3')}>
                    打印 A3
                  </Button>
                </Space>
              ) : null}
              {detailModule?.requiresApproval && !detailResponse.data.externalProcessInstanceId ? (
                <Button type="primary" style={{ marginTop: 12 }} loading={launchingApproval} onClick={() => void triggerLaunchApproval()}>
                  发起企业微信审批
                </Button>
              ) : null}
              {detailResponse.data.externalProcessInstanceId ? (
                <Typography.Paragraph type="secondary" style={{ marginTop: 8 }}>
                  审批实例：{detailResponse.data.externalProcessInstanceId}
                </Typography.Paragraph>
              ) : null}
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

            {detailResponse.data.moduleCode === 'goa_training' ? (
              <div>
                <Typography.Title level={5}>学习进度</Typography.Title>
                <Progress percent={Math.max(0, Math.min(100, Number(trainingProgressPercent) || 0))} />
                <Space wrap style={{ marginTop: 8 }}>
                  <Select
                    style={{ width: 180 }}
                    value={trainingProgressStatus}
                    onChange={(value: 'not_started' | 'in_progress' | 'completed') => setTrainingProgressStatus(value)}
                    options={[
                      { value: 'not_started', label: '未开始' },
                      { value: 'in_progress', label: '进行中' },
                      { value: 'completed', label: '已完成' },
                    ]}
                  />
                  <Input
                    style={{ width: 140 }}
                    value={trainingProgressPercent}
                    onChange={(event) => setTrainingProgressPercent(event.target.value)}
                    placeholder="0-100"
                  />
                  <Button loading={actionSubmitting} onClick={() => void triggerTrainingProgressUpdate()}>
                    更新学习进度
                  </Button>
                </Space>
              </div>
            ) : null}

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
              {detailResponse.data.moduleCode === 'goa_meeting' ? (
                <Space wrap style={{ marginBottom: 12 }}>
                  <Input
                    style={{ width: 260 }}
                    placeholder="输入会议照片 fileId"
                    value={meetingPhotoFileId}
                    onChange={(event) => setMeetingPhotoFileId(event.target.value)}
                  />
                  <Button loading={uploadingAttachment || actionSubmitting} onClick={() => void triggerUploadMeetingPhoto()}>
                    上传会议照片
                  </Button>
                </Space>
              ) : null}
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
                  : activeModule.templateType === 'attendance_statistics'
                    ? '新建考勤统计记录'
                    : activeModule.templateType === 'service_asset'
                      ? '新建资产服务记录'
                      : activeModule.templateType === 'wecom_approval'
                        ? '新建审批记录'
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
