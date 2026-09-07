import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PDFDocument } from 'pdf-lib';
import { isISO8601, isUUID } from 'class-validator';
import { OssService } from 'src/modules/files/oss.service';
import {
  buildSelfInspectionPdf,
  SelfInspectionPrintData,
} from './self-inspection-pdf';
import { randomUUID } from 'crypto';
import { DataSource, EntityManager, In } from 'typeorm';
import { CurrentUser } from 'src/common/interfaces/current-user.interface';
import { toBusinessDateTime } from 'src/common/date/business-date';
import { RoleResolverService } from 'src/modules/auth/role-resolver.service';
import { WecomUserEntity } from 'src/database/entities/wecom-user.entity';
import { VesselEntity } from 'src/database/entities/vessel.entity';
import { FileEntity } from 'src/database/entities/file.entity';
import { WorkbenchRecordEntity } from 'src/database/entities/workbench-record.entity';
import { WorkbenchRecordStepEntity } from 'src/database/entities/workbench-record-step.entity';
import { WorkbenchRecordAttachmentEntity } from 'src/database/entities/workbench-record-attachment.entity';
import { WorkbenchRecordActionLogEntity } from 'src/database/entities/workbench-record-action-log.entity';
import { WorkbenchRecordCreateDto } from './dto/workbench-record-create.dto';
import { WorkbenchRecordActionDto } from './dto/workbench-record-action.dto';
import { WorkbenchRecordUploadAttachmentDto } from './dto/workbench-record-upload-attachment.dto';

export const SELF_INSPECTION_MODULE = 'shipping_self_inspection';
const STEP_NAMES = [
  ['on_site_inspection', '现场检查'],
  ['rectification', '整改执行'],
  ['review_close', '审核关闭'],
] as const;
export const SELF_INSPECTION_SCHEMA = {
  moduleCode: SELF_INSPECTION_MODULE,
  templateType: 'inspection_rectification' as const,
  sections: [
    {
      key: 'inspection',
      title: '自查要求',
      fields: [
        {
          key: 'inspectionScope',
          label: '检查范围',
          required: true,
          inputType: 'textarea' as const,
        },
        {
          key: 'deadline',
          label: '完成期限',
          required: true,
          inputType: 'datetime' as const,
        },
      ],
    },
  ],
  stepTemplates: STEP_NAMES.map(([stepCode, stepName]) => ({
    stepCode,
    stepName,
  })),
};
const text = (value: unknown) => (typeof value === 'string' ? value : '');
const TERMINAL = new Set(['closed', 'archived', 'voided', 'terminated']);

/** 单执行人、独立审核人；所有写操作锁同一业务记录并与审计一起提交。 */
@Injectable()
export class SelfInspectionService {
  constructor(
    private readonly source: DataSource,
    private readonly roles: RoleResolverService,
    private readonly oss: OssService,
  ) {}

  private async databaseNow(manager: EntityManager): Promise<Date> {
    // 文件 createdAt 来自数据库，证据轮次也使用同一时钟，避免主机时差误拒新照片。
    const rows = await manager.query<[{ now: Date }]>(
      'SELECT clock_timestamp() AS now',
    );
    return rows[0].now;
  }

  isManager(user: CurrentUser) {
    return user.roles.some((role) =>
      ['shipping', 'general_office', 'system_admin'].includes(role),
    );
  }

  canRead(record: WorkbenchRecordEntity, user: CurrentUser) {
    return (
      this.isManager(user) ||
      [
        record.ownerUserId,
        record.assigneeUserId,
        record.reviewerUserId,
      ].includes(user.userId)
    );
  }

  private canAssign(record: WorkbenchRecordEntity, user: CurrentUser) {
    return (
      this.isManager(user) &&
      (record.ownerUserId === user.userId ||
        user.roles.includes('system_admin'))
    );
  }

