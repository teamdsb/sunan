import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { createDecipheriv, createHash, randomUUID, timingSafeEqual } from 'crypto';
import { appEnv } from 'src/config/env';
import { CurrentUser } from 'src/common/interfaces/current-user.interface';
import { WecomApprovalCallbackEventEntity } from 'src/database/entities/wecom-approval-callback-event.entity';
import { WecomApprovalInstanceSyncEntity } from 'src/database/entities/wecom-approval-instance-sync.entity';
import { WorkbenchPrintSnapshotEntity } from 'src/database/entities/workbench-print-snapshot.entity';
import { WorkbenchRecordActionLogEntity } from 'src/database/entities/workbench-record-action-log.entity';
import { WorkbenchRecordAttachmentEntity } from 'src/database/entities/workbench-record-attachment.entity';
import { WorkbenchRecordEntity } from 'src/database/entities/workbench-record.entity';
import { WorkbenchRecordStepEntity } from 'src/database/entities/workbench-record-step.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { WorkbenchApprovalCallbackDto } from './dto/workbench-approval-callback.dto';
import { WorkbenchApprovalInstanceListQueryDto } from './dto/workbench-approval-instance-list-query.dto';
import { WorkbenchApprovalLaunchDto } from './dto/workbench-approval-launch.dto';
import { WorkbenchApprovalReconcileDto } from './dto/workbench-approval-reconcile.dto';
import { WorkbenchApprovalRetryDto } from './dto/workbench-approval-retry.dto';
import { WorkbenchAttendanceExportQueryDto } from './dto/workbench-attendance-export-query.dto';
import { WorkbenchAttendanceReconcileDto } from './dto/workbench-attendance-reconcile.dto';
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
  legacyOnly?: boolean;
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
  source: string;
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
  recordSource: 'manual' | 'callback' | 'reconcile';
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

interface ApprovalCallbackRequestMeta {
  signature: string | null;
  timestamp: string | null;
  nonce: string | null;
  requestIp: string | null;
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
    moduleCode: 'business_signin_desk',
    moduleName: '作业人员签到台',
    departmentCode: 'business',
    templateType: 'attendance_statistics',
    requiresApproval: false,
    supportsPrint: true,
    supportsStatistics: true,
    mobileFirst: true,
    sortOrder: 140,
    visibleRoles: ['system_admin', 'general_office', 'business'],
  },
  {
    moduleCode: 'business_receiving_workgroup_flow',
    moduleName: '接收工作组操作流程',
    departmentCode: 'business',
    templateType: 'operation_flow',
    requiresApproval: false,
    supportsPrint: true,
    supportsStatistics: true,
    mobileFirst: true,
    sortOrder: 141,
    visibleRoles: ['system_admin', 'general_office', 'business'],
  },
  {
    moduleCode: 'business_oil_boom_operation',
    moduleName: '围油栏作业',
    departmentCode: 'business',
    templateType: 'operation_flow',
    requiresApproval: false,
    supportsPrint: true,
    supportsStatistics: true,
    mobileFirst: true,
    sortOrder: 142,
    visibleRoles: ['system_admin', 'general_office', 'business'],
  },
  {
    moduleCode: 'business_ship_garbage_operation',
    moduleName: '船舶垃圾接收作业',
    departmentCode: 'business',
    templateType: 'operation_flow',
    requiresApproval: false,
    supportsPrint: true,
    supportsStatistics: true,
    mobileFirst: true,
    sortOrder: 143,
    visibleRoles: ['system_admin', 'general_office', 'business'],
  },
  {
    moduleCode: 'business_ship_oily_water_operation',
    moduleName: '船舶污油水接收作业',
    departmentCode: 'business',
    templateType: 'operation_flow',
    requiresApproval: false,
    supportsPrint: true,
    supportsStatistics: true,
    mobileFirst: true,
    sortOrder: 144,
    visibleRoles: ['system_admin', 'general_office', 'business'],
  },
  {
    moduleCode: 'business_domestic_sewage_operation',
    moduleName: '生活污水接收记录',
    departmentCode: 'business',
    templateType: 'operation_flow',
    requiresApproval: false,
    supportsPrint: true,
    supportsStatistics: true,
    mobileFirst: true,
    sortOrder: 145,
    visibleRoles: ['system_admin', 'general_office', 'business'],
  },
  {
    moduleCode: 'business_operation_flow',
    moduleName: '业务部作业闭环（历史兼容）',
    departmentCode: 'business',
    templateType: 'operation_flow',
    requiresApproval: false,
    supportsPrint: true,
    supportsStatistics: true,
    mobileFirst: true,
    sortOrder: 146,
    visibleRoles: ['system_admin', 'general_office', 'business'],
    legacyOnly: true,
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
    moduleCode: 'shipping_chart_update',
    moduleName: '海图更新',
    departmentCode: 'shipping',
    templateType: 'ledger_form',
    requiresApproval: false,
    supportsPrint: true,
    supportsStatistics: false,
    mobileFirst: true,
    sortOrder: 167,
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
  shipping_chart_update: {
    moduleCode: 'shipping_chart_update',
    templateType: 'ledger_form',
    sections: [
      {
        key: 'chartUpdate',
        title: '海图更新信息',
        fields: [
          { key: 'updateBatch', label: '更新批次', required: true, inputType: 'text' },
          { key: 'applicableVessels', label: '适用船舶', required: true, inputType: 'textarea' },
          { key: 'chartVersion', label: '版本号', required: true, inputType: 'text' },
          { key: 'updatedAt', label: '更新日期', required: true, inputType: 'date' },
          { key: 'updateSummary', label: '更新说明', required: true, inputType: 'textarea' },
          { key: 'attachmentList', label: '附件', required: false, inputType: 'textarea', placeholder: '记录附件清单或说明' },
          { key: 'confirmationRecord', label: '确认记录', required: true, inputType: 'textarea' },
          { key: 'nextReminderDate', label: '下次提醒日期', required: true, inputType: 'date' },
        ],
      },
    ],
  },
};

