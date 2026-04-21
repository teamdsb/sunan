import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CurrentUser } from 'src/common/interfaces/current-user.interface';
import { WorkbenchApprovalCallbackDto } from './dto/workbench-approval-callback.dto';
import { WorkbenchApprovalLaunchDto } from './dto/workbench-approval-launch.dto';
import { WorkbenchApprovalReconcileDto } from './dto/workbench-approval-reconcile.dto';
import { WorkbenchRecordActionDto } from './dto/workbench-record-action.dto';
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
    moduleCode: 'finance_attendance',
    moduleName: '财务部统计中心',
    departmentCode: 'finance',
    templateType: 'attendance_statistics',
    requiresApproval: false,
    supportsPrint: true,
    supportsStatistics: true,
    mobileFirst: true,
    sortOrder: 30,
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
    sortOrder: 40,
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
    sortOrder: 50,
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
    sortOrder: 60,
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
    sortOrder: 70,
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
    sortOrder: 80,
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
    sortOrder: 90,
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
    sortOrder: 100,
    visibleRoles: ['system_admin', 'general_office', 'business', 'shipping'],
  },
];

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
        id: 'wb-record-001',
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
        id: 'wb-record-002',
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
      {
        id: 'wb-record-003',
        moduleCode: 'business_operation_flow',
        templateCode: 'operation_flow_v1',
        title: '围油栏作业闭环记录（泊位B3）',
        summary: '班前会议、检查、巡查与完工确认闭环。',
        status: 'in_progress',
        vesselId: null,
        occurredAt: '2026-04-21T03:10:00.000Z',
        approvalChannel: 'internal',
        externalProcessInstanceId: null,
        externalStatus: null,
        ownerUserId: 'business_op_001',
        visibleRoles: ['system_admin', 'general_office', 'business'],
        payload: {
          berth: 'B3',
          operationType: 'oil_boom',
        },
        steps: [
          {
            stepCode: 'pre_shift',
            stepName: '班前会议',
            status: 'completed',
            rectificationRequired: false,
            rectificationStatus: null,
          },
          {
            stepCode: 'inspection',
            stepName: '作业前检查',
            status: 'completed',
            rectificationRequired: false,
            rectificationStatus: null,
          },
          {
            stepCode: 'patrol',
            stepName: '巡查记录',
            status: 'in_progress',
            rectificationRequired: false,
            rectificationStatus: null,
          },
        ],
        attachments: [],
        actionLogs: [],
      },
      {
        id: 'wb-record-004',
        moduleCode: 'finance_attendance',
        templateCode: 'attendance_monthly_v1',
        title: '2026-04 财务部考勤统计',
        summary: '钦州市区定位打卡汇总，含出差/外派统计。',
        status: 'submitted',
        vesselId: null,
        occurredAt: '2026-04-21T05:00:00.000Z',
        approvalChannel: 'internal',
        externalProcessInstanceId: null,
        externalStatus: null,
        ownerUserId: 'finance_001',
        visibleRoles: ['system_admin', 'general_office', 'finance'],
        payload: {
          month: '2026-04',
        },
        steps: [],
        attachments: [],
        actionLogs: [],
      },
    ];

    for (const row of seedRows) {
      this.records.set(row.id, row);
    }

    this.approvalInstances.set('wbpi_seed_001', {
      processInstanceId: 'wbpi_seed_001',
      businessRecordId: 'wb-record-002',
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
