import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CurrentUser } from 'src/common/interfaces/current-user.interface';
import { WorkbenchApprovalCallbackDto } from './dto/workbench-approval-callback.dto';
import { WorkbenchApprovalLaunchDto } from './dto/workbench-approval-launch.dto';
import { WorkbenchApprovalReconcileDto } from './dto/workbench-approval-reconcile.dto';
import { WorkbenchRecordActionDto } from './dto/workbench-record-action.dto';
import { WorkbenchRecordCreateDto } from './dto/workbench-record-create.dto';
import { WorkbenchRecordListQueryDto } from './dto/workbench-record-list-query.dto';
import { WorkbenchRecordUploadAttachmentDto } from './dto/workbench-record-upload-attachment.dto';

type TemplateType =
  | 'ledger_form'
  | 'operation_flow'
  | 'inspection_rectification'
  | 'attendance_statistics'
  | 'service_asset'
  | 'wecom_approval';

type ApprovalChannel = 'internal' | 'wecom_native';

type LaunchStatus = 'queued' | 'started';

type ApprovalMirrorStatus =
  | 'approval_pending'
  | 'approval_passed'
  | 'approval_rejected'
  | 'approval_canceled'
  | 'approval_terminated'
  | 'approval_sync_failed';

interface WorkbenchModuleSummary {
  moduleCode: string;
  moduleName: string;
  departmentCode: string;
  templateType: TemplateType;
  requiresApproval: boolean;
  supportsPrint: boolean;
  supportsStatistics: boolean;
  mobileFirst: boolean;
  sortOrder: number;
  visibleRoles: string[];
}

interface WorkbenchStep {
  stepCode: string;
  stepName: string;
  status: string;
  rectificationRequired: boolean;
  rectificationStatus: string | null;
}

interface WorkbenchAttachment {
  id: string;
  category: string;
  fileId: string;
  fileName: string;
  uploadedAt: string;
}

interface WorkbenchActionLog {
  id: string;
  actionType: string;
  operatorUserId: string;
  fromStatus: string;
  toStatus: string;
  comment: string | null;
  createdAt: string;
}

interface WorkbenchRecord {
  id: string;
  moduleCode: string;
  templateCode: string;
  title: string;
  summary: string;
  status: string;
  vesselId: string | null;
  occurredAt: string;
  approvalChannel: ApprovalChannel;
  externalProcessInstanceId: string | null;
  externalStatus: string | null;
  ownerUserId: string;
  visibleRoles: string[];
  payload: Record<string, unknown>;
  steps: WorkbenchStep[];
  attachments: WorkbenchAttachment[];
  actionLogs: WorkbenchActionLog[];
}

interface ApprovalInstance {
  processInstanceId: string;
  businessRecordId: string;
  moduleCode: string;
  externalStatus: 'pending' | 'approved' | 'rejected' | 'canceled' | 'terminated';
  mirrorStatus: ApprovalMirrorStatus;
  startedAt: string;
  lastCallbackAt: string | null;
  lastReconciledAt: string | null;
  callbackVersion: number;
}

interface ModuleSchemaField {
  key: string;
  label: string;
  required: boolean;
  inputType: 'text' | 'number' | 'date' | 'textarea';
  placeholder?: string;
}

interface ModuleSchemaDefinition {
  moduleCode: string;
  templateType: TemplateType;
  sections: Array<{
    key: string;
    title: string;
    fields: ModuleSchemaField[];
  }>;
}

const PENDING_STATUSES = new Set(['submitted', 'assigned', 'in_progress', 'pending_review', 'approval_pending', 'rework_required']);