  availableActions(record: WorkbenchRecordEntity, user: CurrentUser): string[] {
    if (!this.canRead(record, user) || TERMINAL.has(record.status)) return [];
    const actions: string[] = [];
    if (this.canAssign(record, user)) actions.push('assign', 'void');
    if (
      !record.assigneeUserId ||
      !record.reviewerUserId ||
      record.assigneeUserId === record.reviewerUserId
    )
      return actions;
    if (user.userId === record.assigneeUserId) {
      if (record.status === 'assigned') actions.push('start');
      if (['in_progress', 'rework_required'].includes(record.status))
        actions.push('complete_step', 'upload_attachment');
    }
    if (
      user.userId === record.reviewerUserId &&
      record.status === 'pending_review'
    )
      actions.push('request_rework', 'close_record');
    return actions;
  }

  async people(user: CurrentUser) {
    if (!this.isManager(user))
      throw new ForbiddenException('只有管理人员可以分配自查任务');
    const members = await this.source
      .getRepository(WecomUserEntity)
      .find({ where: { corpId: user.corpId }, order: { name: 'ASC' } });
    return members
      .filter((member) => this.active(member))
      .map((member) => {
        const roles = this.memberRoles(member);
        return {
          userId: member.userId,
          name: member.name,
          canExecute: roles.some((role) =>
            ['crew', 'shipping', 'general_office', 'system_admin'].includes(
              role,
            ),
          ),
          canReview: roles.some((role) =>
            ['shipping', 'general_office', 'system_admin'].includes(role),
          ),
        };
      })
      .filter((member) => member.canExecute || member.canReview);
  }

  async names(record: WorkbenchRecordEntity) {
    const members = await this.source.getRepository(WecomUserEntity).find({
      where: {
        userId: In([record.assigneeUserId ?? '', record.reviewerUserId ?? '']),
      },
    });
    return {
      assigneeName: members.find(
        (member) => member.userId === record.assigneeUserId,
      )?.name,
      reviewerName: members.find(
        (member) => member.userId === record.reviewerUserId,
      )?.name,
    };
  }

  private active(member: WecomUserEntity) {
    return (
      member.rawProfile.status === undefined || member.rawProfile.status === 1
    );
  }

  private memberRoles(member: WecomUserEntity) {
    return this.roles.resolveRoles({
      departmentIds: member.departmentIds,
      departmentNames: member.departmentNames,
      position: member.position,
      isSystemAdmin: member.isSystemAdmin,
    });
  }

  private async validateAssignment(
    manager: EntityManager,
    assignee: unknown,
    reviewer: unknown,
    user: CurrentUser,
  ) {
    if (
      typeof assignee !== 'string' ||
      typeof reviewer !== 'string' ||
      !assignee.trim() ||
      !reviewer.trim()
    )
      throw new BadRequestException('请选择执行人和审核人');
    if (assignee === reviewer)
      throw new BadRequestException('执行人和审核人必须不同');
    const members = await manager.find(WecomUserEntity, {
      where: { userId: In([assignee, reviewer]), corpId: user.corpId },
    });
    const executor = members.find(
      (member) => member.userId === assignee && this.active(member),
    );
    const checker = members.find(
      (member) => member.userId === reviewer && this.active(member),
    );
    if (
      !executor ||
      !this.memberRoles(executor).some((role) =>
        ['crew', 'shipping', 'general_office', 'system_admin'].includes(role),
      )
    )
      throw new BadRequestException('执行人不是可用的船员或管理人员');
    if (
      !checker ||
      !this.memberRoles(checker).some((role) =>
        ['shipping', 'general_office', 'system_admin'].includes(role),
      )
    )
      throw new BadRequestException('审核人必须是可用的管理人员');
    return { assigneeUserId: assignee, reviewerUserId: reviewer };
  }

