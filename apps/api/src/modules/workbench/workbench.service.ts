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
  status: 'pending' | 'in_progress' | 'completed';
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

interface ModuleSchemaStepTemplate {
  stepCode: string;
  stepName: string;
}

interface ModuleSchemaDefinition {
  moduleCode: string;
  templateType: TemplateType;
  sections: Array<{
    key: string;
    title: string;
    fields: ModuleSchemaField[];
  }>;
  stepTemplates?: ModuleSchemaStepTemplate[];
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
    moduleCode: 'goa_safety_hazard',
    moduleName: '总经办安全隐患排查管理',
    departmentCode: 'general_office',
    templateType: 'inspection_rectification',
    requiresApproval: false,
    supportsPrint: true,
    supportsStatistics: true,
    mobileFirst: true,
    sortOrder: 145,
    visibleRoles: ['system_admin', 'general_office'],
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
    moduleCode: 'shipping_vessel_inspection',
    moduleName: '船舶检验',
    departmentCode: 'shipping',
    templateType: 'inspection_rectification',
    requiresApproval: false,
    supportsPrint: true,
    supportsStatistics: true,
    mobileFirst: true,
    sortOrder: 151,
    visibleRoles: ['system_admin', 'general_office', 'shipping', 'crew'],
  },
  {
    moduleCode: 'shipping_confined_space_operation',
    moduleName: '密闭空间作业记录',
    departmentCode: 'shipping',
    templateType: 'inspection_rectification',
    requiresApproval: false,
    supportsPrint: true,
    supportsStatistics: true,
    mobileFirst: true,
    sortOrder: 152,
    visibleRoles: ['system_admin', 'general_office', 'shipping', 'crew'],
  },
  {
    moduleCode: 'shipping_oily_water_operation',
    moduleName: '污油水接收作业',
    departmentCode: 'shipping',
    templateType: 'inspection_rectification',
    requiresApproval: false,
    supportsPrint: true,
    supportsStatistics: true,
    mobileFirst: true,
    sortOrder: 153,
    visibleRoles: ['system_admin', 'general_office', 'shipping', 'crew'],
  },
  {
    moduleCode: 'shipping_maritime_safety_check',
    moduleName: '海事安全检查记录',
    departmentCode: 'shipping',
    templateType: 'inspection_rectification',
    requiresApproval: false,
    supportsPrint: true,
    supportsStatistics: true,
    mobileFirst: true,
    sortOrder: 154,
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
    moduleCode: 'shipping_equipment_maintenance',
    moduleName: '船务部设备维修保养',
    departmentCode: 'shipping',
    templateType: 'service_asset',
    requiresApproval: false,
    supportsPrint: true,
    supportsStatistics: true,
    mobileFirst: true,
    sortOrder: 165,
    visibleRoles: ['system_admin', 'general_office', 'shipping', 'crew'],
  },
  {
    moduleCode: 'shipping_equipment_inspection',
    moduleName: '船务部设备检验',
    departmentCode: 'shipping',
    templateType: 'service_asset',
    requiresApproval: false,
    supportsPrint: true,
    supportsStatistics: true,
    mobileFirst: true,
    sortOrder: 166,
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
    moduleCode: 'shipping_fuel_bunkering_approval',
    moduleName: '燃油加注审批',
    departmentCode: 'shipping',
    templateType: 'wecom_approval',
    requiresApproval: true,
    supportsPrint: true,
    supportsStatistics: false,
    mobileFirst: true,
    sortOrder: 171,
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
    moduleCode: 'logistics_warehouse',
    moduleName: '后勤部仓库管理',
    departmentCode: 'logistics',
    templateType: 'service_asset',
    requiresApproval: false,
    supportsPrint: true,
    supportsStatistics: true,
    mobileFirst: true,
    sortOrder: 181,
    visibleRoles: ['system_admin', 'general_office', 'logistics'],
  },
  {
    moduleCode: 'logistics_office',
    moduleName: '后勤部办公室管理',
    departmentCode: 'logistics',
    templateType: 'service_asset',
    requiresApproval: false,
    supportsPrint: true,
    supportsStatistics: true,
    mobileFirst: true,
    sortOrder: 182,
    visibleRoles: ['system_admin', 'general_office', 'logistics'],
  },
  {
    moduleCode: 'logistics_canteen',
    moduleName: '后勤部食堂管理',
    departmentCode: 'logistics',
    templateType: 'service_asset',
    requiresApproval: false,
    supportsPrint: true,
    supportsStatistics: true,
    mobileFirst: true,
    sortOrder: 183,
    visibleRoles: ['system_admin', 'general_office', 'logistics'],
  },
  {
    moduleCode: 'logistics_dormitory',
    moduleName: '后勤部宿舍管理',
    departmentCode: 'logistics',
    templateType: 'service_asset',
    requiresApproval: false,
    supportsPrint: true,
    supportsStatistics: true,
    mobileFirst: true,
    sortOrder: 184,
    visibleRoles: ['system_admin', 'general_office', 'logistics'],
  },
  {
    moduleCode: 'logistics_vehicle_maintenance',
    moduleName: '后勤部车辆维修保养',
    departmentCode: 'logistics',
    templateType: 'service_asset',
    requiresApproval: false,
    supportsPrint: true,
    supportsStatistics: true,
    mobileFirst: true,
    sortOrder: 185,
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

const OPERATION_FLOW_MODULE_SCHEMAS: Record<string, ModuleSchemaDefinition> = {
  business_operation_flow: {
    moduleCode: 'business_operation_flow',
    templateType: 'operation_flow',
    sections: [
      {
        key: 'operation',
        title: '作业基本信息',
        fields: [
          { key: 'operationName', label: '作业名称', required: true, inputType: 'text' },
          { key: 'vesselName', label: '作业船名', required: true, inputType: 'text' },
          { key: 'berth', label: '泊位', required: true, inputType: 'text' },
          { key: 'teamLead', label: '带班负责人', required: true, inputType: 'text' },
        ],
      },
    ],
    stepTemplates: [
      { stepCode: 'pre_shift_meeting', stepName: '班前会议' },
      { stepCode: 'pre_operation_check', stepName: '作业前检查工作' },
      { stepCode: 'patrol_record', stepName: '巡查记录' },
      { stepCode: 'completion_confirmation', stepName: '完工确认记录' },
    ],
  },
  zhongchuan_operation_flow: {
    moduleCode: 'zhongchuan_operation_flow',
    templateType: 'operation_flow',
    sections: [
      {
        key: 'operation',
        title: '工作组作业信息',
        fields: [
          { key: 'operationName', label: '作业名称', required: true, inputType: 'text' },
          { key: 'vesselName', label: '作业船舶', required: true, inputType: 'text' },
          { key: 'workArea', label: '作业区域', required: true, inputType: 'text' },
          { key: 'shiftLeader', label: '班组长', required: true, inputType: 'text' },
        ],
      },
    ],
    stepTemplates: [
      { stepCode: 'pre_shift_meeting', stepName: '班前会议' },
      { stepCode: 'work_attendance', stepName: '工作考勤' },
      { stepCode: 'pre_operation_check', stepName: '作业前检查工作' },
      { stepCode: 'patrol_record', stepName: '巡航记录' },
      { stepCode: 'completion_confirmation', stepName: '完工确认记录' },
    ],
  },
  pinglu_operation_flow: {
    moduleCode: 'pinglu_operation_flow',
    templateType: 'operation_flow',
    sections: [
      {
        key: 'operation',
        title: '平陆运河作业信息',
        fields: [
          { key: 'operationName', label: '作业名称', required: true, inputType: 'text' },
          { key: 'vesselName', label: '作业船舶', required: true, inputType: 'text' },
          { key: 'workArea', label: '作业区域', required: true, inputType: 'text' },
          { key: 'shiftLeader', label: '班组长', required: true, inputType: 'text' },
        ],
      },
    ],
    stepTemplates: [
      { stepCode: 'pre_shift_meeting', stepName: '班前会议' },
      { stepCode: 'work_attendance', stepName: '工作考勤' },
      { stepCode: 'pre_operation_check', stepName: '作业前检查工作' },
      { stepCode: 'patrol_record', stepName: '巡航记录' },
      { stepCode: 'completion_confirmation', stepName: '完工确认记录' },
    ],
  },
};

const INSPECTION_RECTIFICATION_MODULE_SCHEMAS: Record<string, ModuleSchemaDefinition> = {
  goa_safety_hazard: {
    moduleCode: 'goa_safety_hazard',
    templateType: 'inspection_rectification',
    sections: [
      {
        key: 'hazard',
        title: '隐患排查信息',
        fields: [
          { key: 'inspectionArea', label: '排查区域', required: true, inputType: 'text' },
          { key: 'riskLevel', label: '风险等级', required: true, inputType: 'text', placeholder: '低/中/高' },
          { key: 'hazardDescription', label: '隐患描述', required: true, inputType: 'textarea' },
          { key: 'rectificationDeadline', label: '整改期限', required: true, inputType: 'date' },
        ],
      },
    ],
    stepTemplates: [
      { stepCode: 'on_site_inspection', stepName: '现场检查' },
      { stepCode: 'rectification', stepName: '整改执行' },
      { stepCode: 'review_close', stepName: '审核关闭' },
    ],
  },
  shipping_self_inspection: {
    moduleCode: 'shipping_self_inspection',
    templateType: 'inspection_rectification',
    sections: [
      {
        key: 'selfInspection',
        title: '船舶自查信息',
        fields: [
          { key: 'vesselName', label: '船舶名称', required: true, inputType: 'text' },
          { key: 'inspectionScope', label: '检查范围', required: true, inputType: 'text' },
          { key: 'hazardDescription', label: '问题描述', required: true, inputType: 'textarea' },
          { key: 'deadline', label: '整改期限', required: true, inputType: 'date' },
        ],
      },
    ],
    stepTemplates: [
      { stepCode: 'on_site_inspection', stepName: '现场检查' },
      { stepCode: 'rectification', stepName: '整改执行' },
      { stepCode: 'review_close', stepName: '审核关闭' },
    ],
  },
  shipping_vessel_inspection: {
    moduleCode: 'shipping_vessel_inspection',
    templateType: 'inspection_rectification',
    sections: [
      {
        key: 'vesselInspection',
        title: '船舶检验信息',
        fields: [
          { key: 'vesselName', label: '船舶名称', required: true, inputType: 'text' },
          { key: 'inspectionType', label: '检验类型', required: true, inputType: 'text' },
          { key: 'findingSummary', label: '检验结论', required: true, inputType: 'textarea' },
          { key: 'deadline', label: '整改期限', required: true, inputType: 'date' },
        ],
      },
    ],
    stepTemplates: [
      { stepCode: 'on_site_inspection', stepName: '现场检查' },
      { stepCode: 'rectification', stepName: '整改执行' },
      { stepCode: 'review_close', stepName: '审核关闭' },
    ],
  },
  shipping_confined_space_operation: {
    moduleCode: 'shipping_confined_space_operation',
    templateType: 'inspection_rectification',
    sections: [
      {
        key: 'confinedSpace',
        title: '密闭空间作业检查',
        fields: [
          { key: 'spaceName', label: '作业舱室', required: true, inputType: 'text' },
          { key: 'gasTestResult', label: '气体检测结果', required: true, inputType: 'textarea' },
          { key: 'safetyMeasures', label: '安全措施', required: true, inputType: 'textarea' },
          { key: 'deadline', label: '整改期限', required: true, inputType: 'date' },
        ],
      },
    ],
    stepTemplates: [
      { stepCode: 'on_site_inspection', stepName: '现场检查' },
      { stepCode: 'rectification', stepName: '整改执行' },
      { stepCode: 'review_close', stepName: '审核关闭' },
    ],
  },
  shipping_oily_water_operation: {
    moduleCode: 'shipping_oily_water_operation',
    templateType: 'inspection_rectification',
    sections: [
      {
        key: 'oilyWater',
        title: '污油水作业检查',
        fields: [
          { key: 'operationVessel', label: '作业船舶', required: true, inputType: 'text' },
          { key: 'operationArea', label: '作业区域', required: true, inputType: 'text' },
          { key: 'issueDescription', label: '问题描述', required: true, inputType: 'textarea' },
          { key: 'deadline', label: '整改期限', required: true, inputType: 'date' },
        ],
      },
    ],
    stepTemplates: [
      { stepCode: 'on_site_inspection', stepName: '现场检查' },
      { stepCode: 'rectification', stepName: '整改执行' },
      { stepCode: 'review_close', stepName: '审核关闭' },
    ],
  },
  shipping_maritime_safety_check: {
    moduleCode: 'shipping_maritime_safety_check',
    templateType: 'inspection_rectification',
    sections: [
      {
        key: 'maritimeSafety',
        title: '海事安全检查',
        fields: [
          { key: 'inspectionAgency', label: '检查单位', required: true, inputType: 'text' },
          { key: 'inspectionItem', label: '检查事项', required: true, inputType: 'text' },
          { key: 'findingSummary', label: '检查问题', required: true, inputType: 'textarea' },
          { key: 'deadline', label: '整改期限', required: true, inputType: 'date' },
        ],
      },
    ],
    stepTemplates: [
      { stepCode: 'on_site_inspection', stepName: '现场检查' },
      { stepCode: 'rectification', stepName: '整改执行' },
      { stepCode: 'review_close', stepName: '审核关闭' },
    ],
  },
};

const ATTENDANCE_MODULE_SCHEMAS: Record<string, ModuleSchemaDefinition> = {
  finance_attendance: {
    moduleCode: 'finance_attendance',
    templateType: 'attendance_statistics',
    sections: [
      {
        key: 'financeAttendance',
        title: '财务统计中心打卡记录',
        fields: [
          { key: 'employeeName', label: '员工姓名', required: true, inputType: 'text' },
          { key: 'period', label: '时段', required: true, inputType: 'text', placeholder: 'am/pm' },
          { key: 'locationInRange', label: '是否在钦州范围', required: true, inputType: 'text', placeholder: 'true/false' },
          { key: 'dutyType', label: '出勤类型', required: true, inputType: 'text', placeholder: 'normal/business_trip/dispatch' },
        ],
      },
    ],
  },
  shipping_attendance: {
    moduleCode: 'shipping_attendance',
    templateType: 'attendance_statistics',
    sections: [
      {
        key: 'shippingAttendance',
        title: '船员考勤记录',
        fields: [
          { key: 'crewName', label: '船员姓名', required: true, inputType: 'text' },
          { key: 'period', label: '时段', required: true, inputType: 'text', placeholder: 'am/pm' },
          { key: 'locationInRange', label: '是否在钦州范围', required: true, inputType: 'text', placeholder: 'true/false' },
          { key: 'dutyType', label: '出勤类型', required: true, inputType: 'text', placeholder: 'normal/business_trip/dispatch' },
        ],
      },
    ],
  },
};

const SERVICE_ASSET_MODULE_SCHEMAS: Record<string, ModuleSchemaDefinition> = {
  shipping_equipment_maintenance: {
    moduleCode: 'shipping_equipment_maintenance',
    templateType: 'service_asset',
    sections: [
      {
        key: 'maintenance',
        title: '设备维修保养',
        fields: [
          { key: 'assetName', label: '设备名称', required: true, inputType: 'text' },
          { key: 'vesselName', label: '所属船舶', required: true, inputType: 'text' },
          { key: 'maintenanceType', label: '保养类型', required: true, inputType: 'text' },
          { key: 'maintenanceSummary', label: '处理说明', required: true, inputType: 'textarea' },
        ],
      },
    ],
  },
  shipping_equipment_inspection: {
    moduleCode: 'shipping_equipment_inspection',
    templateType: 'service_asset',
    sections: [
      {
        key: 'inspection',
        title: '设备检验记录',
        fields: [
          { key: 'assetName', label: '设备名称', required: true, inputType: 'text' },
          { key: 'inspectionStandard', label: '检验标准', required: true, inputType: 'text' },
          { key: 'inspectionResult', label: '检验结论', required: true, inputType: 'textarea' },
          { key: 'nextInspectionAt', label: '下次检验时间', required: true, inputType: 'date' },
        ],
      },
    ],
  },
  logistics_warehouse: {
    moduleCode: 'logistics_warehouse',
    templateType: 'service_asset',
    sections: [
      {
        key: 'warehouse',
        title: '仓库管理记录',
        fields: [
          { key: 'materialName', label: '物资名称', required: true, inputType: 'text' },
          { key: 'quantity', label: '数量', required: true, inputType: 'number' },
          { key: 'operationType', label: '操作类型', required: true, inputType: 'text', placeholder: '入库/出库/盘点' },
          { key: 'remark', label: '备注', required: false, inputType: 'textarea' },
        ],
      },
    ],
  },
  logistics_office: {
    moduleCode: 'logistics_office',
    templateType: 'service_asset',
    sections: [
      {
        key: 'office',
        title: '办公室管理记录',
        fields: [
          { key: 'requestType', label: '事项类型', required: true, inputType: 'text' },
          { key: 'requestor', label: '申请人', required: true, inputType: 'text' },
          { key: 'requestSummary', label: '事项说明', required: true, inputType: 'textarea' },
          { key: 'completedAt', label: '完成时间', required: false, inputType: 'date' },
        ],
      },
    ],
  },
  logistics_canteen: {
    moduleCode: 'logistics_canteen',
    templateType: 'service_asset',
    sections: [
      {
        key: 'canteen',
        title: '食堂管理记录',
        fields: [
          { key: 'mealPeriod', label: '餐次', required: true, inputType: 'text', placeholder: '早餐/午餐/晚餐' },
          { key: 'headcount', label: '就餐人数', required: true, inputType: 'number' },
          { key: 'safetyCheck', label: '食品安全检查', required: true, inputType: 'textarea' },
          { key: 'issueSummary', label: '异常说明', required: false, inputType: 'textarea' },
        ],
      },
    ],
  },
  logistics_dormitory: {
    moduleCode: 'logistics_dormitory',
    templateType: 'service_asset',
    sections: [
      {
        key: 'dormitory',
        title: '宿舍管理记录',
        fields: [
          { key: 'roomNo', label: '房间号', required: true, inputType: 'text' },
          { key: 'occupancy', label: '入住人数', required: true, inputType: 'number' },
          { key: 'inspectionSummary', label: '检查情况', required: true, inputType: 'textarea' },
          { key: 'maintenanceNeeded', label: '维修需求', required: false, inputType: 'textarea' },
        ],
      },
    ],
  },
  logistics_vehicle_maintenance: {
    moduleCode: 'logistics_vehicle_maintenance',
    templateType: 'service_asset',
    sections: [
      {
        key: 'vehicle',
        title: '车辆维修保养',
        fields: [
          { key: 'vehicleNo', label: '车牌号', required: true, inputType: 'text' },
          { key: 'maintenanceType', label: '保养类型', required: true, inputType: 'text' },
          { key: 'mileage', label: '里程', required: true, inputType: 'number' },
          { key: 'repairSummary', label: '维修说明', required: true, inputType: 'textarea' },
        ],
      },
    ],
  },
};

const WECOM_APPROVAL_MODULE_SCHEMAS: Record<string, ModuleSchemaDefinition> = {
  shipping_voyage_approval: {
    moduleCode: 'shipping_voyage_approval',
    templateType: 'wecom_approval',
    sections: [
      {
        key: 'voyage',
        title: '航次计划审批单',
        fields: [
          { key: 'vesselName', label: '船舶名称', required: true, inputType: 'text' },
          { key: 'voyageRoute', label: '航线', required: true, inputType: 'text' },
          { key: 'departureAt', label: '预计离港时间', required: true, inputType: 'date' },
          { key: 'safetySummary', label: '航前检查说明', required: true, inputType: 'textarea' },
        ],
      },
    ],
  },
  shipping_fuel_bunkering_approval: {
    moduleCode: 'shipping_fuel_bunkering_approval',
    templateType: 'wecom_approval',
    sections: [
      {
        key: 'fuel',
        title: '燃油加注审批单',
        fields: [
          { key: 'vesselName', label: '船舶名称', required: true, inputType: 'text' },
          { key: 'fuelType', label: '燃油类型', required: true, inputType: 'text' },
          { key: 'requestedAmount', label: '申请加注量', required: true, inputType: 'number' },
          { key: 'reason', label: '申请说明', required: true, inputType: 'textarea' },
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

    const schema =
      LEDGER_MODULE_SCHEMAS[moduleCode] ??
      OPERATION_FLOW_MODULE_SCHEMAS[moduleCode] ??
      INSPECTION_RECTIFICATION_MODULE_SCHEMAS[moduleCode] ??
      ATTENDANCE_MODULE_SCHEMAS[moduleCode] ??
      SERVICE_ASSET_MODULE_SCHEMAS[moduleCode] ??
      WECOM_APPROVAL_MODULE_SCHEMAS[moduleCode];
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

  getAttendanceStatistics(user: CurrentUser, month?: string) {
    const monthPrefix = this.normalizeMonth(month);
    const visibleRecords = this.listVisibleRecords(user);
    const recordsInMonth = visibleRecords.filter((record) => record.occurredAt.startsWith(monthPrefix));

    const attendanceModules = WORKBENCH_MODULES.filter((moduleItem) => moduleItem.templateType === 'attendance_statistics');
    const attendanceModuleCodes = new Set(attendanceModules.map((moduleItem) => moduleItem.moduleCode));
    const operationSourceCodes = new Set(['business_operation_flow', 'zhongchuan_operation_flow', 'pinglu_operation_flow']);

    const attendanceRecords = recordsInMonth.filter((record) => attendanceModuleCodes.has(record.moduleCode));
    const operationSourceRecords = recordsInMonth.filter((record) => operationSourceCodes.has(record.moduleCode));
    const mergedCount = attendanceRecords.length + operationSourceRecords.length;

    const morningCount =
      attendanceRecords.filter((record) => this.toLowerString(record.payload.period) === 'am').length +
      operationSourceRecords.filter((record) => this.getHour(record.occurredAt) < 12).length;
    const afternoonCount = mergedCount - morningCount;

    const inRangeCount =
      attendanceRecords.filter((record) => this.toBoolean(record.payload.locationInRange)).length +
      operationSourceRecords.filter((record) => this.isQinzhouRange(record)).length;
    const outRangeCount = Math.max(mergedCount - inRangeCount, 0);

    const businessTripCount = attendanceRecords.filter((record) => {
      const dutyType = this.toLowerString(record.payload.dutyType);
      return dutyType === 'business_trip' || dutyType === 'dispatch';
    }).length;
    const normalDutyCount = Math.max(attendanceRecords.length - businessTripCount, 0);

    const moduleTotals = attendanceModules.map((moduleItem) => {
      const recordCount = attendanceRecords.filter((record) => record.moduleCode === moduleItem.moduleCode).length;
      return {
        moduleCode: moduleItem.moduleCode,
        moduleName: moduleItem.moduleName,
        departmentCode: moduleItem.departmentCode,
        recordCount,
      };
    });

    const operationTotals = [...operationSourceCodes].map((moduleCode) => {
      const moduleItem = WORKBENCH_MODULES.find((item) => item.moduleCode === moduleCode);
      return {
        moduleCode,
        moduleName: moduleItem?.moduleName ?? moduleCode,
        departmentCode: moduleItem?.departmentCode ?? 'workgroup',
        recordCount: operationSourceRecords.filter((record) => record.moduleCode === moduleCode).length,
      };
    });

    return {
      month: monthPrefix,
      summary: {
        totalCheckIns: mergedCount,
        financeAndShippingCheckIns: attendanceRecords.length,
        operationFlowCheckIns: operationSourceRecords.length,
        morningCount,
        afternoonCount,
        inRangeCount,
        outRangeCount,
        businessTripCount,
        normalDutyCount,
      },
      moduleTotals: [...moduleTotals, ...operationTotals],
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

    const ledgerSchema = LEDGER_MODULE_SCHEMAS[dto.moduleCode];
    const operationFlowSchema = OPERATION_FLOW_MODULE_SCHEMAS[dto.moduleCode];
    const inspectionSchema = INSPECTION_RECTIFICATION_MODULE_SCHEMAS[dto.moduleCode];
    const attendanceSchema = ATTENDANCE_MODULE_SCHEMAS[dto.moduleCode];
    const serviceAssetSchema = SERVICE_ASSET_MODULE_SCHEMAS[dto.moduleCode];
    const wecomApprovalSchema = WECOM_APPROVAL_MODULE_SCHEMAS[dto.moduleCode];
    if (!ledgerSchema && !operationFlowSchema && !inspectionSchema && !attendanceSchema && !serviceAssetSchema && !wecomApprovalSchema) {
      throw new BadRequestException('module schema not found');
    }

    if (
      moduleItem.templateType !== 'ledger_form' &&
      moduleItem.templateType !== 'operation_flow' &&
      moduleItem.templateType !== 'inspection_rectification' &&
      moduleItem.templateType !== 'attendance_statistics' &&
      moduleItem.templateType !== 'service_asset' &&
      moduleItem.templateType !== 'wecom_approval'
    ) {
      throw new BadRequestException('Wave 7 unsupported template type');
    }

    const nowIso = new Date().toISOString();
    const steps = this.buildInitialSteps(moduleItem.moduleCode);
    const initialStatus =
      moduleItem.templateType === 'ledger_form'
        ? 'draft'
        : moduleItem.templateType === 'attendance_statistics' || moduleItem.templateType === 'service_asset' || moduleItem.templateType === 'wecom_approval'
          ? 'submitted'
          : 'assigned';

    const record: WorkbenchRecord = {
      id: randomUUID(),
      moduleCode: dto.moduleCode,
      templateCode: `${dto.moduleCode}_v1`,
      title: dto.title.trim(),
      summary: dto.summary.trim(),
      status: initialStatus,
      vesselId: dto.vesselId?.trim() || null,
      occurredAt: dto.occurredAt ?? nowIso,
      approvalChannel: 'internal',
      externalProcessInstanceId: null,
      externalStatus: null,
      ownerUserId: user.userId,
      visibleRoles: [...moduleItem.visibleRoles],
      payload: dto.payload ?? {},
      steps,
      attachments: [],
      actionLogs: [],
    };

    this.appendActionLog(record, {
      actionType: 'create_record',
      operatorUserId: user.userId,
      fromStatus: initialStatus,
      toStatus: initialStatus,
      comment:
        moduleItem.templateType === 'operation_flow'
          ? 'Wave 4 作业闭环录单'
          : moduleItem.templateType === 'inspection_rectification'
            ? 'Wave 5 检查整改录单'
            : moduleItem.templateType === 'attendance_statistics'
              ? 'Wave 6 考勤统计录单'
              : moduleItem.templateType === 'service_asset'
                ? 'Wave 7 资产服务录单'
                : moduleItem.templateType === 'wecom_approval'
                  ? 'Wave 7 审批类录单'
            : 'Wave 3 台账录单',
    });

    this.records.set(record.id, record);

    return this.toRecordDetail(record);
  }

  getRecordDetail(recordId: string, user: CurrentUser) {
    const record = this.mustGetRecord(recordId);
    this.assertRecordVisible(record, user);
    return this.toRecordDetail(record);
  }

  performRecordAction(recordId: string, dto: WorkbenchRecordActionDto, user: CurrentUser) {
    const record = this.mustGetRecord(recordId);
    this.assertRecordVisible(record, user);

    const fromStatus = record.status;

    const moduleItem = this.mustGetModule(record.moduleCode);
    const isInspectionRectification = moduleItem.templateType === 'inspection_rectification';

    if (dto.actionType === 'start' && record.steps.length > 0) {
      const firstPending = record.steps.find((step) => step.status === 'pending');
      if (firstPending) {
        firstPending.status = 'in_progress';
      }
      record.status = 'in_progress';
    } else if (dto.actionType === 'complete_step') {
      const stepCode = String(dto.payload?.stepCode ?? '').trim();
      if (!stepCode) {
        throw new BadRequestException('payload.stepCode is required for complete_step');
      }

      const step = record.steps.find((item) => item.stepCode === stepCode);
      if (!step) {
        throw new NotFoundException('step not found');
      }

      if (isInspectionRectification) {
        const rectificationRequired = dto.payload?.rectificationRequired;
        if (typeof rectificationRequired === 'boolean') {
          step.rectificationRequired = rectificationRequired;
        }

        const rectificationStatus = dto.payload?.rectificationStatus;
        if (typeof rectificationStatus === 'string' && rectificationStatus.trim()) {
          step.rectificationStatus = rectificationStatus.trim();
        } else if (step.rectificationRequired && !step.rectificationStatus) {
          step.rectificationStatus = 'submitted';
        }
      }

      if (step.status !== 'completed') {
        step.status = 'completed';
      }

      const nextPending = record.steps.find((item) => item.status === 'pending');
      if (nextPending) {
        nextPending.status = 'in_progress';
        record.status = 'in_progress';
      } else {
        record.status = 'pending_review';
      }
    } else if (dto.actionType === 'request_rework' && isInspectionRectification) {
      const inProgressStep = record.steps.find((step) => step.status === 'in_progress');
      if (inProgressStep) {
        inProgressStep.rectificationRequired = true;
        inProgressStep.rectificationStatus = 'rework_required';
      }
      record.status = 'rework_required';
    } else {
      record.status = this.resolveNextStatus(fromStatus, dto.actionType);
    }

    this.appendActionLog(record, {
      actionType: dto.actionType,
      operatorUserId: user.userId,
      fromStatus,
      toStatus: record.status,
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
        steps: record.steps,
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

  private buildInitialSteps(moduleCode: string): WorkbenchStep[] {
    const schema = OPERATION_FLOW_MODULE_SCHEMAS[moduleCode] ?? INSPECTION_RECTIFICATION_MODULE_SCHEMAS[moduleCode];
    if (!schema?.stepTemplates?.length) {
      return [];
    }

    return schema.stepTemplates.map((step) => ({
      stepCode: step.stepCode,
      stepName: step.stepName,
      status: 'pending',
      rectificationRequired: false,
      rectificationStatus: null,
    }));
  }

  private normalizeMonth(month?: string) {
    if (!month) {
      return new Date().toISOString().slice(0, 7);
    }
    if (!/^\d{4}-\d{2}$/.test(month)) {
      throw new BadRequestException('month format must be YYYY-MM');
    }
    return month;
  }

  private toLowerString(value: unknown) {
    return String(value ?? '').trim().toLowerCase();
  }

  private toBoolean(value: unknown) {
    const normalized = this.toLowerString(value);
    return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'y';
  }

  private getHour(iso: string) {
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? 0 : date.getUTCHours();
  }

  private isQinzhouRange(record: WorkbenchRecord) {
    const berth = this.toLowerString(record.payload.berth);
    const workArea = this.toLowerString(record.payload.workArea);
    const vesselName = this.toLowerString(record.payload.vesselName);
    return berth.includes('qz') || berth.includes('qinzhou') || workArea.includes('钦州') || workArea.includes('qinzhou') || vesselName.includes('钦州');
  }

  private toRecordDetail(record: WorkbenchRecord) {
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
        return currentStatus;
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
        id: 'wb-record-attendance-001',
        moduleCode: 'finance_attendance',
        templateCode: 'finance_attendance_v1',
        title: '财务统计-4月上旬打卡汇总',
        summary: '财务部员工打卡与外派统计。',
        status: 'submitted',
        vesselId: null,
        occurredAt: '2026-04-21T01:10:00.000Z',
        approvalChannel: 'internal',
        externalProcessInstanceId: null,
        externalStatus: null,
        ownerUserId: 'finance_user_1',
        visibleRoles: ['system_admin', 'general_office', 'finance'],
        payload: {
          employeeName: '李会计',
          period: 'am',
          locationInRange: 'true',
          dutyType: 'normal',
        },
        steps: [],
        attachments: [],
        actionLogs: [],
      },
      {
        id: 'wb-record-attendance-002',
        moduleCode: 'shipping_attendance',
        templateCode: 'shipping_attendance_v1',
        title: '船员考勤-苏南012（4月21日）',
        summary: '船员早班签到与出勤类型记录。',
        status: 'submitted',
        vesselId: 'sunan-012',
        occurredAt: '2026-04-21T08:10:00.000Z',
        approvalChannel: 'internal',
        externalProcessInstanceId: null,
        externalStatus: null,
        ownerUserId: 'crew_012',
        visibleRoles: ['system_admin', 'general_office', 'shipping', 'crew'],
        payload: {
          crewName: '周水手',
          period: 'pm',
          locationInRange: 'true',
          dutyType: 'dispatch',
        },
        steps: [],
        attachments: [],
        actionLogs: [],
      },
      {
        id: 'wb-record-asset-001',
        moduleCode: 'logistics_warehouse',
        templateCode: 'logistics_warehouse_v1',
        title: '仓库盘点记录（4月）',
        summary: '后勤仓库月度盘点并补齐缺口。',
        status: 'submitted',
        vesselId: null,
        occurredAt: '2026-04-21T02:40:00.000Z',
        approvalChannel: 'internal',
        externalProcessInstanceId: null,
        externalStatus: null,
        ownerUserId: 'logistics_user_1',
        visibleRoles: ['system_admin', 'general_office', 'logistics'],
        payload: {
          materialName: '吸油毡',
          quantity: 320,
          operationType: '盘点',
          remark: '缺口12件，已申请补货',
        },
        steps: [],
        attachments: [],
        actionLogs: [],
      },
      {
        id: 'wb-record-approval-002',
        moduleCode: 'shipping_fuel_bunkering_approval',
        templateCode: 'shipping_fuel_bunkering_approval_v1',
        title: '燃油加注审批（苏南012）',
        summary: '申请加注低硫燃油用于下个航次。',
        status: 'submitted',
        vesselId: 'sunan-012',
        occurredAt: '2026-04-21T03:50:00.000Z',
        approvalChannel: 'internal',
        externalProcessInstanceId: null,
        externalStatus: null,
        ownerUserId: 'crew_012',
        visibleRoles: ['system_admin', 'general_office', 'shipping', 'crew'],
        payload: {
          vesselName: '苏南012',
          fuelType: '低硫燃油',
          requestedAmount: 25,
          reason: '执行北海至钦州航次保障需求',
        },
        steps: [],
        attachments: [],
        actionLogs: [],
      },
      {
        id: 'wb-record-flow-001',
        moduleCode: 'business_operation_flow',
        templateCode: 'business_operation_flow_v1',
        title: '围油栏作业流程（泊位B3）',
        summary: '业务部作业闭环四步执行。',
        status: 'in_progress',
        vesselId: 'sunan-012',
        occurredAt: '2026-04-21T05:10:00.000Z',
        approvalChannel: 'internal',
        externalProcessInstanceId: null,
        externalStatus: null,
        ownerUserId: 'business_op_001',
        visibleRoles: ['system_admin', 'general_office', 'business'],
        payload: {
          operationName: '围油栏布设',
          vesselName: '苏南012',
          berth: 'B3',
          teamLead: '赵班长',
        },
        steps: [
          { stepCode: 'pre_shift_meeting', stepName: '班前会议', status: 'completed', rectificationRequired: false, rectificationStatus: null },
          { stepCode: 'pre_operation_check', stepName: '作业前检查工作', status: 'in_progress', rectificationRequired: false, rectificationStatus: null },
          { stepCode: 'patrol_record', stepName: '巡查记录', status: 'pending', rectificationRequired: false, rectificationStatus: null },
          { stepCode: 'completion_confirmation', stepName: '完工确认记录', status: 'pending', rectificationRequired: false, rectificationStatus: null },
        ],
        attachments: [],
        actionLogs: [],
      },
      {
        id: 'wb-record-flow-002',
        moduleCode: 'zhongchuan_operation_flow',
        templateCode: 'zhongchuan_operation_flow_v1',
        title: '中船工作组日常作业（4月21日）',
        summary: '中船工作组五步闭环。',
        status: 'assigned',
        vesselId: 'sunan-022',
        occurredAt: '2026-04-21T06:00:00.000Z',
        approvalChannel: 'internal',
        externalProcessInstanceId: null,
        externalStatus: null,
        ownerUserId: 'group_lead_001',
        visibleRoles: ['system_admin', 'general_office', 'business', 'shipping'],
        payload: {
          operationName: '污油水接收协同作业',
          vesselName: '苏南022',
          workArea: '钦州港东区',
          shiftLeader: '王班长',
        },
        steps: [
          { stepCode: 'pre_shift_meeting', stepName: '班前会议', status: 'pending', rectificationRequired: false, rectificationStatus: null },
          { stepCode: 'work_attendance', stepName: '工作考勤', status: 'pending', rectificationRequired: false, rectificationStatus: null },
          { stepCode: 'pre_operation_check', stepName: '作业前检查工作', status: 'pending', rectificationRequired: false, rectificationStatus: null },
          { stepCode: 'patrol_record', stepName: '巡航记录', status: 'pending', rectificationRequired: false, rectificationStatus: null },
          { stepCode: 'completion_confirmation', stepName: '完工确认记录', status: 'pending', rectificationRequired: false, rectificationStatus: null },
        ],
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