const WORKBENCH_MODULES: WorkbenchModuleSummary[] = [
  {
    moduleCode: 'goa_training',
    moduleName: '总经办培训管理',
    departmentCode: 'general_office',
    templateType: 'ledger_form',
    requiresApproval: true,
    supportsPrint: true,
    supportsStatistics: true,
    mobileFirst: true,
    sortOrder: 10,
    visibleRoles: ['system_admin', 'general_office'],
  },
  {
    moduleCode: 'goa_meeting',
    moduleName: '总经办会议管理',
    departmentCode: 'general_office',
    templateType: 'ledger_form',
    requiresApproval: false,
    supportsPrint: true,
    supportsStatistics: false,
    mobileFirst: true,
    sortOrder: 20,
    visibleRoles: ['system_admin', 'general_office'],
  },
  {
    moduleCode: 'goa_safety_month',
    moduleName: '总经办安全月活动',
    departmentCode: 'general_office',
    templateType: 'ledger_form',
    requiresApproval: false,
    supportsPrint: true,
    supportsStatistics: false,
    mobileFirst: true,
    sortOrder: 30,
    visibleRoles: ['system_admin', 'general_office'],
  },
  {
    moduleCode: 'goa_year_plan',
    moduleName: '总经办年度工作计划',
    departmentCode: 'general_office',
    templateType: 'ledger_form',
    requiresApproval: false,
    supportsPrint: true,
    supportsStatistics: true,
    mobileFirst: false,
    sortOrder: 40,
    visibleRoles: ['system_admin', 'general_office'],
  },
  {
    moduleCode: 'shipping_training_hours',
    moduleName: '船务部培训学时统计',
    departmentCode: 'shipping',
    templateType: 'ledger_form',
    requiresApproval: false,
    supportsPrint: true,
    supportsStatistics: true,
    mobileFirst: true,
    sortOrder: 50,
    visibleRoles: ['system_admin', 'general_office', 'shipping'],
  },
  {
    moduleCode: 'shipping_drill',
    moduleName: '船务部演练记录',
    departmentCode: 'shipping',
    templateType: 'ledger_form',
    requiresApproval: false,
    supportsPrint: true,
    supportsStatistics: true,
    mobileFirst: true,
    sortOrder: 60,
    visibleRoles: ['system_admin', 'general_office', 'shipping', 'crew'],
  },
  {
    moduleCode: 'shipping_watch',
    moduleName: '船务部值守记录',
    departmentCode: 'shipping',
    templateType: 'ledger_form',
    requiresApproval: true,
    supportsPrint: true,
    supportsStatistics: true,
    mobileFirst: true,
    sortOrder: 70,
    visibleRoles: ['system_admin', 'general_office', 'shipping', 'crew'],
  },
  {
    moduleCode: 'shipping_shore_call',
    moduleName: '船务部岸基叫应',
    departmentCode: 'shipping',
    templateType: 'ledger_form',
    requiresApproval: false,
    supportsPrint: true,
    supportsStatistics: true,
    mobileFirst: true,
    sortOrder: 80,
    visibleRoles: ['system_admin', 'general_office', 'shipping', 'crew'],
  },
  {
    moduleCode: 'shipping_meeting',
    moduleName: '船务部会议记录',
    departmentCode: 'shipping',
    templateType: 'ledger_form',
    requiresApproval: false,
    supportsPrint: true,
    supportsStatistics: false,
    mobileFirst: true,
    sortOrder: 90,
    visibleRoles: ['system_admin', 'general_office', 'shipping'],
  },
  {
    moduleCode: 'shipping_case_study',
    moduleName: '船务部案例警示学习',
    departmentCode: 'shipping',
    templateType: 'ledger_form',
    requiresApproval: false,
    supportsPrint: false,
    supportsStatistics: true,
    mobileFirst: true,
    sortOrder: 100,
    visibleRoles: ['system_admin', 'general_office', 'shipping', 'crew'],
  },
  {
    moduleCode: 'business_ship_sign',
    moduleName: '业务部签船记录表',
    departmentCode: 'business',
    templateType: 'ledger_form',
    requiresApproval: false,
    supportsPrint: true,
    supportsStatistics: true,
    mobileFirst: true,
    sortOrder: 110,
    visibleRoles: ['system_admin', 'general_office', 'business'],
  },
  {
    moduleCode: 'business_vessel_dynamic',
    moduleName: '业务部船舶动态记录表',
    departmentCode: 'business',
    templateType: 'ledger_form',
    requiresApproval: false,
    supportsPrint: true,
    supportsStatistics: true,
    mobileFirst: true,
    sortOrder: 120,
    visibleRoles: ['system_admin', 'general_office', 'business'],
  },
  {
    moduleCode: 'finance_attendance',
    moduleName: '财务部统计中心',
    departmentCode: 'finance',
    templateType: 'attendance_statistics',
    requiresApproval: false,
    supportsPrint: true,
    supportsStatistics: true,
    mobileFirst: true,
    sortOrder: 130,
    visibleRoles: ['system_admin', 'general_office', 'finance'],
  },
  {
    moduleCode: 'business_operation_flow',
    moduleName: '业务部作业闭环',
    departmentCode: 'business',
    templateType: 'operation_flow',
    requiresApproval: false,
    supportsPrint: true,
    supportsStatistics: true,
    mobileFirst: true,
    sortOrder: 140,
    visibleRoles: ['system_admin', 'general_office', 'business'],
  },
  {
    moduleCode: 'shipping_self_inspection',
    moduleName: '船舶自查排查',
    departmentCode: 'shipping',
    templateType: 'inspection_rectification',
    requiresApproval: false,
    supportsPrint: true,
    supportsStatistics: true,
    mobileFirst: true,
    sortOrder: 150,
    visibleRoles: ['system_admin', 'general_office', 'shipping', 'crew'],
  },
  {
    moduleCode: 'shipping_attendance',
    moduleName: '船员考勤',
    departmentCode: 'shipping',
    templateType: 'attendance_statistics',
    requiresApproval: true,
    supportsPrint: true,
    supportsStatistics: true,
    mobileFirst: true,
    sortOrder: 160,
    visibleRoles: ['system_admin', 'general_office', 'shipping', 'crew'],
  },
  {
    moduleCode: 'shipping_voyage_approval',
    moduleName: '航次计划审批',
    departmentCode: 'shipping',
    templateType: 'wecom_approval',
    requiresApproval: true,
    supportsPrint: true,
    supportsStatistics: false,
    mobileFirst: true,
    sortOrder: 170,
    visibleRoles: ['system_admin', 'general_office', 'shipping', 'crew'],
  },
  {
    moduleCode: 'logistics_asset_service',
    moduleName: '后勤资产服务',
    departmentCode: 'logistics',
    templateType: 'service_asset',
    requiresApproval: true,
    supportsPrint: true,
    supportsStatistics: true,
    mobileFirst: true,
    sortOrder: 180,
    visibleRoles: ['system_admin', 'general_office', 'logistics'],
  },
  {
    moduleCode: 'zhongchuan_operation_flow',
    moduleName: '中船工作组作业闭环',
    departmentCode: 'workgroup',
    templateType: 'operation_flow',
    requiresApproval: false,
    supportsPrint: true,
    supportsStatistics: true,
    mobileFirst: true,
    sortOrder: 190,
    visibleRoles: ['system_admin', 'general_office', 'business', 'shipping'],
  },
  {
    moduleCode: 'pinglu_operation_flow',
    moduleName: '平陆运河工作组作业闭环',
    departmentCode: 'workgroup',
    templateType: 'operation_flow',
    requiresApproval: false,
    supportsPrint: true,
    supportsStatistics: true,
    mobileFirst: true,
    sortOrder: 200,
    visibleRoles: ['system_admin', 'general_office', 'business', 'shipping'],
  },
];