  async create(
    dto: WorkbenchRecordCreateDto,
    templateCode: string,
    payload: Record<string, unknown>,
    user: CurrentUser,
  ) {
    if (!this.isManager(user))
      throw new ForbiddenException('自查任务由管理人员下发');
    if (!dto.title.trim() || !dto.summary.trim())
      throw new BadRequestException('请填写标题与自查要求');
    const inspectionScope = this.comment(payload.inspectionScope);
    if (
      typeof payload.deadline !== 'string' ||
      !/T\d{2}:/.test(payload.deadline) ||
      !isISO8601(payload.deadline, { strict: true, strictSeparator: true })
    )
      throw new BadRequestException('请填写有效的完成期限');
    return this.source.transaction(async (manager) => {
      const assignment = await this.validateAssignment(
        manager,
        dto.assigneeUserId,
        dto.reviewerUserId,
        user,
      );
      if (!dto.vesselId || !isUUID(dto.vesselId))
        throw new BadRequestException('请选择船舶');
      const vessel = await manager.findOneBy(VesselEntity, {
        id: dto.vesselId,
        status: 'active',
      });
      if (!vessel) throw new BadRequestException('船舶不存在或已停用');
      const now = await this.databaseNow(manager);
      const record = await manager.save(
        WorkbenchRecordEntity,
        manager.create(WorkbenchRecordEntity, {
          moduleCode: SELF_INSPECTION_MODULE,
          templateCode,
          recordNo: `SI-${randomUUID().replace(/-/g, '').slice(0, 28)}`,
          title: dto.title.trim(),
          summary: dto.summary.trim(),
          departmentCode: 'shipping_dept',
          vesselId: vessel.id,
          ownerUserId: user.userId,
          applicantUserId: user.userId,
          ...assignment,
          approvalChannel: 'internal',
          recordSource: 'manual',
          status: 'assigned',
          submittedAt: now,
          occurredAt: dto.occurredAt ? toBusinessDateTime(dto.occurredAt) : now,
          payload: {
            inspectionScope,
            deadline: payload.deadline,
            vesselName: vessel.name,
          },
        }),
      );
      await manager.save(
        WorkbenchRecordStepEntity,
        STEP_NAMES.map(([stepCode, stepName], index) =>
          manager.create(WorkbenchRecordStepEntity, {
            businessRecordId: record.id,
            stepCode,
            stepName,
            sequenceNo: index + 1,
            status: 'pending',
            stepPayload: {},
            rectificationRequired: false,
          }),
        ),
      );
      await this.log(
        manager,
        record,
        user,
        'assign',
        'draft',
        '下发自查任务',
        assignment,
      );
      return record.id;
    });
  }

  private async locked(manager: EntityManager, id: string, user: CurrentUser) {
    const record = await manager.findOne(WorkbenchRecordEntity, {
      where: { id, moduleCode: SELF_INSPECTION_MODULE },
      lock: { mode: 'pessimistic_write' },
    });
    if (!record) throw new NotFoundException('自查记录不存在');
    if (!this.canRead(record, user))
      throw new ForbiddenException('无权访问该自查记录');
    if (TERMINAL.has(record.status))
      throw new ConflictException('已结束的自查记录不可修改');
    return record;
  }

  private comment(value: unknown) {
    if (typeof value !== 'string' || !value.trim())
      throw new BadRequestException('请填写检查、整改或审核说明');
    if (value.length > 2000)
      throw new BadRequestException('说明不能超过 2000 字');
    return value.trim();
  }

  private async requirePhoto(
    manager: EntityManager,
    record: WorkbenchRecordEntity,
    category: string,
    since?: string,
  ) {
    const attachments = await manager.find(WorkbenchRecordAttachmentEntity, {
      where: { businessRecordId: record.id, category },
    });
    const cutoff = Math.max(
      record.submittedAt?.getTime() ?? 0,
      since ? new Date(since).getTime() : 0,
    );
    if (
      !attachments.some(
        (item) =>
          ['image/jpeg', 'image/png'].includes(item.mimeType) &&
          item.uploadedAt.getTime() >= cutoff,
      )
    )
      throw new ConflictException(
        category === 'before_rectification'
          ? '请先上传本次检查的整改前照片'
          : '请先上传本轮整改后的照片',
      );
  }

