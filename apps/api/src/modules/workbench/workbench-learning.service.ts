import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';
import { CurrentUser } from 'src/common/interfaces/current-user.interface';
import { WorkbenchRecordEntity } from 'src/database/entities/workbench-record.entity';
import { WorkbenchRecordAttachmentEntity } from 'src/database/entities/workbench-record-attachment.entity';
import { WorkbenchRecordActionLogEntity } from 'src/database/entities/workbench-record-action-log.entity';
import { WecomUserEntity } from 'src/database/entities/wecom-user.entity';
import { FileEntity } from 'src/database/entities/file.entity';
import {
  LEARNING_MODULES,
  round,
  reportMonth,
  shanghaiTime,
} from './business-reports';
import { LearningPublishDto } from './dto/workbench-business.dto';

export interface LearningState {
  publishedAt: string;
  hours: number;
  materials: Array<{ id: string; title: string; fileId?: string }>;
  learners: Array<{
    userId: string;
    name: string;
    completedMaterialIds: string[];
    completedAt: string | null;
  }>;
}
export const learningState = (record: WorkbenchRecordEntity) =>
  record.payload.learning as LearningState | undefined;
export const isLearningManager = (user: CurrentUser) =>
  user.roles.some((role) =>
    ['system_admin', 'general_office', 'shipping'].includes(role),
  );
export const canReadLearning = (
  record: WorkbenchRecordEntity,
  user: CurrentUser,
) =>
  isLearningManager(user) ||
  record.ownerUserId === user.userId ||
  Boolean(
    learningState(record)?.learners.some((p) => p.userId === user.userId),
  );

