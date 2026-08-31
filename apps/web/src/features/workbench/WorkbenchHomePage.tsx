import {
  AppstoreOutlined,
  BarChartOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  FileTextOutlined,
  InfoCircleFilled,
  ProfileOutlined,
  ReadOutlined,
  RightOutlined,
  SafetyCertificateOutlined,
  TableOutlined,
  UpOutlined,
  DownOutlined,
  WarningOutlined,
  UserSwitchOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Drawer,
  Empty,
  Form,
  Input,
  List,
  Progress,
  Select,
  Space,
  Statistic,
  Tag,
  Typography,
  message,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { ResponsiveTable } from '../../components/ResponsiveTable';
import { useWecomJsSdk } from '../../hooks/useWecomJsSdk';
import { workbenchRouteConfig } from '../../router/workbenchRouteConfig';
import {
  WorkbenchApprovalLaunchConfig,
  WorkbenchModuleSchemaField,
  WorkbenchRecordDetail,
  WorkbenchRecordSummary,
  useCreateWorkbenchRecordMutation,
  useGetWorkbenchDashboardQuery,
  useGetWorkbenchAttendanceStatisticsQuery,
  useLazyGetWorkbenchPrintSnapshotQuery,
  useGetWorkbenchModuleSchemaQuery,
  useGetWorkbenchRecordQuery,
  useGetWorkbenchRecordIssuesQuery,
  useGetWorkbenchRecordsQuery,
  useLaunchWorkbenchApprovalMutation,
  usePerformWorkbenchRecordActionMutation,
  useUploadWorkbenchRecordAttachmentMutation,
  useCreateWorkbenchSignatureEvidenceMutation,
  useCreateWorkbenchLocationEvidenceMutation,
} from './workbenchApi';
import { EvidencePanel } from './EvidencePanel';
import { useGetMasterDataVesselsQuery } from './masterDataApi';
import { formatShanghaiDateTime, toShanghaiIso } from '../../utils/dateTime';

const departmentLabelMap: Record<string, string> = {
  general_office: '总经办',
  finance: '财务部',
  business: '综合部',
  shipping: '航运部',
  logistics: '后勤部',
  safety: '安全部',
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

const templateLabelMap: Record<string, string> = {
  ledger_form: '台账表单',
  operation_flow: '作业闭环',
  inspection_rectification: '检查整改',
  attendance_statistics: '考勤统计',
  service_asset: '资产服务',
  wecom_approval: '企业微信审批',
};

const approvalChannelLabelMap: Record<string, string> = {
  internal: '系统内审批',
  wecom_native: '企业微信审批',
};

const recordStatusLabelMap: Record<string, string> = {
  draft: '草稿',
  submitted: '已提交',
  assigned: '已分派',
  in_progress: '处理中',
  pending_review: '待审核',
  rework_required: '需整改',
  closed: '已关闭',
  archived: '已归档',
  approval_pending: '审批中',
  approval_passed: '审批通过',
  approval_rejected: '审批驳回',
  approval_canceled: '审批撤销',
  approval_terminated: '审批终止',
};

const stepStatusLabelMap: Record<string, string> = {
  pending: '待处理',
  in_progress: '进行中',
  completed: '已完成',
};

const actionTypeLabelMap: Record<string, string> = {
  submit: '提交',
  assign: '分派',
  start: '开始作业',
  complete_step: '完成步骤',
  update_payload: '更新信息',
  submit_review: '提交审核',
  request_rework: '退回整改',
  close_record: '关闭记录',
  archive: '归档',
  launch_approval: '发起审批',
  approval_callback: '审批回调',
  approval_reconcile: '审批对账',
  approval_retry: '审批重试',
  approval_retry_reconcile: '审批重试对账',
};

const externalStatusLabelMap: Record<string, string> = {
  pending: '审批中',
  approved: '审批通过',
  rejected: '审批驳回',
  canceled: '审批撤销',
  terminated: '审批终止',
};

function labelFrom(
  map: Record<string, string>,
  value: string | null | undefined,
  fallback = '-',
) {
  if (!value) {
    return fallback;
  }

  return map[value] ?? fallback;
}

function recordDateParts(occurredAt: string, compact = false) {
  const formatted = formatShanghaiDateTime(occurredAt);
  if (formatted === '-') {
    return { date: '-', time: '' };
  }
  const [fullDate, time] = formatted.split(' ');
  const date = compact ? fullDate.slice(5) : fullDate;
  return { date, time: time ?? '' };
}

function getMobileStatusMeta(record: WorkbenchRecordSummary) {
  if (record.status === 'approval_passed') {
    return { label: '已通过', tone: 'success' };
  }
  if (record.status === 'closed') {
    return { label: '已关闭', tone: 'success' };
  }
  if (record.status === 'rework_required' || record.status === 'approval_rejected') {
    return { label: labelFrom(recordStatusLabelMap, record.status), tone: 'warning' };
  }
  if (record.status === 'approval_pending') {
    return { label: '待审批', tone: 'primary' };
  }
  return {
    label: labelFrom(recordStatusLabelMap, record.status, '待处理'),
    tone: 'primary',
  };
}

function renderMobileModuleIcon(moduleCode: string) {
  if (moduleCode === 'business_signin_desk') {
    return <CalendarOutlined />;
  }
  if (moduleCode === 'safety_task_center') {
    return <SafetyCertificateOutlined />;
  }
  return <ReadOutlined />;
}

function renderMobileRecordIcon(record: WorkbenchRecordSummary) {
  if (record.status === 'rework_required' || record.status === 'approval_rejected') {
    return <WarningOutlined />;
  }
  return <FileTextOutlined />;
}

const WECOM_APPROVAL_AGENT_JS_API_LIST = ['thirdPartyOpenPage'];

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

  if (field.inputType === 'datetime') {
    return <DatePicker showTime format={['YYYY-MM-DD HH:mm', 'YYYY-MM-DDTHH:mm']} placeholder={field.placeholder ?? '选择日期时间'} style={{ width: '100%' }} />;
  }

  if (field.inputType === 'date') {
    return <DatePicker showTime format={['YYYY-MM-DD HH:mm', 'YYYY-MM-DDTHH:mm']} placeholder={field.placeholder ?? '选择日期时间'} style={{ width: '100%' }} />;
  }

  return (
    <Input
      type={field.inputType === 'number' ? 'number' : 'text'}
      placeholder={field.placeholder}
    />
  );
}

function getCurrentStep(record: WorkbenchRecordDetail) {
  return (
    record.steps.find((step) => step.status === 'in_progress') ??
    record.steps.find((step) => step.status === 'pending') ??
    null
  );
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
  heroDescription = '集中处理部门记录、审批、打印和统计任务。',
  moduleFilter = 'all',
  recordListTitle,
}: WorkbenchHomePageProps = {}) {
  const showMobileWorkbenchHome =
    routeAware &&
    !statisticsOnly &&
    !initialModuleCode &&
    !initialRecordId &&
    moduleFilter === 'all';
  const [activeModuleCode, setActiveModuleCode] = useState<string | null>(
    initialModuleCode,
  );
  const [activeRecordId, setActiveRecordId] = useState<string | null>(
    initialRecordId,
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [statisticsMonth, setStatisticsMonth] = useState(() =>
    new Date().toISOString().slice(0, 7),
  );
  const [trainingProgressPercent, setTrainingProgressPercent] =
    useState<string>('0');
  const [trainingProgressStatus, setTrainingProgressStatus] = useState<
    'not_started' | 'in_progress' | 'completed'
  >('not_started');
  const [alertNoticeVisible, setAlertNoticeVisible] = useState(true);
  const [mobileModulesExpanded, setMobileModulesExpanded] = useState(false);
  const [mobileRecordsExpanded, setMobileRecordsExpanded] = useState(false);
  const [taskBoardExpanded, setTaskBoardExpanded] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const wecomApprovalSdk = useWecomJsSdk({
    jsApiList: [],
    agentJsApiList: WECOM_APPROVAL_AGENT_JS_API_LIST,
  });

  const {
    data: dashboardResponse,
    isLoading: dashboardLoading,
    isError: dashboardError,
  } = useGetWorkbenchDashboardQuery();
  const dashboard = dashboardResponse?.data;
  const moduleCards = useMemo(
    () => dashboard?.modules ?? [],
    [dashboard?.modules],
  );
  const activeModule =
    moduleCards.find((item) => item.moduleCode === activeModuleCode) ?? null;
  const approvalModuleCodes = useMemo(
    () =>
      new Set(
        moduleCards
          .filter((item) => item.requiresApproval)
          .map((item) => item.moduleCode),
      ),
    [moduleCards],
  );
  const recordsQuery = activeModuleCode
    ? { moduleCode: activeModuleCode, page: 1, pageSize: 20 }
    : moduleFilter === 'requiresApproval'
      ? { requiresApproval: true, page: 1, pageSize: 20 }
      : { page: 1, pageSize: 20 };
  const {
    data: recordsResponse,
    isLoading: recordsLoading,
    isError: recordsError,
  } = useGetWorkbenchRecordsQuery(recordsQuery);
  const {
    data: approvalPendingResponse,
    isError: approvalPendingError,
  } = useGetWorkbenchRecordsQuery(
    { status: 'approval_pending', page: 1, pageSize: 100 },
    { skip: !showMobileWorkbenchHome },
  );
  const { data: detailResponse, isFetching: detailLoading } =
    useGetWorkbenchRecordQuery(activeRecordId ?? '', {
      skip: !activeRecordId,
    });
  const { data: issueLinksResponse } = useGetWorkbenchRecordIssuesQuery(activeRecordId ?? '', {
    skip: !activeRecordId,
  });

  const { data: moduleSchemaResponse, isLoading: schemaLoading } =
    useGetWorkbenchModuleSchemaQuery(activeModuleCode ?? '', {
      skip: !activeModuleCode,
    });
  const { data: vesselsResponse, isLoading: vesselsLoading } =
    useGetMasterDataVesselsQuery(undefined, { skip: !createOpen });
  const {
    data: attendanceStatisticsResponse,
    isLoading: attendanceStatisticsLoading,
    isError: attendanceStatisticsError,
  } = useGetWorkbenchAttendanceStatisticsQuery(
    statisticsMonth ? { month: statisticsMonth } : undefined,
    {
      skip:
        !statisticsOnly &&
        activeModule?.templateType !== 'attendance_statistics',
    },
  );

  const [createWorkbenchRecord, { isLoading: creatingRecord }] =
    useCreateWorkbenchRecordMutation();
  const [performWorkbenchRecordAction, { isLoading: actionSubmitting }] =
    usePerformWorkbenchRecordActionMutation();
  const [uploadWorkbenchRecordAttachment] =
    useUploadWorkbenchRecordAttachmentMutation();
  const [createSignatureEvidence] = useCreateWorkbenchSignatureEvidenceMutation();
  const [createLocationEvidence] = useCreateWorkbenchLocationEvidenceMutation();
  const [launchWorkbenchApproval, { isLoading: launchingApproval }] =
    useLaunchWorkbenchApprovalMutation();
  const [triggerPrintSnapshot, { isFetching: printingSnapshot }] =
    useLazyGetWorkbenchPrintSnapshotQuery();

  const records = useMemo(() => {
    const source = recordsResponse?.data ?? [];
    if (moduleFilter !== 'requiresApproval' || activeModuleCode) {
      return source;
    }
    return source.filter((record) =>
      approvalModuleCodes.has(record.moduleCode),
    );
  }, [
    activeModuleCode,
    approvalModuleCodes,
    moduleFilter,
    recordsResponse?.data,
  ]);
  const visibleModuleCards = useMemo(
    () =>
      moduleCards.filter((item) =>
        moduleFilter === 'requiresApproval' ? item.requiresApproval : true,
      ),
    [moduleCards, moduleFilter],
  );
  const orderedModuleCards = useMemo(
    () =>
      [...visibleModuleCards].sort(
        (left, right) =>
          Number(right.moduleCode === activeModuleCode) -
            Number(left.moduleCode === activeModuleCode),
      ),
    [activeModuleCode, visibleModuleCards],
  );
  const detailModule = detailResponse?.data
    ? (moduleCards.find(
        (item) => item.moduleCode === detailResponse.data.moduleCode,
      ) ?? null)
    : null;
  const availableActions = new Set(detailResponse?.data?.availableActions ?? []);
  const schemaFieldLabelMap = useMemo(() => {
    const labels = new Map<string, string>();
    moduleSchemaResponse?.data.sections.forEach((section) => {
      section.fields.forEach((field) => {
        labels.set(field.key, field.label);
      });
    });
    return labels;
  }, [moduleSchemaResponse?.data.sections]);
  const isAttendanceView =
    statisticsOnly || activeModule?.templateType === 'attendance_statistics';
  const resolvedRecordListTitle =
    recordListTitle ??
    (activeModule
      ? `模块记录：${activeModule.moduleName}`
      : moduleFilter === 'requiresApproval'
        ? '审批相关记录'
        : '全部模块记录');
  const canCreateRecord =
    activeModule?.templateType === 'ledger_form' ||
    activeModule?.templateType === 'operation_flow' ||
    activeModule?.templateType === 'inspection_rectification' ||
    activeModule?.templateType === 'attendance_statistics' ||
    activeModule?.templateType === 'service_asset' ||
    activeModule?.templateType === 'wecom_approval';
  const showHomeReturn =
    routeAware &&
    (Boolean(initialModuleCode) ||
      Boolean(initialRecordId) ||
      statisticsOnly ||
      moduleFilter !== 'all');
  const pendingRecords = useMemo(
    () =>
      records.filter((record) =>
        [
          'submitted',
          'assigned',
          'in_progress',
          'pending_review',
          'approval_pending',
          'rework_required',
        ].includes(record.status),
      ),
    [records],
  );
  const sortedRecords = useMemo(
    () =>
      [...records]
        .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt)),
    [records],
  );
  const recentRecords = useMemo(() => sortedRecords.slice(0, 5), [sortedRecords]);
  const priorityRecords = useMemo(
    () => {
      if (showMobileWorkbenchHome) {
        return (approvalPendingResponse?.data ?? [])
          .filter((record) => record.status === 'approval_pending')
          .slice(0, 5);
      }
      return pendingRecords
        .filter((record) => approvalModuleCodes.has(record.moduleCode))
        .slice(0, 5);
    },
    [
      approvalModuleCodes,
      approvalPendingResponse?.data,
      pendingRecords,
      showMobileWorkbenchHome,
    ],
  );
  const recentRecordRows = useMemo(
    () =>
      recentRecords.map((record) => ({
        ...record,
        moduleName:
          moduleCards.find((item) => item.moduleCode === record.moduleCode)
            ?.moduleName ?? record.moduleCode,
      })),
    [moduleCards, recentRecords],
  );
  const mobileModuleCards = useMemo(() => {
    const sorted = [...orderedModuleCards].sort(
      (left, right) =>
        Number(right.moduleCode === activeModuleCode) -
          Number(left.moduleCode === activeModuleCode) ||
        Number(right.mobileFirst) - Number(left.mobileFirst) ||
        right.pendingCount - left.pendingCount ||
        left.moduleName.localeCompare(right.moduleName, 'zh-CN'),
    );
    return mobileModulesExpanded ? sorted : sorted.slice(0, 3);
  }, [activeModuleCode, mobileModulesExpanded, orderedModuleCards]);
  const mobilePriorityRecords = useMemo(
    () =>
      [
        ...priorityRecords,
        ...pendingRecords.filter(
          (record) => !priorityRecords.some((priority) => priority.id === record.id),
        ),
      ].slice(0, 2),
    [pendingRecords, priorityRecords],
  );
  const mobileRecentRecords = useMemo(
    () => {
      const source = mobileRecordsExpanded
        ? sortedRecords
        : sortedRecords.slice(0, 3);
      return source.map((record) => ({
        ...record,
        moduleName:
          moduleCards.find((item) => item.moduleCode === record.moduleCode)
            ?.moduleName ?? record.moduleCode,
      }));
    },
    [mobileRecordsExpanded, moduleCards, sortedRecords],
  );
  const mobileActiveModuleTotal = dashboardResponse
    ? visibleModuleCards.length
    : undefined;
  const mobileRecordTotal = recordsResponse?.pagination.total;
  const vesselOptions = useMemo(
    () =>
      (vesselsResponse?.data ?? []).map((vessel) => ({
        value: vessel.id,
        label: `${vessel.name}${vessel.code ? ` (${vessel.code})` : ''}`,
      })),
    [vesselsResponse?.data],
  );

  useEffect(() => {
    setActiveModuleCode(initialModuleCode);
  }, [initialModuleCode]);

  useEffect(() => {
    setActiveRecordId(initialRecordId);
  }, [initialRecordId]);

  useEffect(() => {
    if (!routeAware) {
      return;
    }

    if (!initialModuleCode) {
      window.scrollTo({ top: 0, left: 0 });
      return;
    }

    window.requestAnimationFrame(() => {
      document.getElementById('workbench-record-list')?.scrollIntoView?.({
        block: 'start',
      });
    });
  }, [initialModuleCode, routeAware, visibleModuleCards.length]);

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
      return;
    }
    if (detailResponse.data.moduleCode === 'goa_training') {
      const progressRaw = detailResponse.data.payload.learningProgressPercent;
      const progressNumber =
        typeof progressRaw === 'number'
          ? progressRaw
          : Number(String(progressRaw ?? '').trim());
      setTrainingProgressPercent(
        Number.isFinite(progressNumber) ? String(progressNumber) : '0',
      );
      const statusRaw = String(
        detailResponse.data.payload.learningStatus ?? '',
      ).trim();
      if (
        statusRaw === 'in_progress' ||
        statusRaw === 'completed' ||
        statusRaw === 'not_started'
      ) {
        setTrainingProgressStatus(statusRaw);
      } else {
        setTrainingProgressStatus('not_started');
      }
    } else {
      setTrainingProgressPercent('0');
      setTrainingProgressStatus('not_started');
    }
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

  const openWecomApprovalPage = async (
    config: WorkbenchApprovalLaunchConfig,
  ) => {
    if (!wecomApprovalSdk.isReady) {
      messageApi.warning(
        wecomApprovalSdk.error ?? '企业微信审批能力初始化中，请稍后重试',
      );
      return false;
    }

    try {
      await new Promise<void>((resolve, reject) => {
        window.wx.invoke('thirdPartyOpenPage', config, (result) => {
          const message = String(result.err_msg ?? result.errMsg ?? '');
          if (!message || message.includes(':ok')) {
            resolve();
            return;
          }
          reject(new Error(message || '企业微信审批页打开失败'));
        });
      });
      return true;
    } catch (error) {
      messageApi.error(
        error instanceof Error ? error.message : '企业微信审批页打开失败',
      );
      return false;
    }
  };

  const submitCreateRecord = async () => {
    if (!activeModuleCode) return;

    const values = await form.validateFields();
    const payloadEntries = Object.entries(values.payload ?? {}).filter(
      ([, value]) =>
        value !== undefined && value !== null && String(value).trim() !== '',
    );
    const schemaFields =
      moduleSchemaResponse?.data.sections.flatMap((section) => section.fields) ??
      [];
    const payload = Object.fromEntries(
      payloadEntries.map(([key, value]) => {
        const field = schemaFields.find((item) => item.key === key);
        return [
          key,
          field?.inputType === 'datetime' || field?.inputType === 'date'
            ? toShanghaiIso(value as string)
            : value,
        ];
      }),
    );

    await createWorkbenchRecord({
      moduleCode: activeModuleCode,
      title: values.title,
      summary: values.summary,
      vesselId: values.vesselId,
      occurredAt: values.occurredAt
        ? (toShanghaiIso(values.occurredAt) as string)
        : undefined,
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
    actionType:
      | 'start'
      | 'complete_step'
      | 'update_payload'
      | 'submit_review'
      | 'request_rework'
      | 'close_record',
    payload?: Record<string, unknown>,
  ) => {
    const result = await performWorkbenchRecordAction({
      recordId,
      data: {
        actionType,
        payload,
      },
    }).unwrap();

    messageApi.success(
      `动作已执行：${labelFrom(actionTypeLabelMap, result.data.acceptedAction, '状态变更')}，当前状态：${labelFrom(recordStatusLabelMap, result.data.status, '未知状态')}`,
    );
    if (result.data.approvalLaunchConfig) {
      const opened = await openWecomApprovalPage(
        result.data.approvalLaunchConfig,
      );
      if (opened) {
        messageApi.success(
          `企业微信审批页已打开：${result.data.approvalLaunchConfig.thirdNo}`,
        );
      }
    }
  };

  const triggerLaunchApproval = async () => {
    if (!detailResponse?.data) return;
    if (!wecomApprovalSdk.isReady) {
      messageApi.warning(
        wecomApprovalSdk.error ?? '企业微信审批能力初始化中，请稍后重试',
      );
      return;
    }
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

    const opened = await openWecomApprovalPage(result.data.wecomLaunchConfig);
    if (opened) {
      messageApi.success(`企业微信审批页已打开：${result.data.thirdNo}`);
    }
  };

  const triggerPrint = async (paperSize: 'A4' | 'A3') => {
    if (!detailResponse?.data) return;
    const result = await triggerPrintSnapshot({
      recordId: detailResponse.data.id,
      paperSize,
    }).unwrap();
    messageApi.success(
      `打印快照已生成：${result.data.paperSize} / ${result.data.renderedFormat}`,
    );
  };

  const triggerTrainingProgressUpdate = async () => {
    if (
      !detailResponse?.data ||
      detailResponse.data.moduleCode !== 'goa_training'
    )
      return;
    const parsed = Number(trainingProgressPercent);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
      messageApi.warning('学习进度需为 0-100 的数字');
      return;
    }
    await triggerRecordAction(detailResponse.data.id, 'update_payload', {
      learningStatus: trainingProgressStatus,
      learningProgressPercent: parsed,
      ...(trainingProgressStatus === 'completed'
        ? { completedAt: new Date().toISOString() }
        : {}),
    });
  };

  if (showMobileWorkbenchHome) {
    const mobileStats = [
      {
        label: '当前待办',
        value: dashboard?.pendingTotal ?? '--',
        icon: <ProfileOutlined />,
      },
      {
        label: '待审批',
        value: dashboard?.approvalPendingTotal ?? '--',
        icon: <UserSwitchOutlined />,
      },
      {
        label: '活跃模块',
        value: mobileActiveModuleTotal ?? '--',
        icon: <AppstoreOutlined />,
      },
      {
        label: '记录总数',
        value: mobileRecordTotal ?? '--',
        icon: <FileTextOutlined />,
      },
    ];

    return (
      <>
        {contextHolder}
        <div className="workbench-mobile-home">
          {dashboardError || recordsError || approvalPendingError ? (
            <Alert
              type="error"
              showIcon
              message="部分工作台数据加载失败"
              description="请检查网络后刷新，未加载的指标不会按 0 处理。"
            />
          ) : null}
          <section className="workbench-mobile-hero" aria-labelledby="workbench-mobile-title">
            <div className="workbench-mobile-hero-copy">
              <Typography.Title level={1} id="workbench-mobile-title">
                工作台
              </Typography.Title>
              <Typography.Paragraph>
                部门记录、审批、打印与统计任务
              </Typography.Paragraph>
            </div>
            <div className="workbench-mobile-hero-actions">
              <button
                type="button"
                onClick={() => navigate('/workbench/statistics/attendance')}
              >
                <BarChartOutlined />
                考勤统计
              </button>
              <button type="button" onClick={() => navigate('/workbench/approvals')}>
                <TableOutlined />
                审批看板
              </button>
            </div>
          </section>

          <section className="workbench-mobile-stat-card" aria-label="工作台关键指标">
            {mobileStats.map((item) => (
              <div className="workbench-mobile-stat" key={item.label}>
                <span className="workbench-mobile-stat-icon" aria-hidden="true">
                  {item.icon}
                </span>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </section>

          <section className="workbench-mobile-priority-card" aria-labelledby="workbench-mobile-priority-title">
            <div className="workbench-mobile-card-heading">
              <Typography.Title level={2} id="workbench-mobile-priority-title">
                优先处理
              </Typography.Title>
              <button type="button" onClick={() => navigate('/workbench/approvals')}>
                查看全部 <RightOutlined />
              </button>
            </div>
            <div className="workbench-mobile-priority-list">
              {mobilePriorityRecords.map((record) => {
                const meta = getMobileStatusMeta(record);
                return (
                  <button
                    type="button"
                    className={`workbench-mobile-priority-row is-${meta.tone}`}
                    key={record.id}
                    onClick={() => openRecord(record.id)}
                  >
                    <span className="workbench-mobile-row-icon" aria-hidden="true">
                      {renderMobileRecordIcon(record)}
                    </span>
                    <strong>{record.title}</strong>
                    <em>{meta.label}</em>
                    <RightOutlined className="workbench-mobile-chevron" aria-hidden="true" />
                  </button>
                );
              })}
              {recordsResponse && mobilePriorityRecords.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前没有优先待办" />
              ) : null}
            </div>
          </section>

          <section className="workbench-mobile-module-card" aria-labelledby="workbench-mobile-module-title">
            <div className="workbench-mobile-card-heading">
              <Typography.Title level={2} id="workbench-mobile-module-title">
                模块入口
              </Typography.Title>
              {visibleModuleCards.length > 3 ? (
                <button
                  type="button"
                  onClick={() => setMobileModulesExpanded((expanded) => !expanded)}
                >
                  {mobileModulesExpanded ? '收起' : '查看全部'} <RightOutlined />
                </button>
              ) : null}
            </div>
            <div className="workbench-mobile-module-grid" data-testid="workbench-module-grid">
              {mobileModuleCards.map((item) => (
                <button
                  type="button"
                  id={`workbench-module-${item.moduleCode}`}
                  className="workbench-mobile-module-tile"
                  key={item.moduleCode}
                  onClick={() => openModule(item.moduleCode)}
                >
                  <span className="workbench-mobile-module-icon" aria-hidden="true">
                    {renderMobileModuleIcon(item.moduleCode)}
                  </span>
                  <strong>{item.moduleName}</strong>
                  <small>{labelFrom(departmentLabelMap, item.departmentCode, '未配置部门')}</small>
                  <span className="workbench-mobile-module-footer">
                    <span>
                      待办 <b>{item.pendingCount}</b>
                    </span>
                    <RightOutlined aria-hidden="true" />
                  </span>
                </button>
              ))}
              {dashboardResponse && mobileModuleCards.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前没有可访问模块" />
              ) : null}
            </div>
          </section>

          <section className="workbench-mobile-recent-card" aria-labelledby="workbench-mobile-recent-title">
            <div className="workbench-mobile-card-heading">
              <Typography.Title level={2} id="workbench-mobile-recent-title">
                最近记录
              </Typography.Title>
              {recentRecordRows.length > 3 ? (
                <button
                  type="button"
                  onClick={() => setMobileRecordsExpanded((expanded) => !expanded)}
                >
                  {mobileRecordsExpanded ? '收起' : '展开本页'} <RightOutlined />
                </button>
              ) : null}
            </div>
            <div className="workbench-mobile-recent-list">
              {mobileRecentRecords.map((record) => {
                const meta = getMobileStatusMeta(record);
                return (
                  <button
                    type="button"
                    className={`workbench-mobile-recent-row is-${meta.tone}`}
                    key={record.id}
                    onClick={() => openRecord(record.id)}
                  >
                    <span>
                      <ClockCircleOutlined />
                    <span className="workbench-record-time"><b>{recordDateParts(record.occurredAt, true).date}</b><small>{recordDateParts(record.occurredAt, true).time}</small></span>
                    </span>
                    <strong>{record.title}</strong>
                    <em>{meta.label}</em>
                    <small>{record.moduleName}</small>
                  </button>
                );
              })}
              {recordsResponse && mobileRecentRecords.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前没有工作记录" />
              ) : null}
            </div>
          </section>

          {dashboard?.alerts.length && alertNoticeVisible ? (
            <section className="workbench-mobile-alert" aria-label="工作台提醒">
              <InfoCircleFilled aria-hidden="true" />
              <span>{dashboard.alerts[0].message}</span>
              <button
                type="button"
                aria-label="关闭工作台提醒"
                onClick={() => setAlertNoticeVisible(false)}
              >
                <CloseOutlined />
              </button>
            </section>
          ) : null}
        </div>
      </>
    );
  }

  return (
    <>
      {contextHolder}
      {dashboardError || recordsError ? (
        <Alert
          type="error"
          showIcon
          message="部分工作台数据加载失败"
          description="请检查网络后刷新，未加载的指标不会按 0 处理。"
        />
      ) : null}
      <section className="page-hero sunan-page-hero workbench-command-hero">
        <div>
          <Typography.Title level={2}>{heroTitle}</Typography.Title>
          <Typography.Paragraph type="secondary">
            {heroDescription}
          </Typography.Paragraph>
        </div>
        {routeAware ? (
          <Space wrap className="sunan-hero-actions">
            {showHomeReturn ? (
              <Button onClick={goHome}>返回工作台首页</Button>
            ) : null}
            <Button
              onClick={() => navigate('/workbench/statistics/attendance')}
            >
              考勤统计
            </Button>
            <Button onClick={() => navigate('/workbench/approvals')}>
              审批看板
            </Button>
          </Space>
        ) : null}
      </section>

      <section className="workbench-stats-grid">
        <article className="workbench-stat-card">
          <Statistic
            title="当前待办"
            value={dashboard?.pendingTotal ?? '--'}
            loading={dashboardLoading}
          />
          <span>
            {dashboardError || recordsError
              ? '数据暂不可用'
              : pendingRecords.length > 0
                ? `最近 ${pendingRecords.length} 条进行中`
                : '暂无进行中记录'}
          </span>
        </article>
        <article className="workbench-stat-card">
          <Statistic
            title="待审批"
            value={dashboard?.approvalPendingTotal ?? '--'}
            loading={dashboardLoading}
          />
          <span>
            {dashboardError
              ? '数据暂不可用'
              : dashboard?.approvalPendingTotal
              ? `${dashboard.approvalPendingTotal} 条需审批`
              : '当前无待审批'}
          </span>
        </article>
        <article className="workbench-stat-card">
          <Statistic
            title="活跃模块"
            value={dashboardResponse ? visibleModuleCards.length : '--'}
            loading={dashboardLoading}
          />
          <span>
            {dashboardError
              ? '数据暂不可用'
              : visibleModuleCards.length > 0
                ? '实时模块入口'
                : '暂无模块可见'}
          </span>
        </article>
        <article className="workbench-stat-card">
          <Statistic
            title="本页记录"
            value={recordsResponse ? records.length : '--'}
            loading={recordsLoading}
          />
          <span>
            {recordsError
              ? '数据暂不可用'
              : records.length > 0
                ? '当前筛选结果'
                : '暂无记录'}
          </span>
        </article>
      </section>

      {dashboard?.alerts.length ? (
        <section className="sunan-alert-band workbench-alerts">
          {dashboard.alerts.map((alert) => (
            <Alert
              key={alert.code}
              type="info"
              showIcon
              message={alert.message}
            />
          ))}
        </section>
      ) : null}

      {!statisticsOnly ? (
        <section className="workbench-board-layout">
          <div className="workbench-board-main">
            <div className="sunan-panel-heading">
              <div className="workbench-panel-title-row">
                <Typography.Title level={2}>任务看板</Typography.Title>
                <Typography.Text type="secondary">{orderedModuleCards.length} 个模块</Typography.Text>
              </div>
              <Button
                type="text"
                size="small"
                className="workbench-board-toggle"
                aria-label={taskBoardExpanded ? '收起任务看板' : '展开任务看板'}
                icon={taskBoardExpanded ? <UpOutlined /> : <DownOutlined />}
                onClick={() => setTaskBoardExpanded((expanded) => !expanded)}
              />
              <Typography.Text>按流程阶段拖拽管理</Typography.Text>
            </div>
            <div
              className={`workbench-module-grid${taskBoardExpanded ? '' : ' is-collapsed'}`}
              data-testid="workbench-module-grid"
            >
              {visibleModuleCards.length === 0 ? (
                <Card className="placeholder-card" variant="borderless">
                  <Empty
                    description={
                      dashboardLoading
                        ? '工作平台模块加载中…'
                        : '暂无可访问模块'
                    }
                  />
                </Card>
              ) : (
                orderedModuleCards.map((item) => {
                  const selected = activeModuleCode === item.moduleCode;
                  return (
                    <article
                      id={`workbench-module-${item.moduleCode}`}
                      data-module-code={item.moduleCode}
                      key={item.moduleCode}
                      className={[
                        'workbench-module-card',
                        selected ? 'is-selected' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      <div>
                        <Typography.Title level={4}>
                          {item.moduleName}
                        </Typography.Title>
                        <Typography.Text type="secondary">
                          {labelFrom(
                            departmentLabelMap,
                            item.departmentCode,
                            '未配置部门',
                          )}{' '}
                          · 待办 {item.pendingCount}
                        </Typography.Text>
                      </div>
                      <Space wrap>
                        <Tag
                          color={
                            templateColorMap[item.templateType] ?? 'default'
                          }
                        >
                          {labelFrom(
                            templateLabelMap,
                            item.templateType,
                            '其他模块',
                          )}
                        </Tag>
                        {item.requiresApproval ? (
                          <Tag color="cyan">企业微信审批</Tag>
                        ) : null}
                      </Space>
                      <Button
                        type={selected ? 'primary' : 'default'}
                        onClick={() => openModule(item.moduleCode)}
                      >
                        {selected ? '已选中' : '查看记录'}
                      </Button>
                    </article>
                  );
                })
              )}
            </div>
          </div>

          <aside className="workbench-side-rail">
            <section
              className="workbench-schedule-panel"
              aria-labelledby="workbench-schedule-title"
            >
              <div className="sunan-panel-heading">
                <Typography.Title level={2} id="workbench-schedule-title">
                  最近记录
                </Typography.Title>
                <Typography.Text>{recentRecordRows.length} 项</Typography.Text>
              </div>
              <div className="workbench-schedule-list">
                {recentRecordRows.length > 0 ? (
                  recentRecordRows.map((item) => (
                    <article className="workbench-schedule-item" key={item.id}>
                      <time className="workbench-record-time"><b>{recordDateParts(item.occurredAt).date}</b><small>{recordDateParts(item.occurredAt).time}</small></time>
                      <div>
                        <strong>{item.title}</strong>
                        <small>{item.moduleName}</small>
                      </div>
                    </article>
                  ))
                ) : (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无最近记录" />
                )}
              </div>
            </section>

            <section
              className="workbench-priority-panel"
              aria-labelledby="workbench-priority-title"
            >
              <div className="sunan-panel-heading">
                <Typography.Title level={2} id="workbench-priority-title">
                  待优先处理
                </Typography.Title>
                <Typography.Text>{priorityRecords.length} 项</Typography.Text>
              </div>
              <div className="workbench-priority-list">
                {priorityRecords.length > 0 ? (
                  priorityRecords.map((item) => (
                    <article className="workbench-priority-item" key={item.id}>
                      <span>
                        <strong>{item.title}</strong>
                        <small>{labelFrom(recordStatusLabelMap, item.status, '未知状态')}</small>
                      </span>
                      <Tag color={item.status === 'approval_pending' ? 'red' : 'gold'}>
                        {item.status === 'approval_pending' ? '审批中' : '待处理'}
                      </Tag>
                    </article>
                  ))
                ) : (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无待优先处理项" />
                )}
              </div>
            </section>
          </aside>
        </section>
      ) : null}

      <section
        id="workbench-record-list"
        className="page-card-grid workbench-record-grid"
        style={{ scrollMarginTop: 88 }}
      >
        <Card className="placeholder-card" variant="borderless">
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Space
              style={{ width: '100%', justifyContent: 'space-between' }}
              wrap
            >
              <Typography.Title level={4}>
                {resolvedRecordListTitle}
              </Typography.Title>
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

            <ResponsiveTable<WorkbenchRecordSummary>
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
                  render: (value: string) => (
                    <Tag>
                      {labelFrom(recordStatusLabelMap, value, '未知状态')}
                    </Tag>
                  ),
                },
                {
                  title: '审批通道',
                  dataIndex: 'approvalChannel',
                  key: 'approvalChannel',
                  width: 160,
                  render: (value: string) =>
                    labelFrom(approvalChannelLabelMap, value, '审批通道'),
                },
                {
                  title: '时间',
                  dataIndex: 'occurredAt',
                  key: 'occurredAt',
                  width: 220,
                  render: (value: string) => formatShanghaiDateTime(value),
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
              {attendanceStatisticsError ? (
                <Alert
                  type="error"
                  showIcon
                  message="考勤统计加载失败"
                  description="请检查网络后刷新，未加载的统计不会按 0 处理。"
                />
              ) : null}
              <div className="sunan-query-grid">
                <Typography.Title level={4}>月度考勤统计</Typography.Title>
                <Input
                  value={statisticsMonth}
                  onChange={(event) => setStatisticsMonth(event.target.value)}
                  placeholder="YYYY-MM"
                />
              </div>
              <div
                className="workbench-attendance-stat-grid"
                data-testid="workbench-attendance-stat-grid"
              >
                <div
                  className="workbench-attendance-stat-card"
                  data-testid="workbench-attendance-stat-card"
                >
                  <Statistic
                    title="总签到数"
                    value={
                      attendanceStatisticsResponse?.data.summary.totalCheckIns ??
                      '--'
                    }
                    loading={attendanceStatisticsLoading}
                  />
                </div>
                <div
                  className="workbench-attendance-stat-card"
                  data-testid="workbench-attendance-stat-card"
                >
                  <Statistic
                    title="财务/船务签到"
                    value={
                      attendanceStatisticsResponse?.data.summary
                        .financeAndShippingCheckIns ?? '--'
                    }
                    loading={attendanceStatisticsLoading}
                  />
                </div>
                <div
                  className="workbench-attendance-stat-card"
                  data-testid="workbench-attendance-stat-card"
                >
                  <Statistic
                    title="业务/工作组签到"
                    value={
                      attendanceStatisticsResponse?.data.summary
                        .operationFlowCheckIns ?? '--'
                    }
                    loading={attendanceStatisticsLoading}
                  />
                </div>
                <div
                  className="workbench-attendance-stat-card"
                  data-testid="workbench-attendance-stat-card"
                >
                  <Statistic
                    title="上午签到"
                    value={
                      attendanceStatisticsResponse?.data.summary.morningCount ??
                      '--'
                    }
                    loading={attendanceStatisticsLoading}
                  />
                </div>
                <div
                  className="workbench-attendance-stat-card"
                  data-testid="workbench-attendance-stat-card"
                >
                  <Statistic
                    title="下午签到"
                    value={
                      attendanceStatisticsResponse?.data.summary
                        .afternoonCount ?? '--'
                    }
                    loading={attendanceStatisticsLoading}
                  />
                </div>
                <div
                  className="workbench-attendance-stat-card"
                  data-testid="workbench-attendance-stat-card"
                >
                  <Statistic
                    title="钦州范围内"
                    value={
                      attendanceStatisticsResponse?.data.summary.inRangeCount ??
                      '--'
                    }
                    loading={attendanceStatisticsLoading}
                  />
                </div>
                <div
                  className="workbench-attendance-stat-card"
                  data-testid="workbench-attendance-stat-card"
                >
                  <Statistic
                    title="钦州范围外"
                    value={
                      attendanceStatisticsResponse?.data.summary
                        .outRangeCount ?? '--'
                    }
                    loading={attendanceStatisticsLoading}
                  />
                </div>
                <div
                  className="workbench-attendance-stat-card"
                  data-testid="workbench-attendance-stat-card"
                >
                  <Statistic
                    title="出差/外派"
                    value={
                      attendanceStatisticsResponse?.data.summary
                        .businessTripCount ?? '--'
                    }
                    loading={attendanceStatisticsLoading}
                  />
                </div>
              </div>
              <ResponsiveTable
                rowKey="moduleCode"
                size="small"
                loading={attendanceStatisticsLoading}
                dataSource={
                  attendanceStatisticsResponse?.data.moduleTotals ?? []
                }
                pagination={false}
                columns={[
                  { title: '模块', dataIndex: 'moduleName', key: 'moduleName' },
                  {
                    title: '部门',
                    dataIndex: 'departmentCode',
                    key: 'departmentCode',
                    width: 140,
                    render: (value: string) =>
                      labelFrom(departmentLabelMap, value, '未配置部门'),
                  },
                  {
                    title: '记录数',
                    dataIndex: 'recordCount',
                    key: 'recordCount',
                    width: 120,
                  },
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
              <Typography.Title level={4}>
                {detailResponse.data.title}
              </Typography.Title>
              <Typography.Paragraph>
                {detailResponse.data.summary}
              </Typography.Paragraph>
              <Space wrap>
                <Tag>
                  {labelFrom(
                    recordStatusLabelMap,
                    detailResponse.data.status,
                    '未知状态',
                  )}
                </Tag>
                <Tag>
                  {labelFrom(
                    approvalChannelLabelMap,
                    detailResponse.data.approvalChannel,
                    '审批通道',
                  )}
                </Tag>
                {detailResponse.data.externalStatus ? (
                  <Tag color="cyan">
                    {labelFrom(
                      externalStatusLabelMap,
                      detailResponse.data.externalStatus,
                      '外部状态',
                    )}
                  </Tag>
                ) : null}
              </Space>
              {detailModule?.supportsPrint ? (
                <Space wrap style={{ marginTop: 12 }}>
                  <Button
                    loading={printingSnapshot}
                    onClick={() => void triggerPrint('A4')}
                  >
                    打印 A4
                  </Button>
                  <Button
                    loading={printingSnapshot}
                    onClick={() => void triggerPrint('A3')}
                  >
                    打印 A3
                  </Button>
                </Space>
              ) : null}
              {detailModule?.requiresApproval &&
              !detailResponse.data.externalProcessInstanceId ? (
                <Button
                  type="primary"
                  style={{ marginTop: 12 }}
                  loading={launchingApproval}
                  onClick={() => void triggerLaunchApproval()}
                >
                  发起企业微信审批
                </Button>
              ) : null}
              {detailResponse.data.externalProcessInstanceId ? (
                <Typography.Paragraph type="secondary" style={{ marginTop: 8 }}>
                  审批实例：{detailResponse.data.externalProcessInstanceId}
                </Typography.Paragraph>
              ) : null}
              {issueLinksResponse?.data.length ? (
                <Card size="small" title="关联问题" style={{ marginTop: 12 }}>
                  <List
                    size="small"
                    dataSource={issueLinksResponse.data}
                    renderItem={(issue) => (
                      <List.Item actions={[<Button key="issue" type="link" onClick={() => navigate(workbenchRouteConfig.issueDetail.buildPath(issue.id))}>查看 CAPA</Button>]}>
                        <List.Item.Meta title={issue.title} description={`${issue.issueType} · ${issue.severity}`} />
                        <Tag>{issue.status}</Tag>
                      </List.Item>
                    )}
                  />
                </Card>
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
                        状态：
                        {labelFrom(stepStatusLabelMap, step.status, '未知状态')}
                      </Typography.Text>
                    </Space>
                  </List.Item>
                )}
              />
              {detailResponse.data.steps.length > 0 ? (
                <Space wrap style={{ marginTop: 12 }}>
                  {detailResponse.data.status === 'assigned' && availableActions.has('start') ? (
                    <Button
                      type="primary"
                      loading={actionSubmitting}
                      onClick={() =>
                        void triggerRecordAction(
                          detailResponse.data.id,
                          'start',
                        )
                      }
                    >
                      开始作业
                    </Button>
                  ) : null}
                  {detailResponse.data.status === 'in_progress' && availableActions.has('complete_step') ? (
                    <>
                      <Button
                        loading={actionSubmitting}
                        onClick={() => {
                          const currentStep = getCurrentStep(
                            detailResponse.data,
                          );
                          if (!currentStep) {
                            messageApi.warning('当前没有可推进步骤');
                            return;
                          }
                          void triggerRecordAction(
                            detailResponse.data.id,
                            'complete_step',
                            {
                              stepCode: currentStep.stepCode,
                              rectificationRequired: false,
                            },
                          );
                        }}
                      >
                        完成当前步骤
                      </Button>
                      {detailModule?.templateType ===
                      'inspection_rectification' ? (
                        <Button
                          loading={actionSubmitting}
                          onClick={() => {
                            const currentStep = getCurrentStep(
                              detailResponse.data,
                            );
                            if (!currentStep) {
                              messageApi.warning('当前没有可推进步骤');
                              return;
                            }
                            void triggerRecordAction(
                              detailResponse.data.id,
                              'complete_step',
                              {
                                stepCode: currentStep.stepCode,
                                rectificationRequired: true,
                                rectificationStatus: 'submitted',
                              },
                            );
                          }}
                        >
                          标记整改并推进
                        </Button>
                      ) : null}
                    </>
                  ) : null}
                  {detailResponse.data.status === 'rework_required' && availableActions.has('complete_step') ? (
                    <Button
                      loading={actionSubmitting}
                      onClick={() => {
                        const currentStep = getCurrentStep(detailResponse.data);
                        if (!currentStep) {
                          messageApi.warning('当前没有可推进步骤');
                          return;
                        }
                        void triggerRecordAction(
                          detailResponse.data.id,
                          'complete_step',
                          {
                            stepCode: currentStep.stepCode,
                            rectificationRequired: true,
                            rectificationStatus: 'completed',
                          },
                        );
                      }}
                    >
                      整改完成并继续
                    </Button>
                  ) : null}
                  {detailResponse.data.status === 'pending_review' && availableActions.has('submit_review') ? (
                    <>
                      <Button
                        type="primary"
                        loading={actionSubmitting}
                        onClick={() =>
                          void triggerRecordAction(
                            detailResponse.data.id,
                            'submit_review',
                          )
                        }
                      >
                        提交审核
                      </Button>
                      {availableActions.has('request_rework') && detailModule?.templateType ===
                      'inspection_rectification' ? (
                        <Button
                          loading={actionSubmitting}
                          onClick={() =>
                            void triggerRecordAction(
                              detailResponse.data.id,
                              'request_rework',
                            )
                          }
                        >
                          退回整改
                        </Button>
                      ) : null}
                    </>
                  ) : null}
                  {availableActions.has('close_record') && detailResponse.data.status !== 'closed' &&
                  detailResponse.data.status !== 'archived' ? (
                    <Button
                      danger
                      loading={actionSubmitting}
                      onClick={() =>
                        void triggerRecordAction(
                          detailResponse.data.id,
                          'close_record',
                        )
                      }
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
                <Progress
                  percent={Math.max(
                    0,
                    Math.min(100, Number(trainingProgressPercent) || 0),
                  )}
                />
                <div className="sunan-query-grid" style={{ marginTop: 8 }}>
                  <Select
                    value={trainingProgressStatus}
                    onChange={(
                      value: 'not_started' | 'in_progress' | 'completed',
                    ) => setTrainingProgressStatus(value)}
                    options={[
                      { value: 'not_started', label: '未开始' },
                      { value: 'in_progress', label: '进行中' },
                      { value: 'completed', label: '已完成' },
                    ]}
                  />
                  <Input
                    value={trainingProgressPercent}
                    onChange={(event) =>
                      setTrainingProgressPercent(event.target.value)
                    }
                    placeholder="0-100"
                  />
                  <Button
                    loading={actionSubmitting}
                    onClick={() => void triggerTrainingProgressUpdate()}
                  >
                    更新学习进度
                  </Button>
                </div>
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
                      <Tag>{schemaFieldLabelMap.get(key) ?? '自定义字段'}</Tag>
                      <Typography.Text>{String(value)}</Typography.Text>
                    </Space>
                  </List.Item>
                )}
              />
            </div>

            <EvidencePanel recordId={detailResponse.data.id} summary={detailResponse.data.summary} attachments={detailResponse.data.attachments}
              onUpload={async (file) => { await uploadWorkbenchRecordAttachment({ recordId: detailResponse.data.id, data: { category: 'evidence', fileId: file.id } }).unwrap(); }}
              onSignature={async (signatureFileId, businessSummaryHash) => { await createSignatureEvidence({ recordId: detailResponse.data.id, signatureFileId, businessSummaryHash }).unwrap(); messageApi.success('签名证据已保存'); }}
              onLocation={async (body) => { await createLocationEvidence({ recordId: detailResponse.data.id, ...body }).unwrap(); messageApi.success(body.captureStatus === 'captured' ? '定位证据已保存' : '定位异常说明已保存'); }} />

            <div>
              <Typography.Title level={5}>操作日志</Typography.Title>
              <List
                bordered
                dataSource={detailResponse.data.actionLogs}
                locale={{ emptyText: '暂无日志' }}
                renderItem={(log) => (
                  <List.Item>
                    <Space direction="vertical" size={2}>
                      <Typography.Text strong>
                        {labelFrom(
                          actionTypeLabelMap,
                          log.actionType,
                          '状态变更',
                        )}
                      </Typography.Text>
                      <Typography.Text type="secondary">
                        {log.operatorUserId}：
                        {labelFrom(
                          recordStatusLabelMap,
                          log.fromStatus,
                          '未知状态',
                        )}{' '}
                        →{' '}
                        {labelFrom(
                          recordStatusLabelMap,
                          log.toStatus,
                          '未知状态',
                        )}
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
            ? `${
                activeModule.templateType === 'operation_flow'
                  ? '新建作业闭环记录'
                  : activeModule.templateType === 'inspection_rectification'
                    ? '新建检查整改记录'
                    : activeModule.templateType === 'attendance_statistics'
                      ? '新建考勤统计记录'
                      : activeModule.templateType === 'service_asset'
                        ? '新建资产服务记录'
                        : activeModule.templateType === 'wecom_approval'
                          ? '新建审批记录'
                          : '新建台账记录'
              } - ${activeModule.moduleName}`
            : '新建记录'
        }
        placement="right"
        width={560}
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        extra={
          <Button
            type="primary"
            onClick={() => void submitCreateRecord()}
            loading={creatingRecord}
          >
            提交
          </Button>
        }
      >
        {!activeModuleCode ? (
          <Empty description="请先选择模块" />
        ) : (
          <Form layout="vertical" form={form}>
            <Form.Item
              label="记录标题"
              name="title"
              rules={[{ required: true, message: '请输入记录标题' }]}
            >
              <Input placeholder="输入记录标题" />
            </Form.Item>
            <Form.Item
              label="摘要"
              name="summary"
              rules={[{ required: true, message: '请输入摘要' }]}
            >
              <Input.TextArea rows={3} placeholder="输入摘要说明" />
            </Form.Item>
            <Form.Item
              label="发生时间（可选）"
              name="occurredAt"
              getValueProps={(value?: string) => ({ value: value ? dayjs(value) : undefined })}
              getValueFromEvent={(value) => value?.format('YYYY-MM-DD HH:mm')}
            >
              <DatePicker showTime format={['YYYY-MM-DD HH:mm', 'YYYY-MM-DDTHH:mm']} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="船舶ID（可选）" name="vesselId">
              <Select
                allowClear
                showSearch
                loading={vesselsLoading}
                optionFilterProp="label"
                placeholder="选择船舶"
                options={vesselOptions}
                notFoundContent={
                  vesselsLoading ? '船舶加载中…' : '暂无可选择船舶'
                }
              />
            </Form.Item>

            {moduleSchemaResponse?.data.templateType === 'operation_flow' &&
            moduleSchemaResponse.data.stepTemplates?.length ? (
              <Card
                size="small"
                style={{ marginBottom: 12 }}
                loading={schemaLoading}
              >
                <Typography.Title level={5}>
                  流程步骤（自动初始化）
                </Typography.Title>
                <List
                  size="small"
                  bordered
                  dataSource={moduleSchemaResponse.data.stepTemplates}
                  renderItem={(step) => (
                    <List.Item>
                      <Space>
                        <Typography.Text>{step.stepName}</Typography.Text>
                      </Space>
                    </List.Item>
                  )}
                />
              </Card>
            ) : null}

            {moduleSchemaResponse?.data.templateType ===
              'inspection_rectification' &&
            moduleSchemaResponse.data.stepTemplates?.length ? (
              <Card
                size="small"
                style={{ marginBottom: 12 }}
                loading={schemaLoading}
              >
                <Typography.Title level={5}>
                  整改步骤（自动初始化）
                </Typography.Title>
                <List
                  size="small"
                  bordered
                  dataSource={moduleSchemaResponse.data.stepTemplates}
                  renderItem={(step) => (
                    <List.Item>
                      <Space>
                        <Typography.Text>{step.stepName}</Typography.Text>
                      </Space>
                    </List.Item>
                  )}
                />
              </Card>
            ) : null}

            {moduleSchemaResponse?.data.sections.map((section) => (
              <Card
                key={section.key}
                size="small"
                style={{ marginBottom: 12 }}
                loading={schemaLoading}
              >
                <Typography.Title level={5}>{section.title}</Typography.Title>
                {section.fields.map((field) => (
                  <Form.Item
                    key={field.key}
                    label={field.label}
                    name={['payload', field.key]}
                    getValueProps={(value?: string) => ({
                      value:
                        field.inputType === 'date' || field.inputType === 'datetime'
                          ? value
                            ? dayjs(value)
                            : undefined
                          : value,
                    })}
                    getValueFromEvent={
                      field.inputType === 'date' || field.inputType === 'datetime'
                        ? (value) => value?.format('YYYY-MM-DD HH:mm')
                        : undefined
                    }
                    rules={
                      field.required
                        ? [{ required: true, message: `请填写${field.label}` }]
                        : undefined
                    }
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