const LEDGER_MODULE_SCHEMAS: Record<string, ModuleSchemaDefinition> = {
  goa_training: {
    moduleCode: 'goa_training',
    templateType: 'ledger_form',
    sections: [
      {
        key: 'basic',
        title: '培训基本信息',
        fields: [
          { key: 'trainingType', label: '培训类型', required: true, inputType: 'text', placeholder: '岗前/日常/季度/年度' },
          { key: 'trainer', label: '主讲人', required: true, inputType: 'text' },
          { key: 'hours', label: '培训学时', required: true, inputType: 'number' },
          { key: 'participants', label: '参训人员', required: true, inputType: 'textarea' },
        ],
      },
    ],
  },
  goa_meeting: {
    moduleCode: 'goa_meeting',
    templateType: 'ledger_form',
    sections: [
      {
        key: 'meeting',
        title: '会议记录信息',
        fields: [
          { key: 'meetingType', label: '会议类型', required: true, inputType: 'text', placeholder: '视频/日常/季度/年度' },
          { key: 'host', label: '主持人', required: true, inputType: 'text' },
          { key: 'attendeeCount', label: '参会人数', required: true, inputType: 'number' },
          { key: 'meetingMinutes', label: '会议纪要', required: true, inputType: 'textarea' },
        ],
      },
    ],
  },
  goa_safety_month: {
    moduleCode: 'goa_safety_month',
    templateType: 'ledger_form',
    sections: [
      {
        key: 'campaign',
        title: '安全月活动台账',
        fields: [
          { key: 'campaignTopic', label: '活动主题', required: true, inputType: 'text' },
          { key: 'phase', label: '活动阶段', required: true, inputType: 'text', placeholder: '启动/培训/排查/演练/总结' },
          { key: 'owner', label: '责任人', required: true, inputType: 'text' },
          { key: 'resultSummary', label: '结果总结', required: true, inputType: 'textarea' },
        ],
      },
    ],
  },
  goa_year_plan: {
    moduleCode: 'goa_year_plan',
    templateType: 'ledger_form',
    sections: [
      {
        key: 'plan',
        title: '年度计划',
        fields: [
          { key: 'planYear', label: '计划年度', required: true, inputType: 'number' },
          { key: 'planOwner', label: '责任部门/人', required: true, inputType: 'text' },
          { key: 'milestone', label: '关键节点', required: true, inputType: 'textarea' },
          { key: 'progressStatus', label: '当前进度', required: true, inputType: 'text' },
        ],
      },
    ],
  },
  shipping_training_hours: {
    moduleCode: 'shipping_training_hours',
    templateType: 'ledger_form',
    sections: [
      {
        key: 'shippingTraining',
        title: '船务培训学时',
        fields: [
          { key: 'vesselName', label: '船舶', required: true, inputType: 'text' },
          { key: 'crewNames', label: '船员名单', required: true, inputType: 'textarea' },
          { key: 'trainingTheme', label: '培训主题', required: true, inputType: 'text' },
          { key: 'totalHours', label: '总学时', required: true, inputType: 'number' },
        ],
      },
    ],
  },
  shipping_drill: {
    moduleCode: 'shipping_drill',
    templateType: 'ledger_form',
    sections: [
      {
        key: 'drill',
        title: '演练记录',
        fields: [
          { key: 'drillType', label: '演练类型', required: true, inputType: 'text' },
          { key: 'vesselName', label: '船舶', required: true, inputType: 'text' },
          { key: 'drillLeader', label: '演练负责人', required: true, inputType: 'text' },
          { key: 'drillResult', label: '演练结果', required: true, inputType: 'textarea' },
        ],
      },
    ],
  },
  shipping_watch: {
    moduleCode: 'shipping_watch',
    templateType: 'ledger_form',
    sections: [
      {
        key: 'watch',
        title: '值守记录',
        fields: [
          { key: 'vesselName', label: '船舶', required: true, inputType: 'text' },
          { key: 'watchShift', label: '值守班次', required: true, inputType: 'text' },
          { key: 'watcher', label: '值守人员', required: true, inputType: 'text' },
          { key: 'watchNotes', label: '值守备注', required: true, inputType: 'textarea' },
        ],
      },
    ],
  },
  shipping_shore_call: {
    moduleCode: 'shipping_shore_call',
    templateType: 'ledger_form',
    sections: [
      {
        key: 'shoreCall',
        title: '岸基叫应记录',
        fields: [
          { key: 'vesselName', label: '船舶', required: true, inputType: 'text' },
          { key: 'publisher', label: '发布人', required: true, inputType: 'text' },
          { key: 'receiver', label: '记录人', required: true, inputType: 'text' },
          { key: 'messageDigest', label: '叫应内容', required: true, inputType: 'textarea' },
        ],
      },
    ],
  },
  shipping_meeting: {
    moduleCode: 'shipping_meeting',
    templateType: 'ledger_form',
    sections: [
      {
        key: 'shipMeeting',
        title: '船员会议记录',
        fields: [
          { key: 'meetingTopic', label: '会议主题', required: true, inputType: 'text' },
          { key: 'vesselName', label: '船舶', required: true, inputType: 'text' },
          { key: 'host', label: '主持人', required: true, inputType: 'text' },
          { key: 'minutes', label: '会议纪要', required: true, inputType: 'textarea' },
        ],
      },
    ],
  },
  shipping_case_study: {
    moduleCode: 'shipping_case_study',
    templateType: 'ledger_form',
    sections: [
      {
        key: 'caseStudy',
        title: '案例学习记录',
        fields: [
          { key: 'caseTitle', label: '案例标题', required: true, inputType: 'text' },
          { key: 'learningAudience', label: '学习对象', required: true, inputType: 'text' },
          { key: 'studyType', label: '资料类型', required: true, inputType: 'text', placeholder: '视频/文档' },
          { key: 'learningSummary', label: '学习情况', required: true, inputType: 'textarea' },
        ],
      },
    ],
  },
  business_ship_sign: {
    moduleCode: 'business_ship_sign',
    templateType: 'ledger_form',
    sections: [
      {
        key: 'shipSign',
        title: '签船记录字段',
        fields: [
          { key: 'customerName', label: '客户姓名', required: true, inputType: 'text' },
          { key: 'vesselName', label: '船名', required: true, inputType: 'text' },
          { key: 'imoOrCallSign', label: 'IMO/呼号', required: true, inputType: 'text' },
          { key: 'agreementNo', label: '协议编号', required: true, inputType: 'text' },
          { key: 'fee', label: '费用', required: true, inputType: 'number' },
          { key: 'serviceOwner', label: '业务经手人', required: true, inputType: 'text' },
        ],
      },
    ],
  },
  business_vessel_dynamic: {
    moduleCode: 'business_vessel_dynamic',
    templateType: 'ledger_form',
    sections: [
      {
        key: 'vesselDynamic',
        title: '船舶动态字段',
        fields: [
          { key: 'vesselName', label: '船名', required: true, inputType: 'text' },
          { key: 'voyageNo', label: '航次', required: true, inputType: 'text' },
          { key: 'route', label: '航线', required: true, inputType: 'text' },
          { key: 'arrivalTime', label: '抵港时间', required: true, inputType: 'date' },
          { key: 'berthTime', label: '靠泊时间', required: true, inputType: 'date' },
          { key: 'departureTime', label: '离港时间', required: true, inputType: 'date' },
        ],
      },
    ],
  },
};