const OPERATION_FLOW_MODULE_SCHEMAS: Record<string, ModuleSchemaDefinition> = {
  business_receiving_workgroup_flow: {
    moduleCode: 'business_receiving_workgroup_flow',
    templateType: 'operation_flow',
    sections: [
      {
        key: 'operation',
        title: '接收工作组作业信息',
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
  business_oil_boom_operation: {
    moduleCode: 'business_oil_boom_operation',
    templateType: 'operation_flow',
    sections: [
      {
        key: 'oilBoom',
        title: '围油栏作业信息',
        fields: [
          { key: 'vesselName', label: '船名', required: true, inputType: 'text' },
          { key: 'berth', label: '泊位', required: true, inputType: 'text' },
          { key: 'agencyCompany', label: '代理公司', required: true, inputType: 'text' },
          { key: 'operationFee', label: '费用', required: true, inputType: 'number' },
          { key: 'operationDate', label: '作业日期', required: true, inputType: 'date' },
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
  business_ship_garbage_operation: {
    moduleCode: 'business_ship_garbage_operation',
    templateType: 'operation_flow',
    sections: [
      {
        key: 'shipGarbage',
        title: '船舶垃圾接收信息',
        fields: [
          { key: 'vesselName', label: '船名', required: true, inputType: 'text' },
          { key: 'operationDate', label: '日期', required: true, inputType: 'date' },
          { key: 'berth', label: '泊位', required: true, inputType: 'text' },
          { key: 'quantity', label: '接收数量', required: true, inputType: 'number' },
          { key: 'documentNo', label: '单证编号', required: true, inputType: 'text' },
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
  business_ship_oily_water_operation: {
    moduleCode: 'business_ship_oily_water_operation',
    templateType: 'operation_flow',
    sections: [
      {
        key: 'shipOilyWater',
        title: '船舶污油水接收信息',
        fields: [
          { key: 'vesselName', label: '船名', required: true, inputType: 'text' },
          { key: 'operationDate', label: '日期', required: true, inputType: 'date' },
          { key: 'berth', label: '泊位', required: true, inputType: 'text' },
          { key: 'quantity', label: '接收数量', required: true, inputType: 'number' },
          { key: 'voyageNo', label: '航次', required: true, inputType: 'text' },
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
  business_domestic_sewage_operation: {
    moduleCode: 'business_domestic_sewage_operation',
    templateType: 'operation_flow',
    sections: [
      {
        key: 'domesticSewage',
        title: '生活污水接收信息',
        fields: [
          { key: 'vesselName', label: '船名', required: true, inputType: 'text' },
          { key: 'operationDate', label: '日期', required: true, inputType: 'date' },
          { key: 'berth', label: '泊位', required: true, inputType: 'text' },
          { key: 'quantity', label: '接收数量', required: true, inputType: 'number' },
          { key: 'fee', label: '费用', required: false, inputType: 'number' },
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
  business_operation_flow: {
    moduleCode: 'business_operation_flow',
    templateType: 'operation_flow',
    sections: [
      {
        key: 'operation',
        title: '历史作业闭环信息',
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
  business_signin_desk: {
    moduleCode: 'business_signin_desk',
    templateType: 'attendance_statistics',
    sections: [
      {
        key: 'signinDesk',
        title: '作业人员签到台',
        fields: [
          { key: 'employeeName', label: '作业人员姓名', required: true, inputType: 'text' },
          { key: 'vesselName', label: '作业船名', required: true, inputType: 'text' },
          { key: 'berth', label: '泊位', required: true, inputType: 'text' },
          { key: 'period', label: '时段', required: true, inputType: 'text', placeholder: 'am/pm' },
          { key: 'locationInRange', label: '是否在钦州范围', required: true, inputType: 'text', placeholder: 'true/false' },
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
  private readonly logger = new Logger(WorkbenchService.name);

  constructor(
    @InjectRepository(WorkbenchRecordEntity)
    private readonly recordRepository: Repository<WorkbenchRecordEntity>,
    @InjectRepository(WorkbenchRecordStepEntity)
    private readonly stepRepository: Repository<WorkbenchRecordStepEntity>,
    @InjectRepository(WorkbenchRecordAttachmentEntity)
    private readonly attachmentRepository: Repository<WorkbenchRecordAttachmentEntity>,
    @InjectRepository(WorkbenchRecordActionLogEntity)
    private readonly actionLogRepository: Repository<WorkbenchRecordActionLogEntity>,
    @InjectRepository(WorkbenchPrintSnapshotEntity)
    private readonly printSnapshotRepository: Repository<WorkbenchPrintSnapshotEntity>,
    @InjectRepository(WecomApprovalInstanceSyncEntity)
    private readonly approvalSyncRepository: Repository<WecomApprovalInstanceSyncEntity>,
    @InjectRepository(WecomApprovalCallbackEventEntity)
    private readonly callbackEventRepository: Repository<WecomApprovalCallbackEventEntity>,
  ) {}

  async listModules(user: CurrentUser) {
    const visibleModules = this.listVisibleModules(user);
    const pendingMap = await this.computePendingCounts(user);

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

  async getModuleSchema(moduleCode: string, user: CurrentUser) {
    const moduleItem = this.mustGetModule(moduleCode);
    if (moduleItem.legacyOnly) {
      throw new NotFoundException('module schema not found');
    }
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

  async getDashboard(user: CurrentUser) {
    const modules = await this.listModules(user);
    const visibleRecords = await this.listVisibleRecords(user);
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

  async getAttendanceStatistics(user: CurrentUser, month?: string) {
    const monthPrefix = this.normalizeMonth(month);
    const visibleRecords = await this.listVisibleRecords(user);
    const recordsInMonth = visibleRecords.filter((record) => record.occurredAt.startsWith(monthPrefix));

    const attendanceModules = WORKBENCH_MODULES.filter((moduleItem) => moduleItem.templateType === 'attendance_statistics' && !moduleItem.legacyOnly);
    const attendanceModuleCodes = new Set(attendanceModules.map((moduleItem) => moduleItem.moduleCode));
    const operationSourceCodes = new Set([
      'business_receiving_workgroup_flow',
      'business_oil_boom_operation',
      'business_ship_garbage_operation',
      'business_ship_oily_water_operation',
      'business_domestic_sewage_operation',
      'business_operation_flow',
      'zhongchuan_operation_flow',
      'pinglu_operation_flow',
    ]);

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

  async exportAttendanceStatistics(query: WorkbenchAttendanceExportQueryDto, user: CurrentUser) {
    this.assertAttendanceAdmin(user);

    const month = this.normalizeMonth(query.month);
    const exportFormat = query.exportFormat ?? 'xlsx';
    const exportJobId = `att-export-${Date.now()}-${randomUUID().slice(0, 8)}`;
    const downloadFileId = `${exportFormat}-attendance-${month}-${randomUUID().slice(0, 8)}`;

    this.logger.log(
      `attendance export queued: month=${month}, format=${exportFormat}, department=${query.departmentCode ?? 'all'}, job=${exportJobId}`,
    );

    return {
      exportJobId,
      status: 'queued' as const,
      month,
      downloadFileId,
    };
  }

  async reconcileAttendanceStatistics(dto: WorkbenchAttendanceReconcileDto, user: CurrentUser) {
    this.assertAttendanceAdmin(user);

    const month = this.normalizeMonth(dto.month);
    const compareSource = dto.compareSource ?? 'finance_template';
    const reconcileJobId = `att-reconcile-${Date.now()}-${randomUUID().slice(0, 8)}`;
    const stats = await this.getAttendanceStatistics(user, month);
    const differenceCount = stats.summary.outRangeCount;

    this.logger.log(
      `attendance reconcile queued: month=${month}, source=${compareSource}, department=${dto.departmentCode ?? 'all'}, job=${reconcileJobId}`,
    );

    return {
      reconcileJobId,
      status: 'queued' as const,
      month,
      differenceCount,
    };
  }

  async listRecords(query: WorkbenchRecordListQueryDto, user: CurrentUser) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    let records = await this.listVisibleRecords(user);

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

  async createRecord(dto: WorkbenchRecordCreateDto, user: CurrentUser) {
    const moduleItem = this.mustGetModule(dto.moduleCode);
    if (moduleItem.legacyOnly) {
      throw new BadRequestException('legacy module is read-only');
    }
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

    const now = new Date();
    const nowIso = now.toISOString();
    const steps = this.buildInitialSteps(moduleItem.moduleCode);
    const initialStatus =
      moduleItem.templateType === 'ledger_form'
        ? 'draft'
        : moduleItem.templateType === 'attendance_statistics' || moduleItem.templateType === 'service_asset' || moduleItem.templateType === 'wecom_approval'
          ? 'submitted'
          : 'assigned';

    const recordEntity = this.recordRepository.create({
      moduleCode: dto.moduleCode,
      templateCode: `${dto.moduleCode}_v1`,
      recordNo: this.buildRecordNo(),
      recordSource: 'manual',
      title: dto.title.trim(),
      summary: dto.summary.trim(),
      status: initialStatus,
      departmentCode: moduleItem.departmentCode,
      vesselId: dto.vesselId?.trim() || null,
      approvalChannel: 'internal',
      externalProcessInstanceId: null,
      externalStatus: null,
      ownerUserId: user.userId,
      applicantUserId: user.userId,
      assigneeUserId: null,
      reviewerUserId: null,
      occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : now,
      submittedAt: initialStatus === 'submitted' ? now : null,
      closedAt: null,
      payload: dto.payload ?? {},
    });

    const savedRecord = await this.recordRepository.save(recordEntity);

    if (steps.length > 0) {
      await this.stepRepository.save(
        steps.map((step, index) =>
          this.stepRepository.create({
            businessRecordId: savedRecord.id,
            stepCode: step.stepCode,
            stepName: step.stepName,
            stepType: 'normal',
            sequenceNo: index + 1,
            status: step.status,
            rectificationRequired: step.rectificationRequired,
            rectificationStatus: step.rectificationStatus,
            checkResult: null,
            completedBy: null,
            completedAt: null,
            stepPayload: {},
          }),
        ),
      );
    }

    await this.appendActionLog(savedRecord.id, {
      actionType: 'create_record',
      source: 'manual',
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
      payloadDigest: dto.payload ? JSON.stringify(dto.payload) : null,
    });

    return this.getRecordDetail(savedRecord.id, user);
  }

  async getRecordDetail(recordId: string, user: CurrentUser) {
    const record = await this.mustGetRecord(recordId);
    this.assertRecordVisible(record, user);
    const hydrated = await this.hydrateRecord(record);
    return this.toRecordDetail(hydrated);
  }

  async performRecordAction(recordId: string, dto: WorkbenchRecordActionDto, user: CurrentUser) {
    const record = await this.mustGetRecord(recordId);
    this.assertRecordVisible(record, user);

    const steps = await this.stepRepository.find({
      where: { businessRecordId: record.id },
      order: { sequenceNo: 'ASC', createdAt: 'ASC' },
    });

    const fromStatus = record.status;

    const moduleItem = this.mustGetModule(record.moduleCode);
    const isInspectionRectification = moduleItem.templateType === 'inspection_rectification';

    if (dto.actionType === 'start' && steps.length > 0) {
      const firstPending = steps.find((step) => step.status === 'pending');
      if (firstPending) {
        firstPending.status = 'in_progress';
      }
      record.status = 'in_progress';
    } else if (dto.actionType === 'complete_step') {
      const stepCode = String(dto.payload?.stepCode ?? '').trim();
      if (!stepCode) {
        throw new BadRequestException('payload.stepCode is required for complete_step');
      }

      const step = steps.find((item) => item.stepCode === stepCode);
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
        step.completedBy = user.userId;
        step.completedAt = new Date();
      }

      const nextPending = steps.find((item) => item.status === 'pending');
      if (nextPending) {
        nextPending.status = 'in_progress';
        record.status = 'in_progress';
      } else {
        record.status = 'pending_review';
      }
    } else if (dto.actionType === 'request_rework' && isInspectionRectification) {
      const inProgressStep = steps.find((step) => step.status === 'in_progress');
      if (inProgressStep) {
        inProgressStep.rectificationRequired = true;
        inProgressStep.rectificationStatus = 'rework_required';
      }
      record.status = 'rework_required';
    } else {
      record.status = this.resolveNextStatus(fromStatus, dto.actionType);
    }

    if (record.status === 'closed') {
      record.closedAt = new Date();
    }
    if (dto.actionType === 'submit' && !record.submittedAt) {
      record.submittedAt = new Date();
    }

    await this.recordRepository.save(record);
    if (steps.length > 0) {
      await this.stepRepository.save(steps);
    }

    await this.appendActionLog(record.id, {
      actionType: dto.actionType,
      source: 'manual',
      operatorUserId: user.userId,
      fromStatus,
      toStatus: record.status,
      comment: dto.comment ?? null,
      payloadDigest: dto.payload ? JSON.stringify(dto.payload) : null,
    });

    return {
      recordId: record.id,
      status: record.status,
      acceptedAction: dto.actionType,
    };
  }

  async uploadAttachment(recordId: string, dto: WorkbenchRecordUploadAttachmentDto, user: CurrentUser) {
    const record = await this.mustGetRecord(recordId);
    this.assertRecordVisible(record, user);

    let stepId: string | null = null;
    if (dto.stepCode?.trim()) {
      const step = await this.stepRepository.findOne({
        where: {
          businessRecordId: record.id,
          stepCode: dto.stepCode.trim(),
        },
      });
      if (!step) {
        throw new NotFoundException('step not found');
      }
      stepId = step.id;
    }

    const uploadedAt = new Date();
    const attachment = await this.attachmentRepository.save(
      this.attachmentRepository.create({
        businessRecordId: record.id,
        stepId,
        category: dto.category,
        fileId: dto.fileId,
        fileName: `附件-${dto.fileId}`,
        mimeType: 'application/octet-stream',
        storagePath: null,
        uploadedBy: user.userId,
        uploadedAt,
        remark: dto.remark ?? null,
      }),
    );

    await this.appendActionLog(record.id, {
      actionType: 'upload_attachment',
      source: 'manual',
      operatorUserId: user.userId,
      fromStatus: record.status,
      toStatus: record.status,
      comment: dto.remark ?? null,
      payloadDigest: null,
    });

    return {
      id: attachment.id,
      category: attachment.category,
      fileId: attachment.fileId,
      fileName: attachment.fileName,
      uploadedAt: attachment.uploadedAt.toISOString(),
    };
  }

  async getPrintSnapshot(recordId: string, user: CurrentUser) {
    const record = await this.mustGetRecord(recordId);
    this.assertRecordVisible(record, user);
    const hydrated = await this.hydrateRecord(record);

    const renderedAt = new Date();
    const snapshotData = {
      title: hydrated.title,
      status: hydrated.status,
      moduleCode: hydrated.moduleCode,
      summary: hydrated.summary,
      payload: hydrated.payload,
      steps: hydrated.steps,
    };

    const snapshot = await this.printSnapshotRepository.save(
      this.printSnapshotRepository.create({
        businessRecordId: hydrated.id,
        templateVersion: 'v1',
        renderedFileId: `print-${hydrated.id}`,
        renderedFormat: 'pdf',
        renderedAt,
        renderedBy: user.userId,
        snapshotData,
      }),
    );

    this.logger.log(`print snapshot generated: record=${hydrated.id}, snapshot=${snapshot.id}`);

    return {
      recordId: hydrated.id,
      businessRecordId: hydrated.id,
      templateVersion: snapshot.templateVersion,
      renderedFileId: snapshot.renderedFileId,
      renderedFormat: snapshot.renderedFormat,
      renderedAt: snapshot.renderedAt.toISOString(),
      snapshotData,
    };
  }

  async launchApproval(dto: WorkbenchApprovalLaunchDto, user: CurrentUser) {
    const record = await this.mustGetRecord(dto.businessRecordId);
    this.assertRecordVisible(record, user);
    const moduleItem = this.mustGetModule(record.moduleCode);

    if (!moduleItem.requiresApproval) {
      throw new BadRequestException('module does not require approval');
    }

    if (record.externalProcessInstanceId) {
      throw new BadRequestException('approval process already exists for this record');
    }

    const processInstanceId = `wbpi_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const now = new Date();
    this.logger.log(`approval launch started: record=${record.id}, module=${record.moduleCode}, process=${processInstanceId}`);

    await this.approvalSyncRepository.save(
      this.approvalSyncRepository.create({
        businessRecordId: record.id,
        moduleCode: record.moduleCode,
        approvalChannel: 'wecom_native',
        processInstanceId,
        wecomTemplateId: null,
        externalStatus: 'pending',
        internalMirrorStatus: 'approval_pending',
        approvalSyncStatus: 'pending',
        startedBy: user.userId,
        startedAt: now,
        lastCallbackAt: null,
        lastReconciledAt: null,
        callbackVersion: 0,
        retryCount: 0,
        lastRetryAt: null,
        syncErrorCode: null,
        syncErrorMessage: null,
        rawPayloadDigest: dto.payload ? JSON.stringify(dto.payload) : null,
      }),
    );

    record.approvalChannel = 'wecom_native';
    record.externalProcessInstanceId = processInstanceId;
    record.externalStatus = 'pending';
    record.status = 'approval_pending';
    await this.recordRepository.save(record);

    await this.appendActionLog(record.id, {
      actionType: 'launch_approval',
      source: 'manual',
      operatorUserId: user.userId,
      fromStatus: 'submitted',
      toStatus: 'approval_pending',
      comment: dto.summary ?? null,
      payloadDigest: dto.payload ? JSON.stringify(dto.payload) : null,
    });

    const launchStatus: LaunchStatus = 'started';

    return {
      processInstanceId,
      approvalChannel: 'wecom_native' as const,
      launchStatus,
      mirrorStatus: 'approval_pending',
      approvalSyncStatus: 'pending',
    };
  }

  async handleApprovalCallback(dto: WorkbenchApprovalCallbackDto, meta: ApprovalCallbackRequestMeta) {
    const normalizedDto = this.normalizeApprovalCallbackDto(dto);
    this.verifyCallbackSignature(normalizedDto, meta);

    const payloadDigest = normalizedDto.payload ? JSON.stringify(normalizedDto.payload) : null;
    const eventAccepted = await this.registerCallbackEvent(normalizedDto, meta, payloadDigest);
    if (!eventAccepted) {
      this.logger.warn(`approval callback ignored (duplicate): process=${normalizedDto.processInstanceId}, version=${normalizedDto.callbackVersion}`);
      return {
        accepted: true,
        ignored: true,
        processInstanceId: normalizedDto.processInstanceId,
        callbackVersion: normalizedDto.callbackVersion,
      };
    }

    const instance = await this.approvalSyncRepository.findOne({
      where: { processInstanceId: normalizedDto.processInstanceId },
    });
    if (!instance) {
      throw new NotFoundException('approval instance not found');
    }

    if (normalizedDto.callbackVersion <= instance.callbackVersion) {
      this.logger.warn(
        `approval callback ignored (old version): process=${normalizedDto.processInstanceId}, incoming=${normalizedDto.callbackVersion}, current=${instance.callbackVersion}`,
      );
      return {
        accepted: true,
        ignored: true,
        processInstanceId: normalizedDto.processInstanceId,
        callbackVersion: normalizedDto.callbackVersion,
      };
    }

    const mirrorStatus = this.toMirrorStatus(normalizedDto.status);
    const now = new Date();

    instance.externalStatus = normalizedDto.status;
    instance.internalMirrorStatus = mirrorStatus;
    instance.approvalSyncStatus = 'callback_received';
    instance.lastCallbackAt = now;
    instance.callbackVersion = normalizedDto.callbackVersion;
    instance.rawPayloadDigest = payloadDigest;
    instance.syncErrorCode = null;
    instance.syncErrorMessage = null;

    const record = await this.mustGetRecord(instance.businessRecordId);
    const fromStatus = record.status;
    record.externalStatus = normalizedDto.status;
    record.status = mirrorStatus;

    await Promise.all([this.approvalSyncRepository.save(instance), this.recordRepository.save(record)]);

    await this.appendActionLog(record.id, {
      actionType: 'approval_callback',
      source: 'callback',
      operatorUserId: null,
      fromStatus,
      toStatus: mirrorStatus,
      comment: `eventId=${normalizedDto.eventId}`,
      payloadDigest,
    });
    this.logger.log(`approval callback accepted: process=${normalizedDto.processInstanceId}, status=${normalizedDto.status}, mirror=${mirrorStatus}`);

    return {
      accepted: true,
      ignored: false,
      processInstanceId: normalizedDto.processInstanceId,
      mirrorStatus,
      callbackVersion: normalizedDto.callbackVersion,
    };
  }

  async listApprovalInstances(query: WorkbenchApprovalInstanceListQueryDto, user: CurrentUser) {
    this.assertSystemAdmin(user);

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const qb = this.approvalSyncRepository.createQueryBuilder('instance');

    if (query.processInstanceId?.trim()) {
      qb.andWhere('instance.process_instance_id = :processInstanceId', { processInstanceId: query.processInstanceId.trim() });
    }
    if (query.businessRecordId?.trim()) {
      qb.andWhere('instance.business_record_id = :businessRecordId', { businessRecordId: query.businessRecordId.trim() });
    }
    if (query.moduleCode?.trim()) {
      qb.andWhere('instance.module_code = :moduleCode', { moduleCode: query.moduleCode.trim() });
    }
    if (query.approvalSyncStatus) {
      qb.andWhere('instance.approval_sync_status = :approvalSyncStatus', { approvalSyncStatus: query.approvalSyncStatus });
    }
    if (query.externalStatus) {
      qb.andWhere('instance.external_status = :externalStatus', { externalStatus: query.externalStatus });
    }

    const [rows, total] = await qb
      .orderBy('instance.started_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      data: rows.map((instance) => this.toApprovalInstanceResponse(instance)),
      pagination: {
        page,
        pageSize,
        total,
      },
    };
  }

  async getApprovalInstance(processInstanceId: string, user: CurrentUser) {
    const instance = await this.approvalSyncRepository.findOne({ where: { processInstanceId } });
    if (!instance) {
      throw new NotFoundException('approval instance not found');
    }

    const record = await this.mustGetRecord(instance.businessRecordId);
    this.assertRecordVisible(record, user);

    return this.toApprovalInstanceResponse(instance);
  }

  async reconcileApprovals(dto: WorkbenchApprovalReconcileDto, user: CurrentUser) {
    this.assertSystemAdmin(user);

    const instances = await this.approvalSyncRepository.find({
      where: { processInstanceId: In(dto.processInstanceIds) },
    });
    const instanceMap = new Map(instances.map((instance) => [instance.processInstanceId, instance]));

    const reconciled: string[] = [];
    for (const processInstanceId of dto.processInstanceIds) {
      const instance = instanceMap.get(processInstanceId);
      if (!instance) {
        continue;
      }

      const record = await this.mustGetRecord(instance.businessRecordId);
      this.assertRecordVisible(record, user);

      instance.lastReconciledAt = new Date();
      instance.approvalSyncStatus = 'reconciled';
      instance.syncErrorCode = null;
      instance.syncErrorMessage = null;
      reconciled.push(processInstanceId);

      await this.appendActionLog(record.id, {
        actionType: 'approval_reconcile',
        source: 'reconcile',
        operatorUserId: user.userId,
        fromStatus: record.status,
        toStatus: record.status,
        comment: dto.reason ?? null,
        payloadDigest: JSON.stringify({ processInstanceId }),
      });
    }

    if (instances.length > 0) {
      await this.approvalSyncRepository.save(instances);
    }

    return {
      acceptedCount: reconciled.length,
      processInstanceIds: reconciled,
      queuedAt: new Date().toISOString(),
    };
  }

  async retryApproval(dto: WorkbenchApprovalRetryDto, user: CurrentUser) {
    this.assertSystemAdmin(user);

    const strategy = dto.strategy ?? 'full_reconcile';
    const instance = await this.approvalSyncRepository.findOne({
      where: { processInstanceId: dto.processInstanceId },
    });
    if (!instance) {
      throw new NotFoundException('approval instance not found');
    }

    const record = await this.mustGetRecord(instance.businessRecordId);
    this.assertRecordVisible(record, user);

    instance.retryCount += 1;
    instance.lastRetryAt = new Date();
    instance.approvalSyncStatus = 'retrying';
    instance.syncErrorCode = null;
    instance.syncErrorMessage = null;

    if (strategy === 'full_reconcile') {
      instance.lastReconciledAt = new Date();
    }

    await this.approvalSyncRepository.save(instance);

    await this.appendActionLog(record.id, {
      actionType: 'approval_retry',
      source: 'system',
      operatorUserId: user.userId,
      fromStatus: record.status,
      toStatus: record.status,
      comment: dto.reason ?? null,
      payloadDigest: JSON.stringify({ processInstanceId: dto.processInstanceId, strategy }),
    });
    this.logger.log(`approval retry queued: process=${dto.processInstanceId}, strategy=${strategy}, by=${user.userId}`);

    return {
      processInstanceId: dto.processInstanceId,
      accepted: true,
      strategy,
      queuedAt: new Date().toISOString(),
    };
  }

  private toApprovalInstanceResponse(instance: WecomApprovalInstanceSyncEntity) {
    return {
      processInstanceId: instance.processInstanceId,
      businessRecordId: instance.businessRecordId,
      moduleCode: instance.moduleCode,
      externalStatus: instance.externalStatus,
      mirrorStatus: instance.internalMirrorStatus,
      approvalSyncStatus: instance.approvalSyncStatus,
      startedAt: instance.startedAt.toISOString(),
      lastCallbackAt: instance.lastCallbackAt ? instance.lastCallbackAt.toISOString() : null,
      lastReconciledAt: instance.lastReconciledAt ? instance.lastReconciledAt.toISOString() : null,
      callbackVersion: instance.callbackVersion,
      retryCount: instance.retryCount,
      syncErrorCode: instance.syncErrorCode,
      syncErrorMessage: instance.syncErrorMessage,
    };
  }

  private verifyCallbackSignature(dto: WorkbenchApprovalCallbackDto, meta: ApprovalCallbackRequestMeta) {
    this.verifyCallbackSourceIp(meta.requestIp);

    const signatureRequired = appEnv.WECOM_CALLBACK_SIGNATURE_REQUIRED;
    if (!meta.signature) {
      if (signatureRequired) {
        throw new BadRequestException('callback signature missing');
      }
      return;
    }
    if (!meta.timestamp || !meta.nonce) {
      throw new BadRequestException('callback signature params missing');
    }

    const requestTs = Number(meta.timestamp);
    if (!Number.isFinite(requestTs)) {
      throw new BadRequestException('callback timestamp invalid');
    }
    const nowSec = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSec - requestTs) > appEnv.WECOM_CALLBACK_MAX_SKEW_SECONDS) {
      throw new BadRequestException('callback request expired');
    }

    const signaturePayload =
      dto.encrypted && dto.encrypt
        ? dto.encrypt
        : this.sha1(
            JSON.stringify({
              eventId: dto.eventId,
              processInstanceId: dto.processInstanceId,
              callbackVersion: dto.callbackVersion,
              status: dto.status,
              encrypted: dto.encrypted ?? false,
              payload: dto.payload ?? {},
            }),
          );
    const raw = [appEnv.WECOM_CALLBACK_TOKEN, meta.timestamp, meta.nonce, signaturePayload].sort().join('');
    const expected = this.sha1(raw);
    const actual = meta.signature.trim();
    if (expected.length !== actual.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(actual))) {
      throw new BadRequestException('callback signature invalid');
    }
  }

  private verifyCallbackSourceIp(requestIp: string | null) {
    if (!appEnv.WECOM_CALLBACK_ALLOWED_IP_RANGES.length) {
      return;
    }
    const normalizedRequestIp = requestIp ? this.normalizeIp(requestIp) : null;
    if (!normalizedRequestIp) {
      throw new BadRequestException('callback request ip missing');
    }
    if (!appEnv.WECOM_CALLBACK_ALLOWED_IP_RANGES.some((range) => this.isIpInRange(normalizedRequestIp, range))) {
      throw new BadRequestException('callback request ip not allowed');
    }
  }

  private async registerCallbackEvent(dto: WorkbenchApprovalCallbackDto, meta: ApprovalCallbackRequestMeta, payloadDigest: string | null) {
    try {
      await this.callbackEventRepository.save(
        this.callbackEventRepository.create({
          eventId: dto.eventId,
          processInstanceId: dto.processInstanceId,
          callbackVersion: dto.callbackVersion,
          signature: meta.signature,
          requestTimestamp: meta.timestamp,
          requestNonce: meta.nonce,
          payloadDigest,
        }),
      );
      return true;
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        return false;
      }
      throw error;
    }
  }

  private isUniqueViolation(error: unknown) {
    if (typeof error !== 'object' || error === null) {
      return false;
    }
    const maybe = error as { code?: string; driverError?: { code?: string } };
    return maybe.code === '23505' || maybe.driverError?.code === '23505';
  }

  private sha1(value: string) {
    return createHash('sha1').update(value).digest('hex');
  }

  private isIpInRange(ip: string, cidr: string) {
    const normalizedIp = this.normalizeIp(ip);
    const normalizedCidr = cidr.trim();
    if (!normalizedIp || !normalizedCidr) {
      return false;
    }
    if (!normalizedCidr.includes('/')) {
      return normalizedIp === this.normalizeIp(normalizedCidr);
    }

    const [rangeIp, prefixText] = normalizedCidr.split('/');
    if (!rangeIp) {
      return false;
    }
    const prefix = Number(prefixText);
    if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
      return false;
    }

    const ipInt = this.toIpv4Int(normalizedIp);
    const rangeInt = this.toIpv4Int(this.normalizeIp(rangeIp));
    if (ipInt === null || rangeInt === null) {
      return false;
    }

    const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
    return (ipInt & mask) === (rangeInt & mask);
  }

  private toIpv4Int(ip: string) {
    const parts = ip.split('.').map((part) => Number(part));
    if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
      return null;
    }
    const [part0, part1, part2, part3] = parts as [number, number, number, number];
    return (((part0 << 24) >>> 0) + ((part1 << 16) >>> 0) + ((part2 << 8) >>> 0) + part3) >>> 0;
  }

  private normalizeApprovalCallbackDto(dto: WorkbenchApprovalCallbackDto): WorkbenchApprovalCallbackDto {
    if (!dto.encrypted) {
      return dto;
    }
    const encryptedPayload = dto.encrypt;
    if (!encryptedPayload) {
      throw new BadRequestException('decrypt_failed');
    }
    const decrypted = this.decryptCallbackPayload(encryptedPayload);
    const parsed = this.parseDecryptedCallbackPayload(decrypted);

    return {
      ...dto,
      eventId: parsed.eventId ?? dto.eventId,
      processInstanceId: parsed.processInstanceId ?? dto.processInstanceId,
      status: parsed.status ?? dto.status,
      callbackVersion: parsed.callbackVersion ?? dto.callbackVersion,
      payload: parsed.payload ?? dto.payload,
    };
  }

  private decryptCallbackPayload(encryptedPayload: string) {
    if (!appEnv.WECOM_ENCODING_AES_KEY) {
      throw new BadRequestException('decrypt_failed');
    }
    try {
      const aesKey = Buffer.from(`${appEnv.WECOM_ENCODING_AES_KEY}=`, 'base64');
      const iv = aesKey.subarray(0, 16);
      const decipher = createDecipheriv('aes-256-cbc', aesKey, iv);
      decipher.setAutoPadding(false);
      const encryptedBuffer = Buffer.from(encryptedPayload, 'base64');
      const decrypted = Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
      const unpadded = this.pkcs7Unpad(decrypted);
      const content = unpadded.subarray(16);
      const msgLength = content.readUInt32BE(0);
      const message = content.subarray(4, 4 + msgLength).toString('utf8');
      const corpId = content.subarray(4 + msgLength).toString('utf8');

      if (corpId && corpId !== appEnv.WECOM_CORP_ID) {
        throw new BadRequestException('decrypt_failed');
      }
      return message;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('decrypt_failed');
    }
  }

  private pkcs7Unpad(buffer: Buffer) {
    if (buffer.length === 0) {
      throw new BadRequestException('decrypt_failed');
    }
    const pad = buffer.at(-1);
    if (pad === undefined) {
      throw new BadRequestException('decrypt_failed');
    }
    if (pad <= 0 || pad > 32 || pad > buffer.length) {
      throw new BadRequestException('decrypt_failed');
    }
    return buffer.subarray(0, buffer.length - pad);
  }

  private parseDecryptedCallbackPayload(raw: string) {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const callbackVersionCandidate = parsed.callbackVersion;
      return {
        eventId: typeof parsed.eventId === 'string' ? parsed.eventId : undefined,
        processInstanceId: typeof parsed.processInstanceId === 'string' ? parsed.processInstanceId : undefined,
        status: this.normalizeCallbackStatus(typeof parsed.status === 'string' ? parsed.status : undefined),
        callbackVersion:
          typeof callbackVersionCandidate === 'number'
            ? callbackVersionCandidate
            : typeof callbackVersionCandidate === 'string'
              ? Number(callbackVersionCandidate)
              : undefined,
        payload: typeof parsed.payload === 'object' && parsed.payload !== null ? (parsed.payload as Record<string, unknown>) : undefined,
      };
    } catch {
      const read = (tag: string) => {
        const matched = raw.match(new RegExp(`<${tag}><!\\[CDATA\\[(.*?)\\]\\]><\\/${tag}>|<${tag}>(.*?)<\\/${tag}>`, 'i'));
        return matched?.[1] ?? matched?.[2] ?? undefined;
      };

      const callbackVersionText = read('CallbackVersion');
      const callbackVersion = callbackVersionText ? Number(callbackVersionText) : undefined;
      return {
        eventId: read('EventID'),
        processInstanceId: read('ProcessInstanceId'),
        status: this.normalizeCallbackStatus(read('Status')),
        callbackVersion: Number.isFinite(callbackVersion) ? callbackVersion : undefined,
        payload: undefined,
      };
    }
  }

  private normalizeCallbackStatus(status: string | undefined): WorkbenchApprovalCallbackDto['status'] | undefined {
    if (!status) {
      return undefined;
    }
    const normalized = status.toLowerCase();
    if (normalized === 'pending' || normalized === 'approved' || normalized === 'rejected' || normalized === 'canceled' || normalized === 'terminated') {
      return normalized;
    }
    return undefined;
  }

  private normalizeIp(ip: string) {
    const trimmed = ip.trim();
    if (!trimmed) {
      return '';
    }
    const first = trimmed.split(',')[0]?.trim() ?? trimmed;
    const mapped = first.startsWith('::ffff:') ? first.slice(7) : first;
    if (mapped.startsWith('[') && mapped.includes(']')) {
      const idx = mapped.indexOf(']');
      return mapped.slice(1, idx).trim();
    }
    if (mapped.includes('.') && mapped.includes(':')) {
      return mapped.split(':')[0]?.trim() ?? mapped;
    }
    return mapped;
  }

  private assertSystemAdmin(user: CurrentUser) {
    if (!user.roles.includes('system_admin')) {
      throw new ForbiddenException('forbidden');
    }
  }

  private assertAttendanceAdmin(user: CurrentUser) {
    if (user.roles.includes('system_admin') || user.roles.includes('general_office') || user.roles.includes('finance')) {
      return;
    }
    throw new ForbiddenException('forbidden');
  }

  private listVisibleModules(user: CurrentUser) {
    return WORKBENCH_MODULES.filter((moduleItem) => !moduleItem.legacyOnly && this.hasRoleAccess(user, moduleItem.visibleRoles)).sort(
      (a, b) => a.sortOrder - b.sortOrder,
    );
  }

  private listReadableModules(user: CurrentUser) {
    return WORKBENCH_MODULES.filter((moduleItem) => this.hasRoleAccess(user, moduleItem.visibleRoles)).sort((a, b) => a.sortOrder - b.sortOrder);
  }

  private async listVisibleRecords(user: CurrentUser) {
    const visibleModules = this.listReadableModules(user);
    const moduleCodes = visibleModules.map((moduleItem) => moduleItem.moduleCode);
    if (moduleCodes.length === 0) {
      return [];
    }

    const records = await this.recordRepository.find({
      where: {
        moduleCode: In(moduleCodes),
      },
      order: {
        occurredAt: 'DESC',
      },
    });

    return records.map((record) => this.toRecordModel(record));
  }

  private async computePendingCounts(user: CurrentUser) {
    const moduleCodes = this.listVisibleModules(user).map((moduleItem) => moduleItem.moduleCode);
    if (moduleCodes.length === 0) {
      return new Map<string, number>();
    }

    const rows = (await this.recordRepository
      .createQueryBuilder('record')
      .select('record.module_code', 'moduleCode')
      .addSelect('COUNT(*)', 'pendingCount')
      .where('record.module_code IN (:...moduleCodes)', { moduleCodes })
      .andWhere('record.status IN (:...statuses)', { statuses: [...PENDING_STATUSES] })
      .groupBy('record.module_code')
      .getRawMany()) as Array<{ modulecode?: string; moduleCode?: string; pendingcount?: string; pendingCount?: string }>;

    const result = new Map<string, number>();
    for (const row of rows) {
      const moduleCode = row.moduleCode ?? row.modulecode;
      const pendingCount = Number(row.pendingCount ?? row.pendingcount ?? 0);
      if (moduleCode) {
        result.set(moduleCode, pendingCount);
      }
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

  private async mustGetRecord(recordId: string) {
    const record = await this.recordRepository.findOne({ where: { id: recordId } });
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

  private assertRecordVisible(record: WorkbenchRecordEntity, user: CurrentUser) {
    const moduleItem = this.mustGetModule(record.moduleCode);
    if (!this.hasRoleAccess(user, moduleItem.visibleRoles)) {
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
      recordSource: record.recordSource,
    };
  }

  private toRecordModel(record: WorkbenchRecordEntity, steps: WorkbenchStep[] = [], attachments: WorkbenchAttachment[] = [], actionLogs: WorkbenchActionLog[] = []) {
    const moduleItem = this.mustGetModule(record.moduleCode);
    return {
      id: record.id,
      moduleCode: record.moduleCode,
      templateCode: record.templateCode,
      title: record.title,
      summary: record.summary,
      status: record.status,
      vesselId: record.vesselId,
      occurredAt: record.occurredAt.toISOString(),
      approvalChannel: record.approvalChannel as ApprovalChannel,
      recordSource: (record.recordSource as 'manual' | 'callback' | 'reconcile') ?? 'manual',
      externalProcessInstanceId: record.externalProcessInstanceId,
      externalStatus: record.externalStatus,
      ownerUserId: record.ownerUserId,
      visibleRoles: [...moduleItem.visibleRoles],
      payload: record.payload ?? {},
      steps,
      attachments,
      actionLogs,
    };
  }

  private async hydrateRecord(record: WorkbenchRecordEntity) {
    const [steps, attachments, actionLogs] = await Promise.all([
      this.stepRepository.find({ where: { businessRecordId: record.id }, order: { sequenceNo: 'ASC', createdAt: 'ASC' } }),
      this.attachmentRepository.find({ where: { businessRecordId: record.id }, order: { uploadedAt: 'DESC', createdAt: 'DESC' } }),
      this.actionLogRepository.find({ where: { businessRecordId: record.id }, order: { createdAt: 'DESC' } }),
    ]);

    return this.toRecordModel(
      record,
      steps.map((item) => ({
        stepCode: item.stepCode,
        stepName: item.stepName,
        status: item.status as WorkbenchStep['status'],
        rectificationRequired: item.rectificationRequired,
        rectificationStatus: item.rectificationStatus,
      })),
      attachments.map((item) => ({
        id: item.id,
        category: item.category,
        fileId: item.fileId,
        fileName: item.fileName,
        uploadedAt: item.uploadedAt.toISOString(),
      })),
      actionLogs.map((item) => ({
        id: item.id,
        actionType: item.actionType,
        source: item.source,
        operatorUserId: item.operatorUserId ?? 'system',
        fromStatus: item.fromStatus ?? '',
        toStatus: item.toStatus ?? '',
        comment: item.comment,
        createdAt: item.createdAt.toISOString(),
      })),
    );
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

  private async appendActionLog(
    businessRecordId: string,
    log: {
      actionType: string;
      source: string;
      operatorUserId: string | null;
      fromStatus: string | null;
      toStatus: string | null;
      comment: string | null;
      payloadDigest: string | null;
    },
  ) {
    await this.actionLogRepository.save(
      this.actionLogRepository.create({
        businessRecordId,
        actionType: log.actionType,
        source: log.source,
        operatorUserId: log.operatorUserId,
        fromStatus: log.fromStatus,
        toStatus: log.toStatus,
        comment: log.comment,
        payloadDigest: log.payloadDigest,
      }),
    );
  }

  private buildRecordNo() {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, '0');
    const d = String(now.getUTCDate()).padStart(2, '0');
    const randomSuffix = randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
    return `WB${y}${m}${d}${randomSuffix}`;
  }
}