  async action(id: string, dto: WorkbenchRecordActionDto, user: CurrentUser) {
    return this.source.transaction(async (manager) => {
      const record = await this.locked(manager, id, user);
      const from = record.status;
      const actorAllowed = ['assign', 'void'].includes(dto.actionType)
        ? this.canAssign(record, user)
        : ['start', 'complete_step'].includes(dto.actionType)
          ? record.assigneeUserId === user.userId
          : ['close_record', 'request_rework'].includes(dto.actionType)
            ? record.reviewerUserId === user.userId && this.isManager(user)
            : false;
      if (!actorAllowed) throw new ForbiddenException('当前用户无权执行此动作');
      const actions = this.availableActions(record, user);
      if (!actions.includes(dto.actionType))
        throw new ConflictException('当前状态或分工不允许此动作');
      if (dto.actionType === 'void') {
        const comment = this.comment(dto.comment);
        record.status = 'voided';
        await manager.save(WorkbenchRecordEntity, record);
        await this.log(manager, record, user, 'void', from, comment, {});
        return {
          recordId: id,
          status: record.status,
          acceptedAction: dto.actionType,
          approvalLaunchConfig: null,
        };
      }
      const steps = await manager.find(WorkbenchRecordStepEntity, {
        where: { businessRecordId: id },
        order: { sequenceNo: 'ASC' },
      });
      if (
        steps.length !== 3 ||
        steps.some((step, index) => step.stepCode !== STEP_NAMES[index]?.[0])
      )
        throw new ConflictException('自查步骤不完整，请作废后重新下发');
      const inspection = steps[0]!;
      const rectification = steps[1]!;
      const review = steps[2]!;
      const now = await this.databaseNow(manager);
      const payload = dto.payload ?? {};
      let comment = dto.comment?.trim() ?? '';
      const complete = (step: WorkbenchRecordStepEntity, text: string) => {
        step.status = 'completed';
        step.completedAt = now;
        step.completedBy = user.userId;
        step.stepPayload = { ...step.stepPayload, comment: text };
      };
      if (dto.actionType === 'assign') {
        comment = this.comment(dto.comment);
        if (
          !record.vesselId ||
          !isUUID(record.vesselId) ||
          !(await manager.exists(VesselEntity, {
            where: { id: record.vesselId, status: 'active' },
          }))
        )
          throw new ConflictException('船舶未关联有效主数据，请作废后重新下发');
        Object.assign(
          record,
          await this.validateAssignment(
            manager,
            payload.assigneeUserId,
            payload.reviewerUserId,
            user,
          ),
        );
        record.status = 'assigned';
        record.submittedAt = now;
        for (const step of steps)
          Object.assign(step, {
            status: 'pending',
            completedAt: null,
            completedBy: null,
            checkResult: null,
            rectificationRequired: false,
            rectificationStatus: null,
            stepPayload: {},
          });
      } else if (dto.actionType === 'start') {
        inspection.status = 'in_progress';
        record.status = 'in_progress';
      } else if (dto.actionType === 'complete_step') {
        comment = this.comment(dto.comment);
        const current = steps.find((step) => step.status !== 'completed');
        if (
          !current ||
          current.stepCode === 'review_close' ||
          current.stepCode !== payload.stepCode ||
          current.status !== 'in_progress'
        )
          throw new ConflictException('只能完成当前执行步骤');
        if (current === inspection) {
          if (
            !['conforming', 'nonconforming'].includes(
              String(payload.checkResult),
            )
          )
            throw new BadRequestException('请选择检查结果');
          inspection.checkResult = String(payload.checkResult);
          const required = inspection.checkResult === 'nonconforming';
          if (required)
            await this.requirePhoto(manager, record, 'before_rectification');
          inspection.rectificationRequired = required;
          rectification.rectificationRequired = required;
          complete(inspection, comment);
          if (required) rectification.status = 'in_progress';
          else {
            Object.assign(rectification, {
              status: 'completed',
              completedAt: now,
              completedBy: user.userId,
              stepPayload: { comment: '检查合格，无需整改' },
              rectificationStatus: 'not_required',
            });
            review.status = 'in_progress';
            record.status = 'pending_review';
          }
        } else {
          await this.requirePhoto(
            manager,
            record,
            'after_rectification',
            rectification.stepPayload.returnedAt as string | undefined,
          );
          complete(rectification, comment);
          rectification.rectificationStatus = 'submitted';
          review.status = 'in_progress';
          record.status = 'pending_review';
        }
      } else {
        // 审核动作没有管理员旁路，也不能由曾执行检查或整改的人完成。
        if (steps.slice(0, 2).some((step) => step.completedBy === user.userId))
          throw new ForbiddenException('执行人不能审核自己的检查或整改');
        if (dto.actionType === 'request_rework') {
          comment = this.comment(dto.comment);
          if (inspection.status !== 'completed')
            throw new ConflictException('现场检查尚未完成');
          Object.assign(rectification, {
            status: 'in_progress',
            completedAt: null,
            completedBy: null,
            rectificationRequired: true,
            rectificationStatus: 'rework_required',
            stepPayload: {
              returnedAt: now.toISOString(),
              returnReason: comment,
            },
          });
          Object.assign(review, {
            status: 'pending',
            completedAt: null,
            completedBy: null,
          });
          record.status = 'rework_required';
          if (inspection.checkResult === 'conforming') {
            Object.assign(inspection, {
              status: 'in_progress',
              checkResult: null,
              completedBy: null,
              completedAt: null,
              stepPayload: {
                returnedAt: now.toISOString(),
                returnReason: comment,
              },
            });
            rectification.status = 'pending';
            record.status = 'in_progress';
          }
        } else if (dto.actionType === 'close_record') {
          comment = this.comment(dto.comment);
          if (
            inspection.status !== 'completed' ||
            rectification.status !== 'completed' ||
            !['conforming', 'nonconforming'].includes(
              inspection.checkResult ?? '',
            )
          )
            throw new ConflictException('检查和整改尚未完成');
          if (inspection.checkResult === 'nonconforming')
            await this.requirePhoto(manager, record, 'before_rectification');
          if (rectification.rectificationRequired)
            await this.requirePhoto(
              manager,
              record,
              'after_rectification',
              rectification.stepPayload.returnedAt as string | undefined,
            );
          complete(review, comment);
          record.status = 'closed';
          record.closedAt = now;
          if (rectification.rectificationRequired)
            rectification.rectificationStatus = 'accepted';
        }
      }
      await manager.save(WorkbenchRecordStepEntity, steps);
      await manager.save(WorkbenchRecordEntity, record);
      await this.log(
        manager,
        record,
        user,
        dto.actionType,
        from,
        comment,
        payload,
      );
      return {
        recordId: id,
        status: record.status,
        acceptedAction: dto.actionType,
        approvalLaunchConfig: null,
      };
    });
  }