@Injectable()
export class WorkbenchService {
  private readonly records = new Map<string, WorkbenchRecord>();
  private readonly approvalInstances = new Map<string, ApprovalInstance>();

  constructor() {
    this.seedRecords();
  }

  listModules(user: CurrentUser) {
    const visibleModules = this.listVisibleModules(user);
    const pendingMap = this.computePendingCounts(user);

    return visibleModules.map((moduleItem) => ({
      moduleCode: moduleItem.moduleCode,
      moduleName: moduleItem.moduleName,
      departmentCode: moduleItem.departmentCode,
      templateType: moduleItem.templateType,
      pendingCount: pendingMap.get(moduleItem.moduleCode) ?? 0,
      requiresApproval: moduleItem.requiresApproval,
      supportsPrint: moduleItem.supportsPrint,
      supportsStatistics: moduleItem.supportsStatistics,
      mobileFirst: moduleItem.mobileFirst,
    }));
  }

  getModuleSchema(moduleCode: string, user: CurrentUser) {
    const moduleItem = this.mustGetModule(moduleCode);
    if (!this.hasRoleAccess(user, moduleItem.visibleRoles)) {
      throw new ForbiddenException('forbidden');
    }

    const schema = LEDGER_MODULE_SCHEMAS[moduleCode];
    if (!schema) {
      throw new NotFoundException('module schema not found');
    }

    return schema;
  }

  getDashboard(user: CurrentUser) {
    const modules = this.listModules(user);
    const visibleRecords = this.listVisibleRecords(user);
    const pendingTotal = visibleRecords.filter((record) => PENDING_STATUSES.has(record.status)).length;
    const approvalPendingTotal = visibleRecords.filter((record) => record.status === 'approval_pending').length;

    const alerts: Array<{ code: string; message: string }> = [];
    if (approvalPendingTotal > 0) {
      alerts.push({ code: 'approval_pending', message: `当前有 ${approvalPendingTotal} 条审批待处理。` });
    }
    if (pendingTotal > 0) {
      alerts.push({ code: 'task_pending', message: `当前有 ${pendingTotal} 条工作平台待办。` });
    }

    return {
      modules,
      pendingTotal,
      approvalPendingTotal,
      alerts,
    };
  }