@Injectable()
export class WorkbenchLearningService {
  constructor(private readonly source: DataSource) {}
  async people(user: CurrentUser) {
    if (!isLearningManager(user))
      throw new ForbiddenException('仅管理人员可下发学习');
    const rows = await this.source
      .getRepository(WecomUserEntity)
      .find({ where: { corpId: user.corpId }, order: { name: 'ASC' } });
    return rows
      .filter((row) => ![2, 4, 5].includes(Number(row.rawProfile?.status)))
      .map((row) => ({ userId: row.userId, name: row.name }));
  }
  private async locked(
    manager: EntityManager,
    id: string,
    allowClosed = false,
  ) {
    const record = await manager.findOne(WorkbenchRecordEntity, {
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
    if (!record || !LEARNING_MODULES.includes(record.moduleCode))
      throw new NotFoundException('学习记录不存在');
    if (
      [
        'voided',
        'terminated',
        'archived',
        ...(allowClosed ? [] : ['closed']),
      ].includes(record.status)
    )
      throw new ConflictException('记录已结束，不能修改学习');
    return record;
  }
  private async audit(
    manager: EntityManager,
    record: WorkbenchRecordEntity,
    user: CurrentUser,
    actionType: string,
    comment: string,
  ) {
    await manager.save(
      WorkbenchRecordActionLogEntity,
      manager.create(WorkbenchRecordActionLogEntity, {
        businessRecordId: record.id,
        actionType,
        source: 'manual',
        operatorUserId: user.userId,
        fromStatus: record.status,
        toStatus: record.status,
        comment,
        payloadDigest: null,
      }),
    );
  }
  async publish(id: string, dto: LearningPublishDto, user: CurrentUser) {
    if (!isLearningManager(user))
      throw new ForbiddenException('仅管理人员可下发学习');
    const people = await this.people(user),
      chosen = dto.userIds.map((id) => people.find((p) => p.userId === id));
    if (chosen.some((p) => !p))
      throw new BadRequestException('请选择本企业有效成员');
    return this.source.transaction(async (manager) => {
      const record = await this.locked(manager, id);
      if (record.externalProcessInstanceId)
        throw new ConflictException('已有审批记录，请新建学习课程');
      if (learningState(record))
        throw new ConflictException('学习已下发；新增内容请建立新的学习记录');
      const attachments = await manager.find(WorkbenchRecordAttachmentEntity, {
        where: { businessRecordId: id },
      });
      const files = attachments.length
        ? await manager.findBy(FileEntity, {
            id: In(attachments.map((a) => a.fileId)),
          })
        : [];
      if (files.length !== new Set(attachments.map((a) => a.fileId)).size)
        throw new BadRequestException('部分学习附件不可用，请先补齐');
      const state: LearningState = {
        publishedAt: new Date().toISOString(),
        hours: dto.hours,
        materials: [
          { id: 'content', title: record.summary || record.title },
          ...files.map((file) => ({
            id: file.id,
            title: file.fileName,
            fileId: file.id,
          })),
        ],
        learners: chosen.map((p) => ({
          ...p!,
          completedMaterialIds: [],
          completedAt: null,
        })),
      };
      record.payload = {
        ...record.payload,
        hours: dto.hours,
        totalHours: dto.hours,
        participants: chosen.map((p) => p!.name).join('、'),
        crewNames: chosen.map((p) => p!.name).join('、'),
        learningAudience: chosen.map((p) => p!.name).join('、'),
        learning: state,
        learningStatus: 'not_started',
        learningProgressPercent: 0,
        completedAt: null,
      };
      record.status = 'in_progress';
      await manager.save(record);
      await this.audit(
        manager,
        record,
        user,
        'publish_learning',
        `下发给 ${chosen.length} 人`,
      );
      return this.view(record, user);
    });
  }
  async confirm(id: string, materialId: string, user: CurrentUser) {
    return this.source.transaction(async (manager) => {
      const record = await this.locked(manager, id, true),
        state = learningState(record);
      const learner = state?.learners.find((p) => p.userId === user.userId);
      if (!state || !learner)
        throw new ForbiddenException('仅被分配的成员可确认自己的学习');
      if (!state.materials.some((m) => m.id === materialId))
        throw new BadRequestException('学习内容不存在');
      if (!learner.completedMaterialIds.includes(materialId)) {
        learner.completedMaterialIds.push(materialId);
        if (learner.completedMaterialIds.length === state.materials.length)
          learner.completedAt = new Date().toISOString();
        const completed = state.learners.filter((p) => p.completedAt).length;
        record.payload = {
          ...record.payload,
          learning: state,
          learningStatus:
            completed === state.learners.length ? 'completed' : 'in_progress',
          learningProgressPercent: round(
            (state.learners.reduce(
              (sum, p) => sum + p.completedMaterialIds.length,
              0,
            ) /
              state.learners.length /
              state.materials.length) *
              100,
          ),
          completedAt:
            completed === state.learners.length
              ? new Date().toISOString()
              : null,
        };
        if (completed === state.learners.length) {
          record.status =
            record.moduleCode === 'goa_training' ? 'pending_review' : 'closed';
          if (record.status === 'closed') record.closedAt = new Date();
        }
        await manager.save(record);
        await this.audit(
          manager,
          record,
          user,
          'confirm_learning',
          `完成材料：${materialId}`,
        );
      }
      return this.view(record, user);
    });
  }
  view(record: WorkbenchRecordEntity, user: CurrentUser) {
    const state = learningState(record);
    if (!state) return null;
    const manager = isLearningManager(user);
    const learners = state.learners
      .filter((p) => manager || p.userId === user.userId)
      .map((p) => ({
        ...p,
        progressPercent: round(
          (p.completedMaterialIds.length / state.materials.length) * 100,
        ),
        completedHours: p.completedAt ? state.hours : 0,
      }));
    return {
      publishedAt: state.publishedAt,
      hours: state.hours,
      materials: state.materials,
      learners,
      totalPeople: manager ? state.learners.length : learners.length,
      completedPeople: learners.filter((p) => p.completedAt).length,
      completionRate: round(
        (learners.filter((p) => p.completedAt).length /
          Math.max(learners.length, 1)) *
          100,
      ),
    };
  }
  async statistics(user: CurrentUser, month?: string) {
    const normalized = month ? reportMonth(month) : undefined;
    const records = (
      await this.source.getRepository(WorkbenchRecordEntity).find({
        where: { moduleCode: In(LEARNING_MODULES) },
        order: { occurredAt: 'DESC' },
      })
    ).filter(
      (r) =>
        canReadLearning(r, user) &&
        !['voided', 'terminated'].includes(r.status) &&
        (!normalized || shanghaiTime(r.occurredAt).startsWith(normalized)),
    );
    const courses = records.map((r) => ({
      recordId: r.id,
      title: r.title,
      moduleCode: r.moduleCode,
      ...this.view(r, user),
    }));
    const people = new Map<
      string,
      {
        userId: string;
        name: string;
        assigned: number;
        completed: number;
        completedHours: number;
      }
    >();
    for (const course of courses)
      for (const learner of course.learners ?? []) {
        const row = people.get(learner.userId) ?? {
          userId: learner.userId,
          name: learner.name,
          assigned: 0,
          completed: 0,
          completedHours: 0,
        };
        row.assigned++;
        if (learner.completedAt) row.completed++;
        row.completedHours = round(row.completedHours + learner.completedHours);
        people.set(row.userId, row);
      }
    return {
      courses,
      people: [...people.values()].map((p) => ({
        ...p,
        completionRate: round((p.completed / Math.max(p.assigned, 1)) * 100),
      })),
    };
  }
}
