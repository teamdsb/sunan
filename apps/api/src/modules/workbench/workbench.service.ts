import { BadGatewayException, BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createDecipheriv, createHash, randomUUID, timingSafeEqual } from 'crypto';
import { readFileSync } from 'fs';
import { appEnv } from 'src/config/env';
import { CurrentUser } from 'src/common/interfaces/current-user.interface';
import { FileEntity } from 'src/database/entities/file.entity';
import { EvidenceRecordEntity } from 'src/database/entities/evidence-record.entity';
import { ExportJobEntity } from 'src/database/entities/export-job.entity';
import { WecomApprovalCallbackEventEntity } from 'src/database/entities/wecom-approval-callback-event.entity';
import { WecomApprovalInstanceSyncEntity } from 'src/database/entities/wecom-approval-instance-sync.entity';
import { WecomApprovalTemplateBindingEntity } from 'src/database/entities/wecom-approval-template-binding.entity';
import { WorkbenchModuleEntity } from 'src/database/entities/workbench-module.entity';
import { WorkbenchPrintSnapshotEntity } from 'src/database/entities/workbench-print-snapshot.entity';
import { WorkbenchRecordActionLogEntity } from 'src/database/entities/workbench-record-action-log.entity';
import { WorkbenchRecordAttachmentEntity } from 'src/database/entities/workbench-record-attachment.entity';
import { WorkbenchRecordEntity } from 'src/database/entities/workbench-record.entity';
import { WorkbenchRecordParticipantEntity } from 'src/database/entities/workbench-record-participant.entity';
import { WorkbenchRecordStepEntity } from 'src/database/entities/workbench-record-step.entity';
import { WorkbenchRecordTransferEntity } from 'src/database/entities/workbench-record-transfer.entity';
import { WorkbenchDelegationEntity } from 'src/database/entities/workbench-delegation.entity';
import { WorkbenchTemplateEntity } from 'src/database/entities/workbench-template.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { OssService } from 'src/modules/files/oss.service';
import { WecomHttpGateway } from 'src/modules/wecom/wecom-http.gateway';
import { WecomTokenService } from 'src/modules/wecom/wecom-token.service';
import type { WecomApprovalTemplateCreateRequest } from 'src/modules/wecom/wecom.types';
import { In, IsNull, Repository } from 'typeorm';
import * as XLSX from 'xlsx';
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
import { WorkbenchRecordParticipantDto } from './dto/workbench-record-participant.dto';

type TemplateType =
  | 'ledger_form'
  | 'operation_flow'
  | 'inspection_rectification'
  | 'attendance_statistics'
  | 'service_asset'
  | 'wecom_approval';

type ApprovalChannel = 'internal' | 'wecom_native';

type LaunchStatus = 'queued' | 'prepared' | 'started';

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
  enabled?: boolean;
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