  listRecords(query: WorkbenchRecordListQueryDto, user: CurrentUser) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    let records = this.listVisibleRecords(user);

    if (query.moduleCode) {
      records = records.filter((record) => record.moduleCode === query.moduleCode);
    }

    if (query.status) {
      records = records.filter((record) => record.status === query.status);
    }

    if (query.vesselId) {
      records = records.filter((record) => record.vesselId === query.vesselId);
    }

    if (query.templateType) {
      const allowedModuleCodes = new Set(
        WORKBENCH_MODULES.filter((moduleItem) => moduleItem.templateType === query.templateType).map((moduleItem) => moduleItem.moduleCode),
      );
      records = records.filter((record) => allowedModuleCodes.has(record.moduleCode));
    }

    if (query.keyword?.trim()) {
      const keyword = query.keyword.trim().toLowerCase();
      records = records.filter((record) => `${record.title} ${record.summary}`.toLowerCase().includes(keyword));
    }

    const total = records.length;
    const offset = (page - 1) * pageSize;
    const paged = records.slice(offset, offset + pageSize).map((record) => this.toRecordSummary(record));

    return {
      data: paged,
      pagination: {
        page,
        pageSize,
        total,
      },
    };
  }

  createRecord(dto: WorkbenchRecordCreateDto, user: CurrentUser) {
    const moduleItem = this.mustGetModule(dto.moduleCode);
    if (!this.hasRoleAccess(user, moduleItem.visibleRoles)) {
      throw new ForbiddenException('forbidden');
    }

    if (moduleItem.templateType !== 'ledger_form') {
      throw new BadRequestException('Wave 3 only supports ledger_form creation');
    }

    if (!LEDGER_MODULE_SCHEMAS[dto.moduleCode]) {
      throw new BadRequestException('ledger module schema not found');
    }

    const nowIso = new Date().toISOString();
    const record: WorkbenchRecord = {
      id: randomUUID(),
      moduleCode: dto.moduleCode,
      templateCode: `${dto.moduleCode}_v1`,
      title: dto.title.trim(),
      summary: dto.summary.trim(),
      status: 'draft',
      vesselId: dto.vesselId?.trim() || null,
      occurredAt: dto.occurredAt ?? nowIso,
      approvalChannel: 'internal',
      externalProcessInstanceId: null,
      externalStatus: null,
      ownerUserId: user.userId,
      visibleRoles: [...moduleItem.visibleRoles],
      payload: dto.payload ?? {},
      steps: [],
      attachments: [],
      actionLogs: [],
    };

    this.appendActionLog(record, {
      actionType: 'create_record',
      operatorUserId: user.userId,
      fromStatus: 'draft',
      toStatus: 'draft',
      comment: 'Wave 3 台账录单',
    });

    this.records.set(record.id, record);

    return {
      ...this.toRecordSummary(record),
      summary: record.summary,
      externalProcessInstanceId: record.externalProcessInstanceId,
      externalStatus: record.externalStatus,
      steps: record.steps,
      attachments: record.attachments,
      actionLogs: record.actionLogs,
      payload: record.payload,
    };
  }

  getRecordDetail(recordId: string, user: CurrentUser) {
    const record = this.mustGetRecord(recordId);
    this.assertRecordVisible(record, user);

    return {
      ...this.toRecordSummary(record),
      summary: record.summary,
      externalProcessInstanceId: record.externalProcessInstanceId,
      externalStatus: record.externalStatus,
      steps: record.steps,
      attachments: record.attachments,
      actionLogs: record.actionLogs,
      payload: record.payload,
    };
  }

  performRecordAction(recordId: string, dto: WorkbenchRecordActionDto, user: CurrentUser) {
    const record = this.mustGetRecord(recordId);
    this.assertRecordVisible(record, user);

    const fromStatus = record.status;
    const toStatus = this.resolveNextStatus(fromStatus, dto.actionType);
    record.status = toStatus;

    this.appendActionLog(record, {
      actionType: dto.actionType,
      operatorUserId: user.userId,
      fromStatus,
      toStatus,
      comment: dto.comment ?? null,
    });

    return {
      recordId: record.id,
      status: record.status,
      acceptedAction: dto.actionType,
    };
  }

  uploadAttachment(recordId: string, dto: WorkbenchRecordUploadAttachmentDto, user: CurrentUser) {
    const record = this.mustGetRecord(recordId);
    this.assertRecordVisible(record, user);

    const uploadedAt = new Date().toISOString();
    const attachment: WorkbenchAttachment = {
      id: randomUUID(),
      category: dto.category,
      fileId: dto.fileId,
      fileName: `附件-${dto.fileId}`,
      uploadedAt,
    };

    record.attachments = [...record.attachments, attachment];
    this.appendActionLog(record, {
      actionType: 'upload_attachment',
      operatorUserId: user.userId,
      fromStatus: record.status,
      toStatus: record.status,
      comment: dto.remark ?? null,
    });

    return attachment;
  }

  getPrintSnapshot(recordId: string, user: CurrentUser) {
    const record = this.mustGetRecord(recordId);
    this.assertRecordVisible(record, user);

    return {
      businessRecordId: record.id,
      templateVersion: 'v1',
      renderedFileId: `print-${record.id}`,
      renderedAt: new Date().toISOString(),
      snapshotData: {
        title: record.title,
        status: record.status,
        moduleCode: record.moduleCode,
        summary: record.summary,
        payload: record.payload,
      },
    };
  }

  launchApproval(dto: WorkbenchApprovalLaunchDto, user: CurrentUser) {
    const record = this.mustGetRecord(dto.businessRecordId);
    this.assertRecordVisible(record, user);
    const moduleItem = this.mustGetModule(record.moduleCode);

    if (!moduleItem.requiresApproval) {
      throw new BadRequestException('module does not require approval');
    }

    if (record.externalProcessInstanceId) {
      throw new BadRequestException('approval process already exists for this record');
    }

    const processInstanceId = `wbpi_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const now = new Date().toISOString();

    const instance: ApprovalInstance = {
      processInstanceId,
      businessRecordId: record.id,
      moduleCode: record.moduleCode,
      externalStatus: 'pending',
      mirrorStatus: 'approval_pending',
      startedAt: now,
      lastCallbackAt: null,
      lastReconciledAt: null,
      callbackVersion: 0,
    };

    this.approvalInstances.set(processInstanceId, instance);
    record.approvalChannel = 'wecom_native';
    record.externalProcessInstanceId = processInstanceId;
    record.externalStatus = 'pending';
    record.status = 'approval_pending';

    this.appendActionLog(record, {
      actionType: 'launch_approval',
      operatorUserId: user.userId,
      fromStatus: 'submitted',
      toStatus: 'approval_pending',
      comment: dto.summary ?? null,
    });

    const launchStatus: LaunchStatus = 'started';

    return {
      processInstanceId,
      approvalChannel: 'wecom_native' as const,
      launchStatus,
      mirrorStatus: instance.mirrorStatus,
    };
  }

  handleApprovalCallback(dto: WorkbenchApprovalCallbackDto) {
    const instance = this.approvalInstances.get(dto.processInstanceId);
    if (!instance) {
      throw new NotFoundException('approval instance not found');
    }

    if (dto.callbackVersion <= instance.callbackVersion) {
      return {
        accepted: true,
        ignored: true,
        processInstanceId: dto.processInstanceId,
      };
    }

    const mirrorStatus = this.toMirrorStatus(dto.status);
    const now = new Date().toISOString();

    instance.externalStatus = dto.status;
    instance.mirrorStatus = mirrorStatus;
    instance.lastCallbackAt = now;
    instance.callbackVersion = dto.callbackVersion;

    const record = this.mustGetRecord(instance.businessRecordId);
    const fromStatus = record.status;
    record.externalStatus = dto.status;
    record.status = mirrorStatus;

    this.appendActionLog(record, {
      actionType: 'approval_callback',
      operatorUserId: 'wecom_callback',
      fromStatus,
      toStatus: mirrorStatus,
      comment: `eventId=${dto.eventId}`,
    });

    return {
      accepted: true,
      ignored: false,
      processInstanceId: dto.processInstanceId,
      mirrorStatus,
    };
  }

  getApprovalInstance(processInstanceId: string, user: CurrentUser) {
    const instance = this.approvalInstances.get(processInstanceId);
    if (!instance) {
      throw new NotFoundException('approval instance not found');
    }

    const record = this.mustGetRecord(instance.businessRecordId);
    this.assertRecordVisible(record, user);

    return {
      processInstanceId: instance.processInstanceId,
      businessRecordId: instance.businessRecordId,
      moduleCode: instance.moduleCode,
      externalStatus: instance.externalStatus,
      mirrorStatus: instance.mirrorStatus,
      startedAt: instance.startedAt,
      lastCallbackAt: instance.lastCallbackAt,
      lastReconciledAt: instance.lastReconciledAt,
    };
  }

  reconcileApprovals(dto: WorkbenchApprovalReconcileDto, user: CurrentUser) {
    const reconciled: string[] = [];

    for (const processInstanceId of dto.processInstanceIds) {
      const instance = this.approvalInstances.get(processInstanceId);
      if (!instance) {
        continue;
      }

      const record = this.mustGetRecord(instance.businessRecordId);
      this.assertRecordVisible(record, user);

      instance.lastReconciledAt = new Date().toISOString();
      reconciled.push(processInstanceId);
    }

    return {
      accepted: reconciled.length,
      processInstanceIds: reconciled,
    };
  }

  private listVisibleModules(user: CurrentUser) {
    return WORKBENCH_MODULES.filter((moduleItem) => this.hasRoleAccess(user, moduleItem.visibleRoles)).sort((a, b) => a.sortOrder - b.sortOrder);
  }

  private listVisibleRecords(user: CurrentUser) {
    return [...this.records.values()]
      .filter((record) => this.hasRoleAccess(user, record.visibleRoles))
      .sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1));
  }

  private computePendingCounts(user: CurrentUser) {
    const result = new Map<string, number>();
    const visibleRecords = this.listVisibleRecords(user);

    for (const record of visibleRecords) {
      if (!PENDING_STATUSES.has(record.status)) {
        continue;
      }
      const current = result.get(record.moduleCode) ?? 0;
      result.set(record.moduleCode, current + 1);
    }

    return result;
  }

  private hasRoleAccess(user: CurrentUser, visibleRoles: string[]) {
    if (user.roles.includes('system_admin')) {
      return true;
    }

    return user.roles.some((role) => visibleRoles.includes(role));
  }

  private mustGetRecord(recordId: string) {
    const record = this.records.get(recordId);
    if (!record) {
      throw new NotFoundException('workbench record not found');
    }
    return record;
  }

  private mustGetModule(moduleCode: string) {
    const moduleItem = WORKBENCH_MODULES.find((item) => item.moduleCode === moduleCode);
    if (!moduleItem) {
      throw new NotFoundException('workbench module not found');
    }
    return moduleItem;
  }

  private assertRecordVisible(record: WorkbenchRecord, user: CurrentUser) {
    if (!this.hasRoleAccess(user, record.visibleRoles)) {
      throw new ForbiddenException('forbidden');
    }
  }

  private toRecordSummary(record: WorkbenchRecord) {
    return {
      id: record.id,
      moduleCode: record.moduleCode,
      title: record.title,
      status: record.status,
      vesselId: record.vesselId,
      occurredAt: record.occurredAt,
      approvalChannel: record.approvalChannel,
    };
  }

  private resolveNextStatus(currentStatus: string, actionType: WorkbenchRecordActionDto['actionType']) {
    switch (actionType) {
      case 'submit':
        return currentStatus === 'draft' ? 'submitted' : currentStatus;
      case 'assign':
        return 'assigned';
      case 'start':
        return 'in_progress';
      case 'complete_step':
        return 'in_progress';
      case 'submit_review':
        return 'pending_review';
      case 'request_rework':
        return 'rework_required';
      case 'close_record':
        return 'closed';
      case 'archive':
        return 'archived';
      default:
        return currentStatus;
    }
  }

  private toMirrorStatus(status: WorkbenchApprovalCallbackDto['status']): ApprovalMirrorStatus {
    switch (status) {
      case 'pending':
        return 'approval_pending';
      case 'approved':
        return 'approval_passed';
      case 'rejected':
        return 'approval_rejected';
      case 'canceled':
        return 'approval_canceled';
      case 'terminated':
        return 'approval_terminated';
      default:
        return 'approval_sync_failed';
    }
  }

  private appendActionLog(
    record: WorkbenchRecord,
    log: {
      actionType: string;
      operatorUserId: string;
      fromStatus: string;
      toStatus: string;
      comment: string | null;
    },
  ) {
    const actionLog: WorkbenchActionLog = {
      id: randomUUID(),
      actionType: log.actionType,
      operatorUserId: log.operatorUserId,
      fromStatus: log.fromStatus,
      toStatus: log.toStatus,
      comment: log.comment,
      createdAt: new Date().toISOString(),
    };

    record.actionLogs = [actionLog, ...record.actionLogs];
  }

  private seedRecords() {
    const seedRows: WorkbenchRecord[] = [
      {
        id: 'wb-record-ledger-001',
        moduleCode: 'goa_training',
        templateCode: 'goa_training_v1',
        title: '岗前培训记录（新入职船员）',
        summary: '完成岗前安全培训并记录学习进度。',
        status: 'submitted',
        vesselId: null,
        occurredAt: '2026-04-21T02:00:00.000Z',
        approvalChannel: 'internal',
        externalProcessInstanceId: null,
        externalStatus: null,
        ownerUserId: 'goa_admin_1',
        visibleRoles: ['system_admin', 'general_office'],
        payload: {
          trainingType: '岗前培训',
          trainer: '王教官',
          hours: 4,
          participants: '苏南012、苏南022新入职船员',
        },
        steps: [],
        attachments: [],
        actionLogs: [],
      },
      {
        id: 'wb-record-ledger-002',
        moduleCode: 'goa_meeting',
        templateCode: 'goa_meeting_v1',
        title: '季度安全会议记录（2026Q2）',
        summary: '季度安全与制度执行复盘会议。',
        status: 'draft',
        vesselId: null,
        occurredAt: '2026-04-21T02:30:00.000Z',
        approvalChannel: 'internal',
        externalProcessInstanceId: null,
        externalStatus: null,
        ownerUserId: 'goa_admin_2',
        visibleRoles: ['system_admin', 'general_office'],
        payload: {
          meetingType: '季度会议',
          host: '李主任',
          attendeeCount: 24,
          meetingMinutes: '部署二季度安全月活动与隐患排查节奏。',
        },
        steps: [],
        attachments: [],
        actionLogs: [],
      },
      {
        id: 'wb-record-ledger-003',
        moduleCode: 'shipping_training_hours',
        templateCode: 'shipping_training_hours_v1',
        title: '苏南012船员培训学时台账',
        summary: '四月船员培训学时汇总记录。',
        status: 'submitted',
        vesselId: 'sunan-012',
        occurredAt: '2026-04-21T03:00:00.000Z',
        approvalChannel: 'internal',
        externalProcessInstanceId: null,
        externalStatus: null,
        ownerUserId: 'shipping_manager_1',
        visibleRoles: ['system_admin', 'general_office', 'shipping'],
        payload: {
          vesselName: '苏南012',
          crewNames: '张三、李四、王五',
          trainingTheme: '消防设备操作',
          totalHours: 6,
        },
        steps: [],
        attachments: [],
        actionLogs: [],
      },
      {
        id: 'wb-record-ledger-004',
        moduleCode: 'business_ship_sign',
        templateCode: 'business_ship_sign_v1',
        title: '签船记录-远洋货轮A',
        summary: '客户现场签船与费用确认记录。',
        status: 'submitted',
        vesselId: null,
        occurredAt: '2026-04-21T03:20:00.000Z',
        approvalChannel: 'internal',
        externalProcessInstanceId: null,
        externalStatus: null,
        ownerUserId: 'business_user_1',
        visibleRoles: ['system_admin', 'general_office', 'business'],
        payload: {
          customerName: '陈先生',
          vesselName: '远洋货轮A',
          imoOrCallSign: 'IMO9988776',
          agreementNo: 'XY-2026-0401',
          fee: 12000,
          serviceOwner: '赵主管',
        },
        steps: [],
        attachments: [],
        actionLogs: [],
      },
      {
        id: 'wb-record-ledger-005',
        moduleCode: 'business_vessel_dynamic',
        templateCode: 'business_vessel_dynamic_v1',
        title: '船舶动态-苏南022航次记录',
        summary: '记录抵港、靠泊和离港时间。',
        status: 'draft',
        vesselId: 'sunan-022',
        occurredAt: '2026-04-21T03:40:00.000Z',
        approvalChannel: 'internal',
        externalProcessInstanceId: null,
        externalStatus: null,
        ownerUserId: 'business_user_2',
        visibleRoles: ['system_admin', 'general_office', 'business'],
        payload: {
          vesselName: '苏南022',
          voyageNo: '2026-QZ-21',
          route: '北海-钦州',
          arrivalTime: '2026-04-21T06:00:00.000Z',
          berthTime: '2026-04-21T07:00:00.000Z',
          departureTime: '2026-04-22T02:00:00.000Z',
        },
        steps: [],
        attachments: [],
        actionLogs: [],
      },
      {
        id: 'wb-record-legacy-001',
        moduleCode: 'shipping_self_inspection',
        templateCode: 'inspection_self_v1',
        title: '苏南012船舶月度自查（4月）',
        summary: '由上至下提单，检查机舱消防设施与密闭空间通风记录。',
        status: 'pending_review',
        vesselId: 'sunan-012',
        occurredAt: '2026-04-20T08:20:00.000Z',
        approvalChannel: 'internal',
        externalProcessInstanceId: null,
        externalStatus: null,
        ownerUserId: 'captain_012',
        visibleRoles: ['system_admin', 'general_office', 'shipping', 'crew'],
        payload: {
          department: 'shipping',
          riskLevel: 'high',
        },
        steps: [
          {
            stepCode: 'inspection',
            stepName: '现场检查',
            status: 'completed',
            rectificationRequired: true,
            rectificationStatus: 'submitted',
          },
          {
            stepCode: 'review',
            stepName: '审核关闭',
            status: 'pending',
            rectificationRequired: false,
            rectificationStatus: null,
          },
        ],
        attachments: [
          {
            id: randomUUID(),
            category: 'before_rectification',
            fileId: 'seed-file-before-001',
            fileName: '整改前-机舱消防泵.jpg',
            uploadedAt: '2026-04-20T08:30:00.000Z',
          },
        ],
        actionLogs: [
          {
            id: randomUUID(),
            actionType: 'submit_review',
            operatorUserId: 'captain_012',
            fromStatus: 'in_progress',
            toStatus: 'pending_review',
            comment: '已上传整改照片，待审核。',
            createdAt: '2026-04-20T09:00:00.000Z',
          },
        ],
      },
      {
        id: 'wb-record-legacy-002',
        moduleCode: 'shipping_voyage_approval',
        templateCode: 'voyage_plan_v1',
        title: '苏南022航次计划审批（北海-钦州）',
        summary: '船员下至上提单，待企业微信审批流处理。',
        status: 'approval_pending',
        vesselId: 'sunan-022',
        occurredAt: '2026-04-21T01:20:00.000Z',
        approvalChannel: 'wecom_native',
        externalProcessInstanceId: 'wbpi_seed_001',
        externalStatus: 'pending',
        ownerUserId: 'crew_022',
        visibleRoles: ['system_admin', 'general_office', 'shipping', 'crew'],
        payload: {
          originPort: '北海',
          destinationPort: '钦州',
        },
        steps: [
          {
            stepCode: 'submit',
            stepName: '提单',
            status: 'completed',
            rectificationRequired: false,
            rectificationStatus: null,
          },
        ],
        attachments: [],
        actionLogs: [
          {
            id: randomUUID(),
            actionType: 'launch_approval',
            operatorUserId: 'crew_022',
            fromStatus: 'submitted',
            toStatus: 'approval_pending',
            comment: '发起企业微信审批。',
            createdAt: '2026-04-21T01:23:00.000Z',
          },
        ],
      },
    ];

    for (const row of seedRows) {
      this.records.set(row.id, row);
    }

    this.approvalInstances.set('wbpi_seed_001', {
      processInstanceId: 'wbpi_seed_001',
      businessRecordId: 'wb-record-legacy-002',
      moduleCode: 'shipping_voyage_approval',
      externalStatus: 'pending',
      mirrorStatus: 'approval_pending',
      startedAt: '2026-04-21T01:23:00.000Z',
      lastCallbackAt: null,
      lastReconciledAt: null,
      callbackVersion: 0,
    });
  }
}