  async upload(
    id: string,
    dto: WorkbenchRecordUploadAttachmentDto,
    user: CurrentUser,
  ) {
    return this.source.transaction(async (manager) => {
      const record = await this.locked(manager, id, user);
      if (!this.availableActions(record, user).includes('upload_attachment'))
        throw new ForbiddenException(
          '只有当前执行人能在检查或整改期间上传证据',
        );
      const steps = await manager.find(WorkbenchRecordStepEntity, {
        where: { businessRecordId: id },
        order: { sequenceNo: 'ASC' },
      });
      const step = steps.find((item) => item.status === 'in_progress');
      const category =
        step?.stepCode === 'on_site_inspection'
          ? 'before_rectification'
          : 'after_rectification';
      if (
        !step ||
        step.stepCode === 'review_close' ||
        dto.category !== category ||
        (dto.stepCode && dto.stepCode !== step.stepCode)
      )
        throw new ConflictException('照片分类必须与当前检查或整改步骤一致');
      const file = await manager.findOneBy(FileEntity, { id: dto.fileId });
      if (!file || file.uploadedBy !== user.userId)
        throw new ForbiddenException('只能关联本人上传的照片');
      if (
        !['image/jpeg', 'image/png'].includes(file.mimeType) ||
        file.fileSize <= 0 ||
        file.fileSize > 20 * 1024 * 1024
      )
        throw new BadRequestException(
          '整改证据须为不超过 20MB 的 JPEG 或 PNG 照片',
        );
      const evidenceSince = Math.max(
        record.submittedAt?.getTime() ?? 0,
        typeof step.stepPayload.returnedAt === 'string'
          ? new Date(step.stepPayload.returnedAt).getTime()
          : 0,
      );
      if (file.createdAt.getTime() < evidenceSince)
        throw new ConflictException('请上传本次任务或本轮整改的新照片');
      if (
        await manager.exists(WorkbenchRecordAttachmentEntity, {
          where: { businessRecordId: id, fileId: file.id },
        })
      )
        throw new ConflictException('该照片已经用于本记录，请上传本轮新照片');
      let bytes: Buffer;
      try {
        bytes = await this.oss.readBuffer(file.ossKey);
        const validation = await PDFDocument.create();
        if (file.mimeType === 'image/png') await validation.embedPng(bytes);
        else await validation.embedJpg(bytes);
      } catch {
        throw new BadRequestException('无法读取有效照片，请重新上传');
      }
      const storagePath = `workbench/self-inspections/${id}/${randomUUID()}.${file.mimeType === 'image/png' ? 'png' : 'jpg'}`;
      await this.oss.uploadBuffer(
        storagePath,
        bytes,
        file.mimeType,
        file.fileName,
      );
      const attachment = await manager.save(
        WorkbenchRecordAttachmentEntity,
        manager.create(WorkbenchRecordAttachmentEntity, {
          businessRecordId: id,
          stepId: step.id,
          fileId: file.id,
          fileName: file.fileName,
          mimeType: file.mimeType,
          storagePath,
          category,
          uploadedAt: await this.databaseNow(manager),
          uploadedBy: user.userId,
          remark: dto.remark ?? null,
        }),
      );
      await this.log(
        manager,
        record,
        user,
        'upload_attachment',
        record.status,
        dto.remark ?? '',
        { fileId: file.id, category, stepCode: step.stepCode },
      );
      return {
        ...attachment,
        fileSize: file.fileSize,
        uploadedAt: attachment.uploadedAt.toISOString(),
      };
    });
  }