interface WecomApprovalLaunchConfig {
  oaType: '10001';
  templateId: string;
  thirdNo: string;
  extData: {
    fieldList: Array<{
      title: string;
      type: 'text' | 'link';
      value: string;
    }>;
  };
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

type PrintPaperSize = 'A4' | 'A3';

const PENDING_STATUSES = new Set(['submitted', 'assigned', 'in_progress', 'pending_review', 'approval_pending', 'rework_required']);
const WORKBENCH_TEMPLATE_TYPES: TemplateType[] = [
  'ledger_form',
  'operation_flow',
  'inspection_rectification',
  'attendance_statistics',
  'service_asset',
  'wecom_approval',
];
const PDF_A4_PAGE_WIDTH = 595;
const PDF_A4_PAGE_HEIGHT = 842;
const PDF_A3_PAGE_WIDTH = 842;
const PDF_A3_PAGE_HEIGHT = 1191;
const PDF_MARGIN_LEFT = 56;
const PDF_MARGIN_TOP = 48;
const PDF_LINE_HEIGHT = 20;
const PDF_MAX_LINES_PER_PAGE = 35;

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
    moduleCode: 'finance_business_board',
    moduleName: '财务部财务板块',
    departmentCode: 'finance',
    templateType: 'ledger_form',
    requiresApproval: true,
    supportsPrint: true,
    supportsStatistics: true,
    mobileFirst: true,
    sortOrder: 131,
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
    requiresApproval: true,
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
    requiresApproval: true,
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
    requiresApproval: true,
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
    requiresApproval: true,
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
    requiresApproval: true,
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
    templateType: 'service_asset',
    requiresApproval: true,
    supportsPrint: true,
    supportsStatistics: true,
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
    legacyOnly: true,
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
    requiresApproval: true,
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
          { key: 'learningStatus', label: '学习状态', required: true, inputType: 'text', placeholder: 'not_started/in_progress/completed' },
          { key: 'learningProgressPercent', label: '学习进度(%)', required: true, inputType: 'number' },
          { key: 'completedAt', label: '完成时间', required: false, inputType: 'date' },
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
          { key: 'signInCount', label: '签到人数', required: true, inputType: 'number' },
          { key: 'photoAttachmentIds', label: '会议照片附件ID列表', required: false, inputType: 'textarea', placeholder: '逗号分隔的 fileId 列表' },
          { key: 'retentionUntil', label: '资料留存截止日期', required: false, inputType: 'date' },
          { key: 'wecomGroupChatId', label: '企业微信群ID', required: false, inputType: 'text' },
          { key: 'wecomGroupChatLink', label: '企业微信群链接', required: false, inputType: 'text' },
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
          { key: 'vesselType', label: '船舶类型', required: true, inputType: 'text' },
          { key: 'grossTonnage', label: '总吨', required: true, inputType: 'number' },
          { key: 'agreementNo', label: '协议编号', required: true, inputType: 'text' },
          { key: 'fee', label: '费用', required: true, inputType: 'number' },
          { key: 'chargeMode', label: '收费方式', required: true, inputType: 'text' },
          { key: 'berth', label: '靠泊泊位', required: true, inputType: 'text' },
          { key: 'cargoType', label: '装货类型', required: true, inputType: 'text' },
          { key: 'serviceOwner', label: '业务经手人', required: true, inputType: 'text' },
          { key: 'teamLead', label: '带班领导', required: true, inputType: 'text' },
          { key: 'signDate', label: '签订日期', required: true, inputType: 'date' },
          { key: 'watchVessel', label: '值守船舶', required: true, inputType: 'text' },
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
          { key: 'berthTerminal', label: '靠泊码头', required: true, inputType: 'text' },
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
  finance_business_board: {
    moduleCode: 'finance_business_board',
    templateType: 'ledger_form',
    sections: [
      {
        key: 'financeBusiness',
        title: '财务业务台账',
        fields: [
          { key: 'voucherNo', label: '业务单据号', required: true, inputType: 'text' },
          { key: 'businessDate', label: '业务日期', required: true, inputType: 'date' },
          { key: 'counterpartyName', label: '往来单位', required: true, inputType: 'text' },
          { key: 'businessCategory', label: '业务类别', required: true, inputType: 'text' },
          { key: 'amount', label: '本次金额', required: true, inputType: 'number' },
          { key: 'taxAmount', label: '税额', required: false, inputType: 'number' },
          { key: 'settlementMethod', label: '结算方式', required: true, inputType: 'text' },
          { key: 'costCenter', label: '成本中心', required: true, inputType: 'text' },
          { key: 'invoiceStatus', label: '发票状态', required: true, inputType: 'text' },
          { key: 'relatedModuleCode', label: '关联业务模块', required: false, inputType: 'text' },
          { key: 'attachmentList', label: '附件清单', required: false, inputType: 'textarea' },
          { key: 'remark', label: '备注', required: false, inputType: 'textarea' },
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
          { key: 'nationality', label: '国籍', required: true, inputType: 'text' },
          { key: 'berth', label: '泊位', required: true, inputType: 'text' },
          { key: 'quantity', label: '接收数量', required: true, inputType: 'number' },
          { key: 'documentNo', label: '单证编号', required: true, inputType: 'text' },
          { key: 'voyageNo', label: '航次', required: true, inputType: 'text' },
          { key: 'fee', label: '费用', required: true, inputType: 'number' },
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
          { key: 'nationality', label: '国籍', required: true, inputType: 'text' },
          { key: 'berth', label: '泊位', required: true, inputType: 'text' },
          { key: 'quantity', label: '接收数量', required: true, inputType: 'number' },
          { key: 'documentNo', label: '单证编号', required: true, inputType: 'text' },
          { key: 'voyageNo', label: '航次', required: true, inputType: 'text' },
          { key: 'fee', label: '费用', required: true, inputType: 'number' },
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
          { key: 'nationality', label: '国籍', required: true, inputType: 'text' },
          { key: 'berth', label: '泊位', required: true, inputType: 'text' },
          { key: 'quantity', label: '接收数量', required: true, inputType: 'number' },
          { key: 'documentNo', label: '单证编号', required: true, inputType: 'text' },
          { key: 'voyageNo', label: '航次', required: true, inputType: 'text' },
          { key: 'fee', label: '费用', required: true, inputType: 'number' },
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
  shipping_fuel_bunkering_approval: {
    moduleCode: 'shipping_fuel_bunkering_approval',
    templateType: 'service_asset',
    sections: [
      {
        key: 'fuel',
        title: '燃油加注与油耗月报',
        fields: [
          { key: 'vesselName', label: '船舶名称', required: true, inputType: 'text' },
          { key: 'fuelType', label: '燃油类型', required: true, inputType: 'text' },
          { key: 'bunkeringDate', label: '加油日期', required: true, inputType: 'date' },
          { key: 'bunkeringAmount', label: '本次加油量', required: true, inputType: 'number' },
          { key: 'remainingFuelAmount', label: '剩余油量', required: true, inputType: 'number' },
          { key: 'monthlyFuelConsumption', label: '月油耗', required: true, inputType: 'number' },
          { key: 'reportMonth', label: '月报月份', required: true, inputType: 'text', placeholder: 'YYYY-MM' },
          { key: 'requestedAmount', label: '申请加注量', required: false, inputType: 'number' },
          { key: 'reason', label: '申请原因', required: true, inputType: 'textarea' },
          { key: 'remark', label: '备注', required: false, inputType: 'textarea' },
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
};

const WORKBENCH_MODULE_DEFAULTS = new Map(WORKBENCH_MODULES.map((moduleItem) => [moduleItem.moduleCode, moduleItem]));
const MODULE_SCHEMA_DEFINITIONS: Record<string, ModuleSchemaDefinition> = {
  ...LEDGER_MODULE_SCHEMAS,
  ...OPERATION_FLOW_MODULE_SCHEMAS,
  ...INSPECTION_RECTIFICATION_MODULE_SCHEMAS,
  ...ATTENDANCE_MODULE_SCHEMAS,
  ...SERVICE_ASSET_MODULE_SCHEMAS,
  ...WECOM_APPROVAL_MODULE_SCHEMAS,
};

@Injectable()
export class WorkbenchService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorkbenchService.name);
  private exportWorkerTimer: ReturnType<typeof setInterval> | null = null;
  private isShuttingDown = false;

  constructor(
    @InjectRepository(WorkbenchModuleEntity)
    private readonly moduleRepository: Repository<WorkbenchModuleEntity>,
    @InjectRepository(WorkbenchTemplateEntity)
    private readonly templateRepository: Repository<WorkbenchTemplateEntity>,
    @InjectRepository(WorkbenchRecordEntity)
    private readonly recordRepository: Repository<WorkbenchRecordEntity>,
    @InjectRepository(WorkbenchRecordStepEntity)
    private readonly stepRepository: Repository<WorkbenchRecordStepEntity>,
    @InjectRepository(WorkbenchRecordParticipantEntity)
    private readonly participantRepository: Repository<WorkbenchRecordParticipantEntity>,
    @InjectRepository(WorkbenchDelegationEntity)
    private readonly delegationRepository: Repository<WorkbenchDelegationEntity>,
    @InjectRepository(WorkbenchRecordTransferEntity)
    private readonly transferRepository: Repository<WorkbenchRecordTransferEntity>,
    @InjectRepository(WorkbenchRecordAttachmentEntity)
    private readonly attachmentRepository: Repository<WorkbenchRecordAttachmentEntity>,
    @InjectRepository(WorkbenchRecordActionLogEntity)
    private readonly actionLogRepository: Repository<WorkbenchRecordActionLogEntity>,
    @InjectRepository(WorkbenchPrintSnapshotEntity)
    private readonly printSnapshotRepository: Repository<WorkbenchPrintSnapshotEntity>,
    @InjectRepository(WecomApprovalTemplateBindingEntity)
    private readonly approvalTemplateBindingRepository: Repository<WecomApprovalTemplateBindingEntity>,
    @InjectRepository(WecomApprovalInstanceSyncEntity)
    private readonly approvalSyncRepository: Repository<WecomApprovalInstanceSyncEntity>,
    @InjectRepository(WecomApprovalCallbackEventEntity)
    private readonly callbackEventRepository: Repository<WecomApprovalCallbackEventEntity>,
    @InjectRepository(FileEntity)
    private readonly fileRepository: Repository<FileEntity>,
    @InjectRepository(EvidenceRecordEntity)
    private readonly evidenceRepository: Repository<EvidenceRecordEntity>,
    @InjectRepository(ExportJobEntity)
    private readonly exportJobRepository: Repository<ExportJobEntity>,
    private readonly ossService: OssService,
    private readonly wecomTokenService: WecomTokenService,
    private readonly wecomHttpGateway: WecomHttpGateway,
  ) {}

  async onModuleInit() {
    await this.syncRuntimeCatalog();
    await this.recoverExportJobs();
    this.exportWorkerTimer = setInterval(() => void this.recoverExportJobs().catch((error) => this.logger.warn(`export worker recovery failed: ${error instanceof Error ? error.message : 'unknown error'}`)), 10_000);
    this.exportWorkerTimer.unref?.();
  }

  onModuleDestroy() {
    this.isShuttingDown = true;
    if (this.exportWorkerTimer) clearInterval(this.exportWorkerTimer);
    this.exportWorkerTimer = null;
  }

  async listModules(user: CurrentUser) {
    const visibleModules = await this.listVisibleModules(user);
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
    const moduleItem = await this.mustGetModule(moduleCode);
    if (moduleItem.legacyOnly) {
      throw new NotFoundException('module schema not found');
    }
    if (!this.hasRoleAccess(user, moduleItem.visibleRoles)) {
      throw new ForbiddenException('forbidden');
    }

    const { schemaDefinition } = await this.mustGetModuleTemplate(moduleItem);
    return schemaDefinition;
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

    const runtimeModules = await this.listRuntimeModules();
    const attendanceModules = runtimeModules.filter((moduleItem) => moduleItem.templateType === 'attendance_statistics' && !moduleItem.legacyOnly);
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
      const moduleItem = runtimeModules.find((item) => item.moduleCode === moduleCode) ?? WORKBENCH_MODULE_DEFAULTS.get(moduleCode);
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
    const job = await this.exportJobRepository.save(this.exportJobRepository.create({ sourceType: 'attendance', sourceId: month, querySnapshot: { month, departmentCode: query.departmentCode ?? null }, exportFormat, status: 'queued', resultFileId: null, failureMessage: null, retryCount: 0, requestedBy: user.userId, startedAt: null, finishedAt: null }));
    void this.runAttendanceExport(job.id);

    this.logger.log(
      `attendance export queued: month=${month}, format=${exportFormat}, department=${query.departmentCode ?? 'all'}, job=${job.id}`,
    );

    return {
      exportJobId: job.id,
      status: 'queued' as const,
      month,
      downloadFileId: null,
    };
  }

  async getExportJob(jobId: string, user: CurrentUser) {
    this.assertAttendanceAdmin(user);
    const job = await this.exportJobRepository.findOne({ where: { id: jobId, sourceType: 'attendance' } });
    if (!job) throw new NotFoundException('export job not found');
    return this.toExportJob(job);
  }

  async retryExportJob(jobId: string, user: CurrentUser) {
    this.assertAttendanceAdmin(user);
    const job = await this.exportJobRepository.findOne({ where: { id: jobId, sourceType: 'attendance' } });
    if (!job) throw new NotFoundException('export job not found');
    if (job.status !== 'failed') throw new ConflictException('only failed export job can be retried');
    Object.assign(job, { status: 'queued', resultFileId: null, failureMessage: null, retryCount: job.retryCount + 1, startedAt: null, finishedAt: null });
    await this.exportJobRepository.save(job); void this.runAttendanceExport(job.id);
    return this.toExportJob(job);
  }

  async getExportDownloadUrl(jobId: string, user: CurrentUser) {
    const job = await this.exportJobRepository.findOne({ where: { id: jobId, sourceType: 'attendance' } });
    this.assertAttendanceAdmin(user);
    if (!job || job.status !== 'succeeded' || !job.resultFileId) throw new NotFoundException('export result not found');
    const file = await this.fileRepository.findOne({ where: { id: job.resultFileId } });
    if (!file) throw new NotFoundException('export file not found');
    return this.ossService.createDownloadSignature(file.ossKey);
  }

  private async runAttendanceExport(jobId: string): Promise<void> {
    const job = await this.exportJobRepository.findOne({ where: { id: jobId, status: 'queued' } });
    if (!job) return;
    job.status = 'running'; job.startedAt = new Date(); await this.exportJobRepository.save(job);
    try {
      const month = String(job.querySnapshot.month ?? '');
      const content = `month,departmentCode,generatedAt\n${month},${String(job.querySnapshot.departmentCode ?? '')},${new Date().toISOString()}\n`;
      const isPdf = job.exportFormat === 'pdf';
      const extension = isPdf ? 'pdf' : 'xlsx';
      const mimeType = isPdf ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const buffer = isPdf ? this.buildPdf({ title: 'Attendance Export', lines: content.trim().split('\n'), paperSize: 'A4' }) : this.buildAttendanceWorkbook(month, String(job.querySnapshot.departmentCode ?? ''));
      const ossKey = `workbench/exports/${new Date().getUTCFullYear()}/${String(new Date().getUTCMonth() + 1).padStart(2, '0')}/${randomUUID()}.${extension}`;
      await this.ossService.uploadBuffer(ossKey, buffer, mimeType, `attendance-${month}.${extension}`);
      const file = await this.fileRepository.save(this.fileRepository.create({ ossKey, fileName: `attendance-${month}.${extension}`, mimeType, fileSize: buffer.length, category: 'workbench_export', uploadedBy: job.requestedBy }));
      Object.assign(job, { status: 'succeeded', resultFileId: file.id, finishedAt: new Date(), failureMessage: null }); await this.exportJobRepository.save(job);
    } catch (error) { Object.assign(job, { status: 'failed', finishedAt: new Date(), failureMessage: error instanceof Error ? error.message : 'export failed' }); await this.exportJobRepository.save(job); }
  }

  private buildAttendanceWorkbook(month: string, departmentCode: string): Buffer {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet([{ month, departmentCode, generatedAt: new Date().toISOString() }]);
    XLSX.utils.book_append_sheet(workbook, sheet, '考勤导出');
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  private async recoverExportJobs(): Promise<void> {
    if (this.isShuttingDown) return;
    const running = await this.exportJobRepository.find({ where: { status: 'running', sourceType: 'attendance' } });
    for (const job of running) {
      job.status = 'failed'; job.finishedAt = new Date(); job.failureMessage = 'worker interrupted; retry export';
      await this.exportJobRepository.save(job);
    }
    const queued = await this.exportJobRepository.find({ where: { status: 'queued', sourceType: 'attendance' }, order: { requestedAt: 'ASC' }, take: 10 });
    for (const job of queued) void this.runAttendanceExport(job.id);
  }

  private toExportJob(job: ExportJobEntity) { return { id: job.id, status: job.status, exportFormat: job.exportFormat, resultFileId: job.resultFileId, failureMessage: job.failureMessage, retryCount: job.retryCount, requestedAt: job.requestedAt.toISOString(), startedAt: job.startedAt?.toISOString() ?? null, finishedAt: job.finishedAt?.toISOString() ?? null }; }

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
      const runtimeModules = await this.listRuntimeModules();
      const allowedModuleCodes = new Set(
        runtimeModules.filter((moduleItem) => moduleItem.templateType === query.templateType).map((moduleItem) => moduleItem.moduleCode),
      );
      records = records.filter((record) => allowedModuleCodes.has(record.moduleCode));
    }

    if (query.requiresApproval !== undefined) {
      const runtimeModules = await this.listRuntimeModules();
      const approvalModuleCodes = new Set(
        runtimeModules.filter((moduleItem) => moduleItem.requiresApproval === query.requiresApproval).map((moduleItem) => moduleItem.moduleCode),
      );
      records = records.filter((record) => approvalModuleCodes.has(record.moduleCode));
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
    const moduleItem = await this.mustGetModule(dto.moduleCode);
    if (moduleItem.legacyOnly) {
      throw new BadRequestException('legacy module is read-only');
    }
    if (!this.hasRoleAccess(user, moduleItem.visibleRoles)) {
      throw new ForbiddenException('forbidden');
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

    const { schemaDefinition, templateCode } = await this.mustGetModuleTemplate(moduleItem);
    const normalizedPayload = this.normalizeCreatePayload(dto.moduleCode, dto.payload);
    this.assertPayloadMatchesSchema(normalizedPayload, schemaDefinition);

    const now = new Date();
    const steps = this.buildInitialSteps(schemaDefinition);
    const initialStatus =
      moduleItem.templateType === 'ledger_form'
        ? 'draft'
        : moduleItem.templateType === 'attendance_statistics' || moduleItem.templateType === 'service_asset' || moduleItem.templateType === 'wecom_approval'
          ? 'submitted'
          : 'assigned';

    const recordEntity = this.recordRepository.create({
      moduleCode: dto.moduleCode,
      templateCode,
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
      payload: normalizedPayload,
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
      payloadDigest: normalizedPayload ? JSON.stringify(normalizedPayload) : null,
    });

    return this.getRecordDetail(savedRecord.id, user);
  }

  async getRecordDetail(recordId: string, user: CurrentUser) {
    const record = await this.mustGetRecord(recordId);
    await this.assertRecordVisible(record, user);
    if (user.roles.includes('system_admin')) {
      await this.appendActionLog(record.id, { actionType: 'sensitive_view', source: 'manual', operatorUserId: user.userId, fromStatus: record.status, toStatus: record.status, comment: 'administrator record access', payloadDigest: null });
    }
    const hydrated = await this.hydrateRecord(record);
    return { ...this.toRecordDetail(hydrated), availableActions: await this.getAvailableActions(record, user) };
  }

  async assignParticipant(recordId: string, dto: WorkbenchRecordParticipantDto, user: CurrentUser) {
    const record = await this.mustGetRecord(recordId);
    await this.assertRecordVisible(record, user);
    if (!user.roles.includes('system_admin') && record.ownerUserId !== user.userId && record.reviewerUserId !== user.userId) {
      throw new ForbiddenException('forbidden');
    }
    let stepId: string | null = null;
    if (dto.stepCode) {
      const step = await this.stepRepository.findOne({ where: { businessRecordId: recordId, stepCode: dto.stepCode } });
      if (!step) throw new NotFoundException('step not found');
      stepId = step.id;
      if (dto.completionRule) step.completionRule = dto.completionRule;
      if (dto.completionRule === 'quorum') step.quorumCount = dto.quorumCount ?? null;
      await this.stepRepository.save(step);
    }
    if (dto.role === 'verifier' && (dto.userId === record.assigneeUserId || dto.userId === record.ownerUserId)) {
      throw new BadRequestException('verifier cannot be the rectification owner');
    }
    const existing = await this.participantRepository.findOne({ where: { businessRecordId: recordId, stepId: stepId ?? IsNull(), userId: dto.userId, role: dto.role, deletedAt: IsNull() } });
    if (!existing) {
      await this.participantRepository.save(this.participantRepository.create({ businessRecordId: recordId, stepId, userId: dto.userId, role: dto.role, status: 'active', completedAt: null, createdBy: user.userId, updatedBy: user.userId }));
    }
    await this.appendActionLog(recordId, { actionType: 'assign_participant', source: 'manual', operatorUserId: user.userId, fromStatus: record.status, toStatus: record.status, comment: null, payloadDigest: JSON.stringify(dto) });
    return this.getRecordDetail(recordId, user);
  }

  async performRecordAction(recordId: string, dto: WorkbenchRecordActionDto, user: CurrentUser) {
    let record = await this.mustGetRecord(recordId);
    await this.assertRecordVisible(record, user);

    const steps = await this.stepRepository.find({
      where: { businessRecordId: record.id },
      order: { sequenceNo: 'ASC', createdAt: 'ASC' },
    });

    const fromStatus = record.status;

    await this.assertActionAuthorized(record, dto.actionType, dto.payload, user);
    this.assertLegalTransition(fromStatus, dto.actionType);

    const moduleItem = await this.mustGetModule(record.moduleCode);
    const isInspectionRectification = moduleItem.templateType === 'inspection_rectification';
    const { schemaDefinition } = await this.mustGetModuleTemplate(moduleItem);

    if (dto.actionType === 'update_payload') {
      if (!dto.payload || typeof dto.payload !== 'object') {
        throw new BadRequestException('payload is required for update_payload');
      }
      const mergedPayload = {
        ...(record.payload ?? {}),
        ...dto.payload,
      };
      const normalizedPayload = this.normalizeCreatePayload(record.moduleCode, mergedPayload);
      if (schemaDefinition) {
        this.assertPayloadMatchesSchema(normalizedPayload, schemaDefinition);
      }
      record.payload = normalizedPayload;
    } else if (dto.actionType === 'start' && steps.length > 0) {
      const firstPending = steps.find((step) => step.status === 'pending');
      if (firstPending) {
        firstPending.status = 'in_progress';
      }
      record.status = 'in_progress';
    } else if (dto.actionType === 'complete_step') {
      const stepCode = this.toScalarString(dto.payload?.stepCode).trim();
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
    } else if (dto.actionType === 'return_step') {
      const stepCode = this.toScalarString(dto.payload?.stepCode).trim();
      const step = steps.find((item) => item.stepCode === stepCode);
      if (!step) throw new NotFoundException('step not found');
      step.status = 'in_progress';
      step.completedBy = null;
      step.completedAt = null;
      record.status = 'in_progress';
    } else if (dto.actionType === 'terminate') {
      record.status = 'terminated';
    } else if (dto.actionType === 'void') {
      record.status = 'voided';
    } else if (dto.actionType === 'reopen') {
      record.status = 'assigned';
      record.closedAt = null;
    } else if (dto.actionType === 'delegate') {
      const delegateeUserId = this.toScalarString(dto.payload?.delegateeUserId).trim();
      const effectiveTo = this.toScalarString(dto.payload?.effectiveTo).trim();
      if (!delegateeUserId || !effectiveTo) throw new BadRequestException('delegateeUserId and effectiveTo are required');
      await this.delegationRepository.save(this.delegationRepository.create({ businessRecordId: record.id, stepId: null, delegatorUserId: user.userId, delegateeUserId, effectiveFrom: new Date(), effectiveTo: new Date(effectiveTo), status: 'active', reason: dto.comment ?? null, createdBy: user.userId, updatedBy: user.userId }));
    } else if (dto.actionType === 'transfer') {
      const toUserId = this.toScalarString(dto.payload?.toUserId).trim();
      if (!toUserId || toUserId === record.assigneeUserId) throw new BadRequestException('a different toUserId is required');
      await this.transferRepository.save(this.transferRepository.create({ businessRecordId: record.id, fromUserId: record.assigneeUserId ?? record.ownerUserId, toUserId, reason: dto.comment ?? '', transferredBy: user.userId }));
      record.assigneeUserId = toUserId;
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

    // 总经办培训模块在学习完成后自动发起审批，避免人工遗漏。
    let approvalLaunchConfig: WecomApprovalLaunchConfig | null = null;
    if (dto.actionType === 'update_payload') {
      approvalLaunchConfig = await this.tryAutoLaunchTrainingApproval(record, user);
      if (approvalLaunchConfig) {
        record = await this.mustGetRecord(record.id);
      }
    }

    return {
      recordId: record.id,
      status: record.status,
      acceptedAction: dto.actionType,
      approvalLaunchConfig,
    };
  }

  async uploadAttachment(recordId: string, dto: WorkbenchRecordUploadAttachmentDto, user: CurrentUser) {
    const record = await this.mustGetRecord(recordId);
    await this.assertRecordVisible(record, user);

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

    const file = await this.fileRepository.findOne({ where: { id: dto.fileId } });
    if (!file) {
      throw new NotFoundException('file not found');
    }

    const uploadedAt = new Date();
    const attachment = await this.attachmentRepository.save(
      this.attachmentRepository.create({
        businessRecordId: record.id,
        stepId,
        category: dto.category,
        fileId: file.id,
        fileName: file.fileName,
        mimeType: file.mimeType,
        storagePath: file.ossKey,
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

  async getPrintSnapshot(recordId: string, user: CurrentUser, paperSize: PrintPaperSize = 'A4') {
    const record = await this.mustGetRecord(recordId);
    await this.assertRecordVisible(record, user);
    const hydrated = await this.hydrateRecord(record);

    const renderedAt = new Date();
    const snapshotData = {
      title: hydrated.title,
      status: hydrated.status,
      moduleCode: hydrated.moduleCode,
      summary: hydrated.summary,
      payload: hydrated.payload,
      steps: hydrated.steps,
      attachments: hydrated.attachments,
      paperSize,
    };
    const pdfBuffer = this.buildWorkbenchPrintPdf(hydrated, snapshotData, renderedAt, paperSize);
    const printFile = await this.persistWorkbenchPrintPdf({
      fileName: `workbench-${hydrated.id}-${paperSize}.pdf`,
      buffer: pdfBuffer,
      uploadedBy: user.userId,
    });

    const snapshot = await this.printSnapshotRepository.save(
      this.printSnapshotRepository.create({
        businessRecordId: hydrated.id,
        templateVersion: 'v1',
        renderedFileId: printFile.id,
        renderedFormat: 'pdf',
        renderedAt,
        renderedBy: user.userId,
        snapshotData,
      }),
    );

    this.logger.log(`print snapshot generated: record=${hydrated.id}, snapshot=${snapshot.id}`);
    const protectedDownload = await this.ossService.createDownloadSignature(printFile.ossKey);

    return {
      recordId: hydrated.id,
      businessRecordId: hydrated.id,
      templateVersion: snapshot.templateVersion,
      renderedFileId: snapshot.renderedFileId,
      renderedFormat: snapshot.renderedFormat,
      paperSize,
      renderedAt: snapshot.renderedAt.toISOString(),
      downloadUrl: protectedDownload.downloadUrl,
      businessNo: hydrated.id,
      watermark: '苏南船舶 OA · 受控副本',
      snapshotData,
    };
  }

  async createSignatureEvidence(recordId: string, signatureFileId: string, hash: string, user: CurrentUser) {
    const record = await this.mustGetRecord(recordId); await this.assertRecordVisible(record, user);
    if (!/^[a-f0-9]{64}$/.test(hash)) throw new BadRequestException('invalid summary hash');
    if (!(await this.fileRepository.exist({ where: { id: signatureFileId } }))) throw new NotFoundException('signature file not found');
    return this.evidenceRepository.save(this.evidenceRepository.create({ businessType: 'workbench_record', businessId: recordId, evidenceType: 'signature', fileId: signatureFileId, summaryHash: hash, captureStatus: 'captured', capturedBy: user.userId, status: 'active', latitude: null, longitude: null, accuracyMeters: null, failureReason: null, addressText: null }));
  }

  async createLocationEvidence(recordId: string, body: { captureStatus: string; latitude?: number; longitude?: number; accuracyMeters?: number; failureReason?: string; addressText?: string }, user: CurrentUser) {
    const record = await this.mustGetRecord(recordId); await this.assertRecordVisible(record, user);
    const captured = body.captureStatus === 'captured';
    if (!['captured', 'manual', 'denied', 'sdk_failed'].includes(body.captureStatus) || (captured && (body.latitude === undefined || body.longitude === undefined || body.accuracyMeters === undefined)) || (!captured && body.captureStatus !== 'manual' && !body.failureReason?.trim())) throw new BadRequestException('invalid location evidence');
    return this.evidenceRepository.save(this.evidenceRepository.create({ businessType: 'workbench_record', businessId: recordId, evidenceType: 'location', fileId: null, summaryHash: null, captureStatus: body.captureStatus, capturedBy: user.userId, status: 'active', latitude: captured ? body.latitude! : null, longitude: captured ? body.longitude! : null, accuracyMeters: captured ? body.accuracyMeters! : null, failureReason: captured ? null : body.failureReason?.trim() ?? null, addressText: body.addressText?.trim() || null }));
  }

  private buildWorkbenchPrintPdf(record: WorkbenchRecord, snapshotData: Record<string, unknown>, renderedAt: Date, paperSize: PrintPaperSize): Buffer {
    const payloadJson = JSON.stringify(snapshotData.payload ?? {}, null, 2);
    const lines = [
      `Record ID: ${record.id}`,
      'Watermark: 苏南船舶 OA · 受控副本',
      `Generated At: ${renderedAt.toISOString()}`,
      `Paper Size: ${paperSize}`,
      '',
      'Workbench Record',
      `Module: ${record.moduleCode}`,
      `Template: ${record.templateCode}`,
      `Title: ${record.title}`,
      `Status: ${record.status}`,
      `Vessel: ${record.vesselId ?? '-'}`,
      '',
      'Summary:',
      ...this.wrapPdfTextLines(record.summary || '-', 74),
      '',
      'Payload:',
      ...this.wrapPdfTextLines(payloadJson || '{}', 74),
      '',
      'Steps:',
      ...(record.steps.length
        ? record.steps.map((step, index) => `${index + 1}. ${step.stepName} / ${step.status} / ${step.rectificationStatus ?? '-'}`)
        : ['-']),
      '',
      'Attachments:',
      ...(record.attachments.length
        ? record.attachments.map((attachment, index) => `${index + 1}. ${attachment.fileName} (${attachment.category}, ${attachment.fileId})`)
        : ['-']),
    ];

    return this.buildPdf({
      title: 'Workbench Print Snapshot',
      lines,
      paperSize,
    });
  }

  private async persistWorkbenchPrintPdf(params: { fileName: string; buffer: Buffer; uploadedBy: string }): Promise<FileEntity> {
    const ossKey = this.buildWorkbenchPrintOssKey();

    try {
      await this.ossService.uploadBuffer(ossKey, params.buffer, 'application/pdf', params.fileName);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      this.logger.warn(`workbench print oss upload failed for ${ossKey}: ${message}`);
    }

    return this.fileRepository.save(
      this.fileRepository.create({
        ossKey,
        fileName: params.fileName,
        mimeType: 'application/pdf',
        fileSize: params.buffer.length,
        category: 'workbench_print_snapshots',
        uploadedBy: params.uploadedBy,
      }),
    );
  }

  private buildWorkbenchPrintOssKey(): string {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    return `workbench_print_snapshots/${year}/${month}/${randomUUID()}.pdf`;
  }

  async launchApproval(dto: WorkbenchApprovalLaunchDto, user: CurrentUser) {
    const record = await this.mustGetRecord(dto.businessRecordId);
    await this.assertRecordVisible(record, user);
    if (dto.moduleCode !== record.moduleCode) {
      throw new BadRequestException('approval module does not match record');
    }
    const moduleItem = await this.mustGetModule(record.moduleCode);

    if (!moduleItem.requiresApproval) {
      throw new BadRequestException('module does not require approval');
    }

    if (record.externalProcessInstanceId) {
      throw new BadRequestException('approval process already exists for this record');
    }

    const { schemaDefinition, templateCode } = await this.mustGetModuleTemplate(moduleItem);
    const resolvedTemplateCode = dto.templateCode?.trim() || templateCode;
    const templateBinding = await this.ensureWecomApprovalTemplateBinding(moduleItem, resolvedTemplateCode, schemaDefinition);
    const processInstanceId = this.buildApprovalThirdNo(record);
    const launchConfig = this.buildWecomApprovalLaunchConfig(
      templateBinding.wecomTemplateId,
      processInstanceId,
      record,
      dto,
      schemaDefinition,
    );
    const now = new Date();
    this.logger.log(
      `approval launch prepared: record=${record.id}, module=${record.moduleCode}, template=${templateBinding.wecomTemplateId}, thirdNo=${processInstanceId}`,
    );

    await this.approvalSyncRepository.save(
      this.approvalSyncRepository.create({
        businessRecordId: record.id,
        moduleCode: record.moduleCode,
        approvalChannel: 'wecom_native',
        processInstanceId,
        wecomTemplateId: templateBinding.wecomTemplateId,
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
        rawPayloadDigest: JSON.stringify({
          thirdNo: processInstanceId,
          templateId: templateBinding.wecomTemplateId,
          payload: dto.payload ?? {},
        }),
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
      payloadDigest: JSON.stringify({
        thirdNo: processInstanceId,
        templateId: templateBinding.wecomTemplateId,
      }),
    });

    const launchStatus: LaunchStatus = 'prepared';

    return {
      processInstanceId,
      thirdNo: processInstanceId,
      wecomTemplateId: templateBinding.wecomTemplateId,
      approvalChannel: 'wecom_native' as const,
      launchStatus,
      mirrorStatus: 'approval_pending',
      approvalSyncStatus: 'pending',
      wecomLaunchConfig: launchConfig,
    };
  }

  private async ensureWecomApprovalTemplateBinding(
    moduleItem: WorkbenchModuleSummary,
    templateCode: string,
    schemaDefinition: ModuleSchemaDefinition,
  ) {
    const existing = await this.approvalTemplateBindingRepository.findOne({
      where: {
        moduleCode: moduleItem.moduleCode,
        templateCode,
        enabled: true,
      },
      order: {
        version: 'DESC',
        updatedAt: 'DESC',
      },
    });
    if (existing) {
      return existing;
    }

    const accessToken = await this.wecomTokenService.getAccessToken();
    const createPayload = this.buildWecomApprovalTemplateCreatePayload(moduleItem, schemaDefinition);
    const response = await this.wecomHttpGateway.createApprovalTemplate(accessToken, createPayload);
    if (!response.template_id) {
      throw new BadGatewayException('WeCom approval template_id missing');
    }

    const latestSceneBinding = await this.approvalTemplateBindingRepository.findOne({
      where: {
        approvalScene: moduleItem.moduleCode,
      },
      order: {
        version: 'DESC',
      },
    });

    try {
      return await this.approvalTemplateBindingRepository.save(
        this.approvalTemplateBindingRepository.create({
          moduleCode: moduleItem.moduleCode,
          templateCode,
          wecomTemplateId: response.template_id,
          approvalScene: moduleItem.moduleCode,
          version: (latestSceneBinding?.version ?? 0) + 1,
          visibleRoles: moduleItem.visibleRoles,
          enabled: true,
        }),
      );
    } catch (error) {
      if (!this.isUniqueViolation(error)) {
        throw error;
      }

      const raced = await this.approvalTemplateBindingRepository.findOne({
        where: {
          moduleCode: moduleItem.moduleCode,
          templateCode,
          enabled: true,
        },
        order: {
          version: 'DESC',
          updatedAt: 'DESC',
        },
      });
      if (raced) {
        return raced;
      }
      throw error;
    }
  }

  private buildWecomApprovalTemplateCreatePayload(
    moduleItem: WorkbenchModuleSummary,
    schemaDefinition: ModuleSchemaDefinition,
  ): WecomApprovalTemplateCreateRequest {
    const fields = schemaDefinition.sections.flatMap((section) => section.fields);
    const controls = (fields.length > 0 ? fields : [{
      key: 'summary',
      label: '申请摘要',
      required: true,
      inputType: 'textarea' as const,
      placeholder: '请输入申请摘要',
    }])
      .slice(0, 20)
      .map((field, index) => {
        const control = this.toWecomApprovalControl(field.inputType);
        return {
          property: {
            control,
            id: `${control}-${String(index + 1).padStart(2, '0')}`,
            title: [{ text: field.label, lang: 'zh_CN' as const }],
            placeholder: [{ text: field.placeholder ?? field.label, lang: 'zh_CN' as const }],
            require: field.required ? 1 as const : 0 as const,
            un_print: 0 as const,
          },
          config: control === 'Date' ? { date: { type: 'day' } } : {},
        };
      });

    return {
      template_name: [
        {
          text: moduleItem.moduleName,
          lang: 'zh_CN',
        },
      ],
      template_content: {
        controls,
      },
    };
  }

  private toWecomApprovalControl(inputType: ModuleSchemaField['inputType']): 'Text' | 'Textarea' | 'Number' | 'Date' {
    switch (inputType) {
      case 'textarea':
        return 'Textarea';
      case 'number':
        return 'Number';
      case 'date':
        return 'Date';
      default:
        return 'Text';
    }
  }

  private buildApprovalThirdNo(record: WorkbenchRecordEntity) {
    const shortRecordId = record.id.replace(/-/g, '').slice(0, 12);
    const randomSuffix = randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
    return `SN-${shortRecordId}-${Date.now()}-${randomSuffix}`;
  }

  private buildWecomApprovalLaunchConfig(
    templateId: string,
    thirdNo: string,
    record: WorkbenchRecordEntity,
    dto: WorkbenchApprovalLaunchDto,
    schemaDefinition: ModuleSchemaDefinition,
  ): WecomApprovalLaunchConfig {
    const fieldList: WecomApprovalLaunchConfig['extData']['fieldList'] = [
      { title: '业务标题', type: 'text', value: dto.title || record.title },
      { title: '业务摘要', type: 'text', value: dto.summary || record.summary },
      { title: '申请人', type: 'text', value: dto.applicantUserId },
      {
        title: '记录详情',
        type: 'link',
        value: `${appEnv.WEB_PUBLIC_URL.replace(/\/$/, '')}/workbench/records/${record.id}`,
      },
    ];

    const payload = dto.payload ?? record.payload ?? {};
    for (const field of schemaDefinition.sections.flatMap((section) => section.fields)) {
      const raw = payload[field.key];
      if (this.toApprovalDisplayValue(raw).trim() === '') {
        continue;
      }
      fieldList.push({
        title: field.label,
        type: 'text',
        value: this.toApprovalDisplayValue(raw),
      });
    }

    return {
      oaType: '10001',
      templateId,
      thirdNo,
      extData: {
        fieldList,
      },
    };
  }

  private toApprovalDisplayValue(value: unknown): string {
    if (value === undefined || value === null) {
      return '';
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (typeof value === 'object') {
      return JSON.stringify(value) ?? '';
    }
    return this.toScalarString(value);
  }

  async handleApprovalCallback(dto: WorkbenchApprovalCallbackDto | string | Record<string, unknown>, meta: ApprovalCallbackRequestMeta) {
    const normalizedDto = this.normalizeApprovalCallbackDto(this.coerceApprovalCallbackDto(dto));
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
    await this.assertRecordVisible(record, user);

    return this.toApprovalInstanceResponse(instance);
  }

  async reconcileApprovals(dto: WorkbenchApprovalReconcileDto, user: CurrentUser) {
    this.assertSystemAdmin(user);

    const instances = await this.approvalSyncRepository.find({
      where: { processInstanceId: In(dto.processInstanceIds) },
    });
    const instanceMap = new Map(instances.map((instance) => [instance.processInstanceId, instance]));

    const reconciled: string[] = [];
    const failed: string[] = [];
    const accessToken = instances.length > 0 ? await this.wecomTokenService.getAccessToken() : null;
    for (const processInstanceId of dto.processInstanceIds) {
      const instance = instanceMap.get(processInstanceId);
      if (!instance) {
        continue;
      }

      try {
        if (!accessToken) {
          throw new BadGatewayException('WeCom access_token missing');
        }
        await this.refreshApprovalInstanceFromWecom(instance, accessToken, user, dto.reason ?? null, 'approval_reconcile');
        reconciled.push(processInstanceId);
      } catch (error) {
        instance.approvalSyncStatus = 'failed';
        instance.syncErrorCode = 'wecom_reconcile_failed';
        instance.syncErrorMessage = this.toErrorMessage(error);
        await this.approvalSyncRepository.save(instance);
        failed.push(processInstanceId);
      }
    }

    return {
      acceptedCount: reconciled.length,
      failedCount: failed.length,
      processInstanceIds: reconciled,
      failedProcessInstanceIds: failed,
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
    await this.assertRecordVisible(record, user);

    instance.retryCount += 1;
    instance.lastRetryAt = new Date();
    instance.approvalSyncStatus = 'retrying';
    instance.syncErrorCode = null;
    instance.syncErrorMessage = null;

    if (strategy === 'full_reconcile') {
      instance.lastReconciledAt = new Date();
    }

    await this.approvalSyncRepository.save(instance);

    if (strategy === 'fetch_instance_detail' || strategy === 'full_reconcile') {
      try {
        const accessToken = await this.wecomTokenService.getAccessToken();
        await this.refreshApprovalInstanceFromWecom(instance, accessToken, user, dto.reason ?? null, 'approval_retry_reconcile');
      } catch (error) {
        instance.approvalSyncStatus = 'failed';
        instance.syncErrorCode = 'wecom_retry_reconcile_failed';
        instance.syncErrorMessage = this.toErrorMessage(error);
        await this.approvalSyncRepository.save(instance);
      }
    }

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

  private async refreshApprovalInstanceFromWecom(
    instance: WecomApprovalInstanceSyncEntity,
    accessToken: string,
    user: CurrentUser,
    reason: string | null,
    actionType: string,
  ) {
    const record = await this.mustGetRecord(instance.businessRecordId);
    await this.assertRecordVisible(record, user);

    const response = await this.wecomHttpGateway.getOpenApprovalData(accessToken, instance.processInstanceId);
    const externalStatus = this.toCallbackStatusFromOpenApprovalStatus(
      response.data?.OpenSpStatus ?? response.data?.OpenSpstatus,
    );
    if (!externalStatus) {
      throw new BadGatewayException('WeCom approval status missing');
    }

    const mirrorStatus = this.toMirrorStatus(externalStatus);
    const fromStatus = record.status;
    instance.externalStatus = externalStatus;
    instance.internalMirrorStatus = mirrorStatus;
    instance.approvalSyncStatus = 'reconciled';
    instance.lastReconciledAt = new Date();
    instance.wecomTemplateId = response.data?.OpenTemplateId ?? instance.wecomTemplateId;
    instance.syncErrorCode = null;
    instance.syncErrorMessage = null;
    instance.rawPayloadDigest = JSON.stringify(response.data ?? {});

    record.externalStatus = externalStatus;
    record.status = mirrorStatus;

    await Promise.all([this.approvalSyncRepository.save(instance), this.recordRepository.save(record)]);

    await this.appendActionLog(record.id, {
      actionType,
      source: 'reconcile',
      operatorUserId: user.userId,
      fromStatus,
      toStatus: mirrorStatus,
      comment: reason,
      payloadDigest: JSON.stringify(response.data ?? { processInstanceId: instance.processInstanceId }),
    });
  }

  private toErrorMessage(error: unknown) {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
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
    const allowedRanges = this.getCallbackAllowedIpRanges();
    if (!allowedRanges.length) {
      return;
    }
    const normalizedRequestIp = requestIp ? this.normalizeIp(requestIp) : null;
    if (!normalizedRequestIp) {
      throw new BadRequestException('callback request ip missing');
    }
    if (!allowedRanges.some((range) => this.isIpInRange(normalizedRequestIp, range))) {
      throw new BadRequestException('callback request ip not allowed');
    }
  }

  private getCallbackAllowedIpRanges() {
    const ranges = new Set(appEnv.WECOM_CALLBACK_ALLOWED_IP_RANGES);
    const filePath = appEnv.WECOM_CALLBACK_ALLOWED_IP_RANGES_FILE;
    if (filePath) {
      try {
        for (const range of readFileSync(filePath, 'utf8')
          .split(/[\n,]/)
          .map((item) => item.trim())
          .filter((item) => item && !item.startsWith('#'))) {
          ranges.add(range);
        }
      } catch {
        // The generated IP list is refreshed by the ops timer. If it is
        // temporarily missing, keep honoring static env ranges.
      }
    }
    return Array.from(ranges);
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

  private coerceApprovalCallbackDto(input: WorkbenchApprovalCallbackDto | string | Record<string, unknown>): WorkbenchApprovalCallbackDto {
    if (typeof input === 'string') {
      const trimmed = input.trim();
      if (trimmed.startsWith('{')) {
        try {
          return this.coerceApprovalCallbackDto(JSON.parse(trimmed) as Record<string, unknown>);
        } catch {
          throw new BadRequestException('callback payload invalid');
        }
      }
      return this.parsePlainApprovalXmlCallback(trimmed);
    }

    const raw = input as Record<string, unknown>;
    const encrypt = this.pickString(raw, 'encrypt', 'Encrypt');
    if (encrypt) {
      return {
        eventId: this.pickString(raw, 'eventId', 'EventID') ?? `encrypted-${this.sha1(encrypt).slice(0, 16)}`,
        processInstanceId: this.pickString(raw, 'processInstanceId', 'ProcessInstanceId') ?? 'encrypted',
        status: this.normalizeCallbackStatus(this.pickString(raw, 'status', 'Status')) ?? 'pending',
        callbackVersion: this.pickNumber(raw, 'callbackVersion', 'CallbackVersion') ?? 1,
        encrypted: true,
        encrypt,
        payload: this.pickObject(raw, 'payload'),
      };
    }

    const processInstanceId =
      this.pickString(raw, 'processInstanceId', 'ProcessInstanceId', 'thirdNo', 'ThirdNo') ?? '';
    const status =
      this.normalizeCallbackStatus(this.pickString(raw, 'status', 'Status')) ??
      this.toCallbackStatusFromOpenApprovalStatus(this.pickNumber(raw, 'openSpStatus', 'OpenSpStatus', 'OpenSpstatus'));
    const callbackVersion = this.pickNumber(raw, 'callbackVersion', 'CallbackVersion', 'CreateTime') ?? 1;
    const eventId =
      this.pickString(raw, 'eventId', 'EventID') ??
      `${processInstanceId}:${callbackVersion}:${status}`;

    if (!processInstanceId || !status) {
      throw new BadRequestException('callback payload invalid');
    }

    return {
      eventId,
      processInstanceId,
      status,
      callbackVersion: Math.max(1, callbackVersion),
      payload: this.pickObject(raw, 'payload'),
    };
  }

  private parsePlainApprovalXmlCallback(raw: string): WorkbenchApprovalCallbackDto {
    const encrypt = this.readXmlTag(raw, 'Encrypt');
    if (encrypt) {
      return {
        eventId: this.readXmlTag(raw, 'EventID') ?? `encrypted-${this.sha1(encrypt).slice(0, 16)}`,
        processInstanceId: 'encrypted',
        status: 'pending',
        callbackVersion: 1,
        encrypted: true,
        encrypt,
      };
    }

    const thirdNo = this.readXmlTag(raw, 'ThirdNo') ?? this.readXmlTag(raw, 'ProcessInstanceId');
    const status = this.toCallbackStatusFromOpenApprovalStatus(Number(this.readXmlTag(raw, 'OpenSpStatus')));
    const callbackVersion = Number(this.readXmlTag(raw, 'CreateTime') ?? Date.now());
    if (!thirdNo || !status) {
      throw new BadRequestException('callback payload invalid');
    }

    return {
      eventId: this.readXmlTag(raw, 'EventID') ?? `${thirdNo}:${callbackVersion}:${status}`,
      processInstanceId: thirdNo,
      status,
      callbackVersion: Math.max(1, callbackVersion),
      payload: {
        openTemplateId: this.readXmlTag(raw, 'OpenTemplateId'),
        openSpName: this.readXmlTag(raw, 'OpenSpName'),
        applyUserId: this.readXmlTag(raw, 'ApplyUserId'),
      },
    };
  }

  private pickString(source: Record<string, unknown>, ...keys: string[]) {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }
    return undefined;
  }

  private pickNumber(source: Record<string, unknown>, ...keys: string[]) {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }
      if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) {
          return parsed;
        }
      }
    }
    return undefined;
  }

  private pickObject(source: Record<string, unknown>, key: string) {
    const value = source[key];
    return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : undefined;
  }

  private readXmlTag(raw: string, tag: string) {
    const matched = raw.match(new RegExp(`<${tag}><!\\[CDATA\\[(.*?)\\]\\]><\\/${tag}>|<${tag}>(.*?)<\\/${tag}>`, 'i'));
    return matched?.[1] ?? matched?.[2] ?? undefined;
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
      const openStatus = typeof parsed.OpenSpStatus === 'number' ? parsed.OpenSpStatus : typeof parsed.OpenSpstatus === 'number' ? parsed.OpenSpstatus : undefined;
      return {
        eventId: typeof parsed.eventId === 'string' ? parsed.eventId : undefined,
        processInstanceId:
          typeof parsed.processInstanceId === 'string'
            ? parsed.processInstanceId
            : typeof parsed.ThirdNo === 'string'
              ? parsed.ThirdNo
              : undefined,
        status: this.normalizeCallbackStatus(typeof parsed.status === 'string' ? parsed.status : undefined) ?? this.toCallbackStatusFromOpenApprovalStatus(openStatus),
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
      const callbackVersion = callbackVersionText ? Number(callbackVersionText) : Number(read('CreateTime'));
      const openStatus = Number(read('OpenSpStatus'));
      return {
        eventId: read('EventID') ?? `${read('ThirdNo') ?? read('ProcessInstanceId')}:${callbackVersion}:${openStatus}`,
        processInstanceId: read('ProcessInstanceId') ?? read('ThirdNo'),
        status: this.normalizeCallbackStatus(read('Status')) ?? this.toCallbackStatusFromOpenApprovalStatus(openStatus),
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

  private toCallbackStatusFromOpenApprovalStatus(status: number | undefined): WorkbenchApprovalCallbackDto['status'] | undefined {
    switch (status) {
      case 1:
        return 'pending';
      case 2:
        return 'approved';
      case 3:
        return 'rejected';
      case 4:
        return 'canceled';
      default:
        return undefined;
    }
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

  private async syncRuntimeCatalog() {
    for (const moduleItem of WORKBENCH_MODULES) {
      const moduleSeed = {
        moduleCode: moduleItem.moduleCode,
        moduleName: moduleItem.moduleName,
        departmentCode: moduleItem.departmentCode,
        templateType: moduleItem.templateType,
        requiresApproval: moduleItem.requiresApproval,
        supportsPrint: moduleItem.supportsPrint,
        supportsStatistics: moduleItem.supportsStatistics,
        mobileFirst: moduleItem.mobileFirst,
        sortOrder: moduleItem.sortOrder,
        enabled: true,
      };
      const existingModule = await this.moduleRepository.findOne({ where: { moduleCode: moduleItem.moduleCode } });
      if (!existingModule) {
        await this.moduleRepository.save(this.moduleRepository.create(moduleSeed));
      }

      const schemaDefinition = MODULE_SCHEMA_DEFINITIONS[moduleItem.moduleCode];
      if (!schemaDefinition) {
        continue;
      }

      const templateCode = `${moduleItem.moduleCode}_v1`;
      const templateSeed = {
        moduleCode: moduleItem.moduleCode,
        templateCode,
        templateType: moduleItem.templateType,
        schemaVersion: 1,
        fieldSchema: schemaDefinition as unknown as Record<string, unknown>,
        stepSchema: schemaDefinition.stepTemplates ?? [],
        printSchema: { paperSizes: moduleItem.supportsPrint ? ['A4', 'A3'] : [] },
        approvalTemplateCode: moduleItem.requiresApproval ? templateCode : null,
        enabled: !moduleItem.legacyOnly,
      };
      const existingTemplate = await this.templateRepository.findOne({ where: { templateCode, schemaVersion: 1 } });
      if (!existingTemplate) {
        await this.templateRepository.save(this.templateRepository.create(templateSeed));
      }
    }
  }

  private async listRuntimeModules() {
    const modules = await this.moduleRepository.find({
      order: {
        sortOrder: 'ASC',
        moduleCode: 'ASC',
      },
    });

    return modules.map((moduleEntity) => this.toRuntimeModule(moduleEntity));
  }

  private toRuntimeModule(moduleEntity: WorkbenchModuleEntity): WorkbenchModuleSummary {
    const defaults = WORKBENCH_MODULE_DEFAULTS.get(moduleEntity.moduleCode);
    const fallbackTemplateType = defaults?.templateType ?? 'ledger_form';
    const templateType = WORKBENCH_TEMPLATE_TYPES.includes(moduleEntity.templateType as TemplateType)
      ? (moduleEntity.templateType as TemplateType)
      : fallbackTemplateType;

    return {
      moduleCode: moduleEntity.moduleCode,
      moduleName: moduleEntity.moduleName,
      departmentCode: moduleEntity.departmentCode,
      templateType,
      requiresApproval: moduleEntity.requiresApproval,
      supportsPrint: moduleEntity.supportsPrint,
      supportsStatistics: moduleEntity.supportsStatistics,
      mobileFirst: moduleEntity.mobileFirst,
      sortOrder: moduleEntity.sortOrder,
      visibleRoles: [...(defaults?.visibleRoles ?? ['system_admin'])],
      enabled: moduleEntity.enabled,
      legacyOnly: defaults?.legacyOnly,
    };
  }

  private async mustGetModuleTemplate(moduleItem: WorkbenchModuleSummary): Promise<{ schemaDefinition: ModuleSchemaDefinition; templateCode: string }> {
    const template = await this.templateRepository.findOne({
      where: {
        moduleCode: moduleItem.moduleCode,
        enabled: true,
      },
      order: {
        schemaVersion: 'DESC',
        updatedAt: 'DESC',
      },
    });

    if (template) {
      return {
        schemaDefinition: this.toRuntimeSchemaDefinition(template, moduleItem),
        templateCode: template.templateCode,
      };
    }

    const fallbackSchema = MODULE_SCHEMA_DEFINITIONS[moduleItem.moduleCode];
    if (!fallbackSchema) {
      throw new BadRequestException('module schema not found');
    }

    return {
      schemaDefinition: {
        ...fallbackSchema,
        templateType: moduleItem.templateType,
      },
      templateCode: `${moduleItem.moduleCode}_v1`,
    };
  }

  private toRuntimeSchemaDefinition(template: WorkbenchTemplateEntity, moduleItem: WorkbenchModuleSummary): ModuleSchemaDefinition {
    const fieldSchema = template.fieldSchema as Partial<ModuleSchemaDefinition>;
    if (Array.isArray(fieldSchema.sections)) {
      return {
        ...fieldSchema,
        moduleCode: moduleItem.moduleCode,
        templateType: moduleItem.templateType,
        stepTemplates: Array.isArray(fieldSchema.stepTemplates) ? fieldSchema.stepTemplates : (template.stepSchema as ModuleSchemaDefinition['stepTemplates']),
      } as ModuleSchemaDefinition;
    }

    return {
      moduleCode: moduleItem.moduleCode,
      templateType: moduleItem.templateType,
      sections: [],
      stepTemplates: Array.isArray(template.stepSchema) ? (template.stepSchema as ModuleSchemaDefinition['stepTemplates']) : undefined,
    };
  }

  private async listVisibleModules(user: CurrentUser) {
    const runtimeModules = await this.listRuntimeModules();
    return runtimeModules.filter((moduleItem) => moduleItem.enabled && !moduleItem.legacyOnly && this.hasRoleAccess(user, moduleItem.visibleRoles)).sort(
      (a, b) => a.sortOrder - b.sortOrder,
    );
  }

  private async listReadableModules(user: CurrentUser) {
    const runtimeModules = await this.listRuntimeModules();
    return runtimeModules.filter((moduleItem) => moduleItem.enabled && this.hasRoleAccess(user, moduleItem.visibleRoles)).sort((a, b) => a.sortOrder - b.sortOrder);
  }

  private async listVisibleRecords(user: CurrentUser) {
    const visibleModules = await this.listReadableModules(user);
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

    const allowed = await Promise.all(records.map(async (record) => ({ record, readable: await this.canReadRecord(record, user) })));
    return allowed.filter((item) => item.readable).map((item) => this.toRecordModel(item.record));
  }

  private async computePendingCounts(user: CurrentUser) {
    const moduleCodes = (await this.listVisibleModules(user)).map((moduleItem) => moduleItem.moduleCode);
    if (moduleCodes.length === 0) {
      return new Map<string, number>();
    }

    const rows = await this.recordRepository
      .createQueryBuilder('record')
      .select('record.module_code', 'moduleCode')
      .addSelect('COUNT(*)', 'pendingCount')
      .where('record.module_code IN (:...moduleCodes)', { moduleCodes })
      .andWhere('record.status IN (:...statuses)', { statuses: [...PENDING_STATUSES] })
      .groupBy('record.module_code')
      .getRawMany<{
        modulecode?: string;
        moduleCode?: string;
        pendingcount?: string;
        pendingCount?: string;
      }>();

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

  private buildInitialSteps(schema: ModuleSchemaDefinition): WorkbenchStep[] {
    if (!schema.stepTemplates?.length) {
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
    return this.toScalarString(value).trim().toLowerCase();
  }

  private toScalarString(value: unknown): string {
    if (value === undefined || value === null || typeof value === 'object') {
      return '';
    }
    if (typeof value === 'symbol') {
      return value.description ?? '';
    }
    if (typeof value === 'function') {
      return value.name;
    }
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }
    if (typeof value === 'number' || typeof value === 'bigint') {
      return `${value}`;
    }
    return '';
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

  private buildPdf(input: { title: string; lines: string[]; paperSize: PrintPaperSize }): Buffer {
    const pageWidth = input.paperSize === 'A3' ? PDF_A3_PAGE_WIDTH : PDF_A4_PAGE_WIDTH;
    const pageHeight = input.paperSize === 'A3' ? PDF_A3_PAGE_HEIGHT : PDF_A4_PAGE_HEIGHT;
    const maxLinesPerPage = input.paperSize === 'A3' ? Math.floor((pageHeight - PDF_MARGIN_TOP * 2) / PDF_LINE_HEIGHT) - 2 : PDF_MAX_LINES_PER_PAGE;
    const pages: string[][] = [];
    for (let index = 0; index < input.lines.length; index += maxLinesPerPage) {
      pages.push(input.lines.slice(index, index + maxLinesPerPage));
    }

    const pageStreams = pages.map((pageLines, pageIndex) => {
      const commands: string[] = ['BT', '/F1 12 Tf'];
      const pageTitle = `${input.title}  Page ${pageIndex + 1}/${pages.length}`;
      commands.push(`1 0 0 1 ${PDF_MARGIN_LEFT.toFixed(2)} ${(pageHeight - PDF_MARGIN_TOP).toFixed(2)} Tm (${this.escapePdfText(pageTitle)}) Tj`);

      pageLines.forEach((line, lineIndex) => {
        const y = pageHeight - PDF_MARGIN_TOP - PDF_LINE_HEIGHT * (lineIndex + 2);
        commands.push(`1 0 0 1 ${PDF_MARGIN_LEFT.toFixed(2)} ${y.toFixed(2)} Tm (${this.escapePdfText(line)}) Tj`);
      });

      commands.push('ET');
      return commands.join('\n');
    });

    return this.composePdf(pageStreams, pageWidth, pageHeight);
  }

  private composePdf(pageStreams: string[], pageWidth: number, pageHeight: number): Buffer {
    const objects: string[] = [];
    const pageObjectIds: number[] = [];

    objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
    objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';

    let nextObjectId = 4;
    pageStreams.forEach((stream) => {
      const pageObjectId = nextObjectId;
      const contentObjectId = nextObjectId + 1;

      pageObjectIds.push(pageObjectId);
      objects[pageObjectId] =
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectId} 0 R >>`;
      objects[contentObjectId] = `<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream`;

      nextObjectId += 2;
    });

    objects[2] = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageObjectIds.length} >>`;

    const maxObjectId = nextObjectId - 1;
    let pdf = '%PDF-1.4\n';
    const offsets: number[] = [0];

    for (let id = 1; id <= maxObjectId; id += 1) {
      const objectBody = objects[id] ?? '<< >>';
      offsets[id] = Buffer.byteLength(pdf, 'utf8');
      pdf += `${id} 0 obj\n${objectBody}\nendobj\n`;
    }

    const xrefOffset = Buffer.byteLength(pdf, 'utf8');
    pdf += `xref\n0 ${maxObjectId + 1}\n`;
    pdf += '0000000000 65535 f \n';

    for (let id = 1; id <= maxObjectId; id += 1) {
      pdf += `${String(offsets[id] ?? 0).padStart(10, '0')} 00000 n \n`;
    }

    pdf += `trailer\n<< /Size ${maxObjectId + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    return Buffer.from(pdf, 'utf8');
  }

  private wrapPdfTextLines(text: string, maxUnitsPerLine: number): string[] {
    const rawLines = text.replace(/\r\n/g, '\n').split('\n');
    const wrapped: string[] = [];

    rawLines.forEach((rawLine) => {
      if (!rawLine) {
        wrapped.push('');
        return;
      }

      let currentLine = '';
      let currentUnits = 0;
      Array.from(rawLine).forEach((char) => {
        const units = char.charCodeAt(0) > 255 ? 2 : 1;
        if (currentUnits + units > maxUnitsPerLine && currentLine) {
          wrapped.push(currentLine);
          currentLine = char;
          currentUnits = units;
          return;
        }
        currentLine += char;
        currentUnits += units;
      });

      if (currentLine) {
        wrapped.push(currentLine);
      }
    });

    return wrapped;
  }

  private escapePdfText(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '');
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

  private async mustGetModule(moduleCode: string) {
    const moduleEntity = await this.moduleRepository.findOne({ where: { moduleCode } });
    if (!moduleEntity) {
      throw new NotFoundException('workbench module not found');
    }
    return this.toRuntimeModule(moduleEntity);
  }

  private async assertRecordVisible(record: WorkbenchRecordEntity, user: CurrentUser) {
    if (!(await this.canReadRecord(record, user))) {
      throw new ForbiddenException('forbidden');
    }
  }

  private async canReadRecord(record: WorkbenchRecordEntity, user: CurrentUser) {
    const moduleItem = await this.mustGetModule(record.moduleCode);
    if (!this.hasRoleAccess(user, moduleItem.visibleRoles)) return false;
    if (user.roles.includes('system_admin')) return true;
    const participant = await this.participantRepository.exist({ where: { businessRecordId: record.id, userId: user.userId, status: 'active', deletedAt: IsNull() } });
    if (participant || [record.ownerUserId, record.applicantUserId, record.assigneeUserId, record.reviewerUserId].includes(user.userId)) return true;
    if (!user.roles.includes('crew')) return true;
    return Boolean(record.vesselId && (user.departments.includes(record.vesselId) || user.departments.includes(`vessel:${record.vesselId}`)));
  }

  private async assertActionAuthorized(record: WorkbenchRecordEntity, actionType: WorkbenchRecordActionDto['actionType'], payload: Record<string, unknown> | undefined, user: CurrentUser) {
    await this.assertRecordVisible(record, user);
    if (user.roles.includes('system_admin')) return;
    if (!['start', 'complete_step', 'submit_review', 'request_rework', 'close_record'].includes(actionType)) return;
    const stepCode = typeof payload?.stepCode === 'string' ? payload.stepCode : undefined;
    const step = stepCode ? await this.stepRepository.findOne({ where: { businessRecordId: record.id, stepCode } }) : null;
    const participants = await this.participantRepository.find({ where: { businessRecordId: record.id, status: 'active', deletedAt: IsNull() } });
    const isStepParticipant = participants.some((item) => item.userId === user.userId && (!step || item.stepId === null || item.stepId === step.id) && (item.role === 'executor' || item.role === 'collaborator' || item.role === 'reviewer'));
    const legacyOwner = participants.length === 0 && [record.ownerUserId, record.assigneeUserId, record.reviewerUserId].includes(user.userId);
    if (!isStepParticipant && !legacyOwner) throw new ForbiddenException('forbidden');
  }

  private async getAvailableActions(record: WorkbenchRecordEntity, user: CurrentUser) {
    if (!(await this.canReadRecord(record, user))) return [];
    if (user.roles.includes('system_admin')) return ['start', 'complete_step', 'submit_review', 'request_rework', 'close_record', 'return_step', 'terminate', 'void', 'reopen', 'delegate', 'transfer'];
    const participants = await this.participantRepository.find({ where: { businessRecordId: record.id, userId: user.userId, status: 'active', deletedAt: IsNull() } });
    const roles = new Set(participants.map((item) => item.role));
    const legacyOwner = participants.length === 0 && [record.ownerUserId, record.assigneeUserId, record.reviewerUserId].includes(user.userId);
    const actions: string[] = [];
    if (legacyOwner || roles.has('executor') || roles.has('collaborator')) actions.push('start', 'complete_step', 'delegate');
    if (legacyOwner || roles.has('reviewer')) actions.push('submit_review', 'request_rework', 'close_record', 'return_step', 'terminate', 'reopen', 'transfer');
    return actions;
  }

  private assertLegalTransition(status: string, actionType: WorkbenchRecordActionDto['actionType']) {
    if (actionType === 'close_record' && !['pending_review', 'rework_required'].includes(status)) {
      throw new ConflictException('illegal state transition');
    }
    if (actionType === 'complete_step' && !['in_progress', 'assigned'].includes(status)) {
      throw new ConflictException('illegal state transition');
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
    const moduleItem = WORKBENCH_MODULE_DEFAULTS.get(record.moduleCode);
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
      visibleRoles: [...(moduleItem?.visibleRoles ?? ['system_admin'])],
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
      case 'update_payload':
        return currentStatus;
      case 'submit_review':
        return 'pending_review';
      case 'request_rework':
        return 'rework_required';
      case 'close_record':
        return 'closed';
      case 'archive':
        return 'archived';
      case 'return_step':
        return 'in_progress';
      case 'terminate':
        return 'terminated';
      case 'void':
        return 'voided';
      case 'reopen':
        return 'assigned';
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

  private assertPayloadMatchesSchema(payload: Record<string, unknown> | undefined, schema: ModuleSchemaDefinition) {
    if (!payload || typeof payload !== 'object') {
      throw new BadRequestException('payload is required');
    }

    const requiredFields = schema.sections.flatMap((section) => section.fields).filter((field) => field.required);
    for (const field of requiredFields) {
      const raw = payload[field.key];
      if (raw === undefined || raw === null) {
        throw new BadRequestException(`payload.${field.key} is required`);
      }

      if (field.inputType === 'number') {
        const numeric = typeof raw === 'number' ? raw : Number(raw);
        if (!Number.isFinite(numeric)) {
          throw new BadRequestException(`payload.${field.key} must be a valid number`);
        }
        continue;
      }

      if (field.inputType === 'date') {
        const dateString = this.toScalarString(raw).trim();
        if (!dateString) {
          throw new BadRequestException(`payload.${field.key} is required`);
        }
        if (Number.isNaN(Date.parse(dateString))) {
          throw new BadRequestException(`payload.${field.key} must be a valid date`);
        }
        continue;
      }

      const text = this.toScalarString(raw).trim();
      if (!text) {
        throw new BadRequestException(`payload.${field.key} is required`);
      }
    }
  }

  private normalizeCreatePayload(moduleCode: string, payload: Record<string, unknown> | undefined): Record<string, unknown> {
    const normalized = { ...(payload ?? {}) };
    if (moduleCode === 'goa_meeting') {
      if (!this.toScalarString(normalized.retentionUntil).trim()) {
        const retention = new Date();
        retention.setUTCFullYear(retention.getUTCFullYear() + 3);
        normalized.retentionUntil = retention.toISOString().slice(0, 10);
      }
    }
    if (moduleCode === 'goa_training') {
      const learningStatus = this.toScalarString(normalized.learningStatus).trim();
      if (
        learningStatus === 'completed' &&
        !this.toScalarString(normalized.completedAt).trim()
      ) {
        normalized.completedAt = new Date().toISOString().slice(0, 10);
      }
    }
    return normalized;
  }

  private async tryAutoLaunchTrainingApproval(record: WorkbenchRecordEntity, user: CurrentUser): Promise<WecomApprovalLaunchConfig | null> {
    if (record.moduleCode !== 'goa_training') {
      return null;
    }
    if (record.externalProcessInstanceId) {
      return null;
    }

    const moduleItem = await this.mustGetModule(record.moduleCode);
    if (!moduleItem.requiresApproval) {
      return null;
    }

    const payload = record.payload ?? {};
    const learningStatus = this.toLowerString(payload.learningStatus);
    const completedAt = this.toScalarString(payload.completedAt).trim();
    const progressRaw = payload.learningProgressPercent;
    const progress = typeof progressRaw === 'number' ? progressRaw : Number(progressRaw);

    const isCompleted = learningStatus === 'completed' || Boolean(completedAt) || (Number.isFinite(progress) && progress >= 100);
    if (!isCompleted) {
      return null;
    }

    const { schemaDefinition, templateCode } = await this.mustGetModuleTemplate(moduleItem);
    const templateBinding = await this.ensureWecomApprovalTemplateBinding(moduleItem, templateCode, schemaDefinition);
    const processInstanceId = this.buildApprovalThirdNo(record);
    const launchConfig = this.buildWecomApprovalLaunchConfig(
      templateBinding.wecomTemplateId,
      processInstanceId,
      record,
      {
        moduleCode: record.moduleCode,
        businessRecordId: record.id,
        templateCode,
        title: record.title,
        applicantUserId: user.userId,
        summary: record.summary,
        payload: record.payload,
      },
      schemaDefinition,
    );
    const now = new Date();
    await this.approvalSyncRepository.save(
      this.approvalSyncRepository.create({
        businessRecordId: record.id,
        moduleCode: record.moduleCode,
        approvalChannel: 'wecom_native',
        processInstanceId,
        wecomTemplateId: templateBinding.wecomTemplateId,
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
        rawPayloadDigest: JSON.stringify({
          thirdNo: processInstanceId,
          templateId: templateBinding.wecomTemplateId,
          payload: record.payload ?? {},
        }),
      }),
    );

    const fromStatus = record.status;
    record.approvalChannel = 'wecom_native';
    record.externalProcessInstanceId = processInstanceId;
    record.externalStatus = 'pending';
    record.status = 'approval_pending';
    await this.recordRepository.save(record);

    await this.appendActionLog(record.id, {
      actionType: 'launch_approval',
      source: 'manual',
      operatorUserId: user.userId,
      fromStatus,
      toStatus: 'approval_pending',
      comment: '培训完成自动发起审批',
      payloadDigest: JSON.stringify({
        thirdNo: processInstanceId,
        templateId: templateBinding.wecomTemplateId,
      }),
    });

    this.logger.log(`training auto approval prepared: record=${record.id}, thirdNo=${processInstanceId}`);
    return launchConfig;
  }
}