  async print(id: string, user: CurrentUser, paper: 'A4' | 'A3') {
    // 已关闭记录不可写，读取它的步骤、证据和审计后形成固定业务快照。
    const record = await this.source
      .getRepository(WorkbenchRecordEntity)
      .findOneBy({ id, moduleCode: SELF_INSPECTION_MODULE });
    if (!record || !this.canRead(record, user))
      throw new ForbiddenException('无权打印该自查记录');
    const steps = await this.source
      .getRepository(WorkbenchRecordStepEntity)
      .find({ where: { businessRecordId: id }, order: { sequenceNo: 'ASC' } });
    if (
      record.status !== 'closed' ||
      !record.closedAt ||
      !record.assigneeUserId ||
      !record.reviewerUserId ||
      record.assigneeUserId === record.reviewerUserId ||
      steps.length !== 3 ||
      !['conforming', 'nonconforming'].includes(steps[0]?.checkResult ?? '') ||
      steps.some(
        (step) =>
          step.status !== 'completed' || !step.completedBy || !step.completedAt,
      ) ||
      steps[2]?.completedBy !== record.reviewerUserId ||
      steps
        .slice(0, 2)
        .some((step) => step.completedBy === record.reviewerUserId)
    )
      throw new ConflictException('记录尚未完成独立审核，不能生成已审核打印件');
    const attachments = await this.source
      .getRepository(WorkbenchRecordAttachmentEntity)
      .find({ where: { businessRecordId: id }, order: { uploadedAt: 'ASC' } });
    const memberIds = [
      ...new Set([
        record.ownerUserId,
        record.assigneeUserId,
        record.reviewerUserId,
        ...steps.map((step) => step.completedBy!),
        ...attachments.map((item) => item.uploadedBy),
      ]),
    ];
    const members = await this.source
      .getRepository(WecomUserEntity)
      .find({ where: { userId: In(memberIds) } });
    const name = (userId: string) =>
      members.find((member) => member.userId === userId)?.name ?? userId;
    const data: SelfInspectionPrintData = {
      recordNo: record.recordNo,
      title: record.title,
      summary: record.summary,
      vesselName: text(record.payload.vesselName),
      scope: text(record.payload.inspectionScope),
      deadline: text(record.payload.deadline),
      issuer: name(record.ownerUserId),
      executor: name(record.assigneeUserId),
      reviewer: name(record.reviewerUserId),
      closedAt: record.closedAt?.toISOString() ?? '',
      generatedAt: new Date().toISOString(),
      steps: steps.map((step) => ({
        name: step.stepName,
        result:
          step.checkResult === 'nonconforming'
            ? '发现问题'
            : step.checkResult === 'conforming'
              ? '检查合格'
              : step.stepCode === 'review_close'
                ? '审核通过'
                : step.rectificationRequired
                  ? '整改完成'
                  : '无需整改',
        comment: text(step.stepPayload.comment),
        operator: name(step.completedBy!),
        completedAt: step.completedAt!.toISOString(),
      })),
      photos: [],
    };
    for (const attachment of attachments) {
      if (
        !['before_rectification', 'after_rectification'].includes(
          attachment.category,
        )
      )
        continue;
      const cutoff = Math.max(
        record.submittedAt?.getTime() ?? 0,
        attachment.category === 'after_rectification' &&
          steps[1]?.stepPayload.returnedAt
          ? new Date(text(steps[1].stepPayload.returnedAt)).getTime()
          : 0,
      );
      if (attachment.uploadedAt.getTime() < cutoff) continue;
      const file = await this.source
        .getRepository(FileEntity)
        .findOneBy({ id: attachment.fileId });
      if (!file)
        throw new ConflictException('整改照片缺失，无法生成完整打印件');
      data.photos.push({
        name: file.fileName,
        category: attachment.category,
        uploadedBy: name(attachment.uploadedBy),
        uploadedAt: attachment.uploadedAt.toISOString(),
        mimeType: file.mimeType,
        bytes: await this.oss.readBuffer(attachment.storagePath ?? file.ossKey),
      });
    }
    if (
      steps[0]?.checkResult === 'nonconforming' &&
      !data.photos.some((photo) => photo.category === 'before_rectification')
    )
      throw new ConflictException('整改前照片缺失');
    if (
      steps[1]?.rectificationRequired &&
      !data.photos.some((photo) => photo.category === 'after_rectification')
    )
      throw new ConflictException('整改后照片缺失');
    return {
      buffer: await buildSelfInspectionPdf(data, paper),
      snapshot: {
        ...data,
        photos: data.photos.map((photo) => ({ ...photo, bytes: undefined })),
      },
    };
  }

  private async log(
    manager: EntityManager,
    record: WorkbenchRecordEntity,
    user: CurrentUser,
    actionType: string,
    fromStatus: string,
    comment: string,
    payload: unknown,
  ) {
    await manager.save(
      WorkbenchRecordActionLogEntity,
      manager.create(WorkbenchRecordActionLogEntity, {
        businessRecordId: record.id,
        actionType,
        fromStatus,
        toStatus: record.status,
        operatorUserId: user.userId,
        source: 'manual',
        comment,
        payloadDigest: JSON.stringify(payload),
      }),
    );
  }
}
