import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, IsNull, LessThan, LessThanOrEqual, Repository } from 'typeorm';

import type { CurrentUser } from 'src/common/interfaces/current-user.interface';
import { toBusinessDateTime } from 'src/common/date/business-date';
import { PersonnelEntity } from 'src/database/entities/personnel.entity';
import {
  SafetyPlanEntity,
  SafetyPlanItemEntity,
  SafetyTaskActionLogEntity,
  SafetyTaskDelegationEntity,
  SafetyTaskEntity,
  SafetyTaskGenerationEntryEntity,
  SafetyTaskGenerationRunEntity,
  SafetyTaskNotificationDeliveryEntity,
  SafetyTaskParticipantEntity,
  SafetyTaskTransferEntity,
} from 'src/database/entities/safety-plan-task.entity';
import { VesselEntity } from 'src/database/entities/vessel.entity';
import { WecomMessageService } from 'src/modules/wecom/wecom-message.service';

import type {
  GenerationRequestDto,
  PaginationQueryDto,
  PlanActionDto,
  PlanInputDto,
  PlanItemInputDto,
  PlanListQueryDto,
  TaskActionDto,
  TaskListQueryDto,
} from './dto/plan-task.dto';
import {
  buildGenerationKey,
  expandOccurrences,
  isTaskOverdue,
  resolveTaskAction,
  type RecurrenceRule,
  type TaskActionType,
  type TaskStatus,
} from './task-domain';

const TERMINAL_TASK_STATUSES = new Set(['completed', 'cancelled']);
const EXECUTION_ROLES = new Set(['executor', 'collaborator', 'delegate']);
const MANAGEMENT_ACTIONS = new Set(['reschedule', 'cancel', 'remind', 'escalate', 'transfer']);
const MAX_DELIVERY_ATTEMPTS = 3;

type TaskSnapshot = {
  status: string;
  responsibleUserId: string;
  scheduledAt: string;
  dueAt: string;
};

@Injectable()
export class PlanTaskService {
  constructor(
    @InjectRepository(SafetyPlanEntity) private readonly plans: Repository<SafetyPlanEntity>,
    @InjectRepository(SafetyPlanItemEntity) private readonly items: Repository<SafetyPlanItemEntity>,
    @InjectRepository(SafetyTaskEntity) private readonly tasks: Repository<SafetyTaskEntity>,
    @InjectRepository(SafetyTaskParticipantEntity) private readonly participants: Repository<SafetyTaskParticipantEntity>,
    @InjectRepository(SafetyTaskActionLogEntity) private readonly logs: Repository<SafetyTaskActionLogEntity>,
    @InjectRepository(SafetyTaskTransferEntity) private readonly transfers: Repository<SafetyTaskTransferEntity>,
    @InjectRepository(SafetyTaskDelegationEntity) private readonly delegations: Repository<SafetyTaskDelegationEntity>,
    @InjectRepository(SafetyTaskGenerationRunEntity) private readonly runs: Repository<SafetyTaskGenerationRunEntity>,
    @InjectRepository(SafetyTaskGenerationEntryEntity) private readonly entries: Repository<SafetyTaskGenerationEntryEntity>,
    @InjectRepository(SafetyTaskNotificationDeliveryEntity) private readonly deliveries: Repository<SafetyTaskNotificationDeliveryEntity>,
    @InjectRepository(PersonnelEntity) private readonly personnel: Repository<PersonnelEntity>,
    @InjectRepository(VesselEntity) private readonly vessels: Repository<VesselEntity>,
    private readonly wecomMessageService: WecomMessageService,
    private readonly dataSource: DataSource,
  ) {}

  async createPlan(user: CurrentUser, input: PlanInputDto) {
    if (input.ownerUserId && input.ownerUserId !== user.userId && !this.isAdmin(user)) {
      throw new ForbiddenException('Only an administrator may create a plan for another owner');
    }
    const ownerUserId = input.ownerUserId ?? user.userId;
    await this.assertActivePersonnel(ownerUserId);
    if (input.vesselId) {
      const vessel = await this.assertActiveVessel(input.vesselId);
      this.assertVesselScope(vessel, user);
    }
    const plan = await this.plans.save(
      this.plans.create({
        title: input.title.trim(),
        description: input.description?.trim() || null,
        planType: input.planType,
        status: 'draft',
        ownerUserId,
        timeZone: input.timeZone,
        vesselId: input.vesselId ?? null,
        scopeSnapshot: input.vesselId ? { vesselId: input.vesselId } : {},
        createdBy: user.userId,
        updatedBy: user.userId,
        deletedAt: null,
      }),
    );
    return this.planResponse(plan);
  }

  async listPlans(user: CurrentUser, query: PlanListQueryDto) {
    const visiblePlans = this.isAdmin(user)
      ? await this.plans.find({ where: { deletedAt: IsNull() }, order: { createdAt: 'desc' } })
      : await this.plans.find({ where: { ownerUserId: user.userId, deletedAt: IsNull() }, order: { createdAt: 'desc' } });
    const plans = visiblePlans.filter((plan) => (!query.status || plan.status === query.status) && (!query.vesselId || plan.vesselId === query.vesselId));
    const start = (query.page - 1) * query.pageSize;
    return {
      data: await Promise.all(plans.slice(start, start + query.pageSize).map((plan) => this.planResponse(plan))),
      meta: this.pageMeta(plans.length, query.page, query.pageSize),
    };
  }

  async getPlan(planId: string, user: CurrentUser) {
    const plan = await this.mustGetPlan(planId);
    this.assertPlanManager(plan, user);
    return this.planResponse(plan, true);
  }

  async updatePlan(planId: string, user: CurrentUser, input: PlanInputDto) {
    const plan = await this.mustGetPlan(planId);
    this.assertPlanManager(plan, user);
    if (!['draft', 'paused'].includes(plan.status)) {
      throw new ConflictException('Only draft or paused plans can be edited');
    }
    if (input.vesselId) {
      const vessel = await this.assertActiveVessel(input.vesselId);
      this.assertVesselScope(vessel, user);
    }
    plan.title = input.title.trim();
    plan.description = input.description?.trim() || null;
    plan.planType = input.planType;
    plan.timeZone = input.timeZone;
    plan.vesselId = input.vesselId ?? null;
    plan.scopeSnapshot = input.vesselId ? { vesselId: input.vesselId } : {};
    if (input.ownerUserId && input.ownerUserId !== plan.ownerUserId) {
      if (!this.isAdmin(user)) throw new ForbiddenException('Only an administrator may change the plan owner');
      await this.assertActivePersonnel(input.ownerUserId);
      plan.ownerUserId = input.ownerUserId;
    }
    plan.updatedBy = user.userId;
    return this.planResponse(await this.plans.save(plan));
  }

  async changePlanStatus(planId: string, user: CurrentUser, input: PlanActionDto) {
    const plan = await this.mustGetPlan(planId);
    this.assertPlanManager(plan, user);
    const transitions: Record<string, { from: string[]; to: string; reason: boolean }> = {
      activate: { from: ['draft', 'paused'], to: 'active', reason: false },
      pause: { from: ['active'], to: 'paused', reason: true },
      retire: { from: ['draft', 'active', 'paused'], to: 'retired', reason: true },
    };
    const transition = transitions[input.actionType];
    if (!transition || !transition.from.includes(plan.status)) {
      throw new ConflictException('Illegal plan transition');
    }
    if (transition.reason && !input.reason?.trim()) {
      throw new UnprocessableEntityException('A reason is required');
    }
    if (input.actionType === 'activate') {
      const itemCount = await this.items.count({ where: { planId, enabled: true, deletedAt: IsNull() } });
      if (!itemCount) throw new UnprocessableEntityException('An active plan requires at least one enabled item');
    }
    plan.status = transition.to;
    plan.updatedBy = user.userId;
    return this.planResponse(await this.plans.save(plan));
  }

  async listItems(planId: string, user: CurrentUser) {
    const plan = await this.mustGetPlan(planId);
    this.assertPlanManager(plan, user);
    return this.items.find({ where: { planId, deletedAt: IsNull() }, order: { createdAt: 'asc' } });
  }

  async addItem(planId: string, user: CurrentUser, input: PlanItemInputDto) {
    const plan = await this.mustGetPlan(planId);
    this.assertPlanManager(plan, user);
    if (plan.status === 'retired') throw new ConflictException('A retired plan cannot be changed');
    await this.validatePlanItem(input);
    return this.items.save(
      this.items.create({
        planId,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        responsibleUserId: input.responsibleUserId,
        participantSnapshot: (input.participantUserIds ?? [])
          .filter((id) => id !== input.responsibleUserId)
          .map((userId) => ({ userId, role: 'collaborator' })),
        completionRule: input.completionRule,
        quorumCount: input.completionRule === 'quorum' ? input.quorumCount ?? null : null,
        recurrence: { ...input.recurrence },
        dueOffsetMinutes: input.dueOffsetMinutes,
        ruleVersion: 1,
        enabled: input.enabled ?? true,
        createdBy: user.userId,
        updatedBy: user.userId,
        deletedAt: null,
      }),
    );
  }

  async updateItem(planId: string, itemId: string, user: CurrentUser, input: PlanItemInputDto) {
    const plan = await this.mustGetPlan(planId);
    this.assertPlanManager(plan, user);
    if (plan.status === 'retired') throw new ConflictException('A retired plan cannot be changed');
    const item = await this.items.findOneBy({ id: itemId, planId, deletedAt: IsNull() });
    if (!item) throw new NotFoundException('Plan item not found');
    await this.validatePlanItem(input);
    item.title = input.title.trim();
    item.description = input.description?.trim() || null;
    item.responsibleUserId = input.responsibleUserId;
    item.participantSnapshot = (input.participantUserIds ?? [])
      .filter((id) => id !== input.responsibleUserId)
      .map((userId) => ({ userId, role: 'collaborator' }));
    item.completionRule = input.completionRule;
    item.quorumCount = input.completionRule === 'quorum' ? input.quorumCount ?? null : null;
    item.recurrence = { ...input.recurrence };
    item.dueOffsetMinutes = input.dueOffsetMinutes;
    item.ruleVersion += 1;
    item.enabled = input.enabled ?? item.enabled;
    item.updatedBy = user.userId;
    return this.items.save(item);
  }

  async listGenerationRuns(planId: string, user: CurrentUser, query: PaginationQueryDto) {
    const plan = await this.mustGetPlan(planId);
    this.assertPlanManager(plan, user);
    const [data, total] = await this.runs.findAndCount({
      where: { planId },
      order: { requestedAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    });
    return { data, meta: this.pageMeta(total, query.page, query.pageSize) };
  }

  async generate(
    planId: string,
    user: CurrentUser,
    input: GenerationRequestDto,
    requestId: string,
    triggerSource = 'manual',
  ) {
    const plan = await this.mustGetPlan(planId);
    this.assertPlanManager(plan, user);
    if (plan.status !== 'active') throw new ConflictException('Only active plans can generate tasks');
    const windowStart = toBusinessDateTime(input.windowStart);
    const windowEnd = toBusinessDateTime(input.windowEnd);
    if (windowStart >= windowEnd) throw new UnprocessableEntityException('Generation window is invalid');

    const replay = await this.runs.findOneBy({ requestedBy: user.userId, requestId });
    if (replay) {
      if (replay.planId !== planId || replay.windowStart.toISOString() !== windowStart.toISOString() || replay.windowEnd.toISOString() !== windowEnd.toISOString() || replay.mode !== (input.mode ?? 'generate')) {
        throw new ConflictException('Idempotency-Key was already used for a different generation request');
      }
      return replay;
    }

    let run: SafetyTaskGenerationRunEntity;
    try {
      run = await this.runs.save(this.runs.create({
        planId,
        triggerSource,
        mode: input.mode ?? 'generate',
        status: 'running',
        windowStart,
        windowEnd,
        createdCount: 0,
        skippedCount: 0,
        failedCount: 0,
        requestedBy: user.userId,
        requestId,
        completedAt: null,
        failureMessage: null,
      }));
    } catch (error) {
      if (!this.isUniqueViolation(error)) throw error;
      const concurrentReplay = await this.runs.findOneBy({ requestedBy: user.userId, requestId });
      if (!concurrentReplay) throw error;
      if (concurrentReplay.planId !== planId || concurrentReplay.windowStart.toISOString() !== windowStart.toISOString() || concurrentReplay.windowEnd.toISOString() !== windowEnd.toISOString() || concurrentReplay.mode !== (input.mode ?? 'generate')) throw new ConflictException('Idempotency-Key was already used for a different generation request');
      return concurrentReplay;
    }

    try {
      const planItems = await this.items.find({ where: { planId, enabled: true, deletedAt: IsNull() } });
      for (const item of planItems) {
        const occurrences = expandOccurrences(
          item.recurrence as unknown as RecurrenceRule,
          plan.timeZone,
          windowStart,
          windowEnd,
        );
        for (const occurrenceValue of occurrences) {
          const outcome = await this.generateOccurrence(plan, item, run, occurrenceValue, user.userId);
          if (outcome === 'created') run.createdCount += 1;
          else if (outcome === 'skipped') run.skippedCount += 1;
          else run.failedCount += 1;
        }
      }
      run.status = run.failedCount > 0 ? 'failed' : 'succeeded';
      run.completedAt = new Date();
      run = await this.runs.save(run);
      return run;
    } catch (error) {
      run.status = 'failed';
      run.failedCount += 1;
      run.failureMessage = error instanceof Error ? error.message : 'Task generation failed';
      run.completedAt = new Date();
      await this.runs.save(run);
      if (error instanceof UnprocessableEntityException) throw error;
      throw new UnprocessableEntityException(run.failureMessage);
    }
  }

  async listTasks(user: CurrentUser, query: TaskListQueryDto) {
    const allTasks = await this.tasks.find({ where: { deletedAt: IsNull() }, order: { dueAt: 'asc' } });
    const visible = await this.filterVisibleTasks(allTasks, user);
    const now = new Date();
    const filtered = visible.filter((task) => {
      if (query.planId && task.planId !== query.planId) return false;
      if (query.vesselId && task.vesselId !== query.vesselId) return false;
      if (query.status && task.status !== query.status) return false;
      if (query.startAt && task.scheduledAt < toBusinessDateTime(query.startAt)) return false;
      if (query.endAt && task.scheduledAt >= toBusinessDateTime(query.endAt)) return false;
      return true;
    });
    const scoped: SafetyTaskEntity[] = [];
    for (const task of filtered) {
      if (await this.matchesView(task, user, query.view, now)) scoped.push(task);
    }
    const total = scoped.length;
    const calendarRange = Boolean(query.startAt && query.endAt);
    const start = calendarRange ? 0 : (query.page - 1) * query.pageSize;
    const pageSize = calendarRange ? total : query.pageSize;
    return {
      data: await Promise.all(scoped.slice(start, start + pageSize).map((task) => this.taskSummary(task, user, now))),
      meta: {
        total,
        page: calendarRange ? 1 : query.page,
        pageSize,
        totalPages: calendarRange ? (total ? 1 : 0) : Math.ceil(total / query.pageSize),
      },
    };
  }

  async getTask(taskId: string, user: CurrentUser) {
    const task = await this.mustGetTask(taskId);
    await this.assertTaskVisible(task, user);
    return this.taskDetail(task, user);
  }

  async act(taskId: string, user: CurrentUser, input: TaskActionDto, requestId: string) {
    const reason = input.reason?.trim() ?? '';
    const fingerprint = JSON.stringify({ taskId, actionType: input.actionType, reason, ...this.actionMetadata(input) });
    const result = await this.withTaskLock(`action:${user.userId}:${requestId}`, async (manager) => {
      await manager.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`task:${taskId}`]);
      const tasks = manager.getRepository(SafetyTaskEntity);
      const plans = manager.getRepository(SafetyPlanEntity);
      const logs = manager.getRepository(SafetyTaskActionLogEntity);
      let task = await tasks.findOneBy({ id: taskId, deletedAt: IsNull() });
      if (!task) throw new NotFoundException('Task not found');
      const plan = await plans.findOneBy({ id: task.planId, deletedAt: IsNull() });
      if (!plan) throw new NotFoundException('Plan not found');
      if (!this.isAdmin(user) && plan.ownerUserId !== user.userId && task.responsibleUserId !== user.userId && !(await manager.getRepository(SafetyTaskParticipantEntity).findOneBy({ taskId, userId: user.userId, deletedAt: IsNull() }))) throw new ForbiddenException('Task is not visible to the caller');
      const replay = await logs.findOneBy({ operatorUserId: user.userId, requestId });
      if (replay) {
        if (replay.taskId !== taskId || replay.actionType !== input.actionType || replay.metadata.requestFingerprint !== fingerprint) throw new ConflictException('Idempotency-Key was already used for a different task action');
        const messageType: 'transfer' | 'reminder' | 'escalation' | null = input.actionType === 'transfer' ? 'transfer' : input.actionType === 'remind' ? 'reminder' : input.actionType === 'escalate' ? 'escalation' : null;
        const recipient = messageType === 'transfer' ? task.responsibleUserId : messageType ? input.recipientUserId ?? task.responsibleUserId : null;
        const delivery = recipient && messageType
          ? await this.prepareDelivery(manager, task, recipient, messageType, requestId, user.userId)
          : null;
        return { task, replayed: true as const, delivery };
      }
      const context = await this.actionContext(task, plan, user, manager);
      this.assertActionAuthorized(input.actionType, context);
      const before = this.snapshot(task);
      let decision;
      try {
        decision = resolveTaskAction({ status: task.status as TaskStatus, actionType: input.actionType as TaskActionType, reason, actor: context.isManager ? 'plan_owner' : 'executor' });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid task action';
        if (message === 'reason is required') throw new UnprocessableEntityException(message);
        throw new ConflictException(message);
      }
      const previousStatus = task.status;
      if (input.actionType === 'reschedule') {
        if (!input.scheduledAt || !input.dueAt) throw new UnprocessableEntityException('Scheduled and due dates are required');
        const scheduledAt = toBusinessDateTime(input.scheduledAt); const dueAt = toBusinessDateTime(input.dueAt);
        if (dueAt < scheduledAt) throw new UnprocessableEntityException('Due date cannot precede scheduled date');
        task.scheduledAt = scheduledAt; task.dueAt = dueAt;
      } else if (input.actionType === 'complete') task = await this.completeParticipant(task, user.userId, manager);
      else if (input.actionType === 'transfer') task = await this.transferTask(task, user, input, reason, manager);
      else if (input.actionType === 'delegate') await this.delegateTask(task, user, input, reason, manager);
      else { task.status = decision.nextStatus; if (task.status === 'completed') task.completedAt = new Date(); }
      task.updatedBy = user.userId;
      task = await tasks.save(task);
      await logs.save(logs.create({
        taskId,
        actionType: input.actionType,
        operatorUserId: user.userId,
        reason: reason || null,
        fromStatus: previousStatus,
        toStatus: task.status,
        requestId,
        beforeSnapshot: before,
        afterSnapshot: this.snapshot(task),
        metadata: { ...this.actionMetadata(input), requestFingerprint: fingerprint },
        createdBy: user.userId,
      }));
      const messageType: 'transfer' | 'reminder' | 'escalation' | null = input.actionType === 'transfer' ? 'transfer' : input.actionType === 'remind' ? 'reminder' : input.actionType === 'escalate' ? 'escalation' : null;
      const recipient = messageType === 'transfer' ? task.responsibleUserId : messageType ? input.recipientUserId ?? task.responsibleUserId : null;
      if (recipient) await this.assertActivePersonnel(recipient, manager);
      const delivery = recipient && messageType
        ? await this.prepareDelivery(manager, task, recipient, messageType, requestId, user.userId)
        : null;
      return { task, replayed: false as const, delivery };
    });
    if (result.delivery?.status === 'queued') await this.dispatchDelivery(result.delivery, result.task);
    return this.taskDetail(result.task, user);
  }

  async listDeliveries(taskId: string, user: CurrentUser) {
    const task = await this.mustGetTask(taskId);
    await this.assertTaskVisible(task, user);
    return this.deliveries.find({ where: { taskId, deletedAt: IsNull() }, order: { createdAt: 'desc' } });
  }

  async retryDelivery(taskId: string, deliveryId: string, user: CurrentUser, requestId: string) {
    const prepared = await this.withTaskLock(`retry:${user.userId}:${requestId}`, async (manager) => {
      const tasks = manager.getRepository(SafetyTaskEntity); const plans = manager.getRepository(SafetyPlanEntity);
      const deliveries = manager.getRepository(SafetyTaskNotificationDeliveryEntity); const logs = manager.getRepository(SafetyTaskActionLogEntity);
      const task = await tasks.findOneBy({ id: taskId, deletedAt: IsNull() }); if (!task) throw new NotFoundException('Task not found');
      const plan = await plans.findOneBy({ id: task.planId, deletedAt: IsNull() }); if (!plan) throw new NotFoundException('Plan not found');
      if (!this.canManagePlan(plan, user) && task.responsibleUserId !== user.userId) throw new ForbiddenException('Delivery retry is not authorized');
      const delivery = await deliveries.findOneBy({ id: deliveryId, taskId, deletedAt: IsNull() }); if (!delivery) throw new NotFoundException('Delivery not found');
      const replay = await logs.findOneBy({ operatorUserId: user.userId, requestId });
      if (replay) {
        if (replay.taskId !== taskId || replay.actionType !== 'retry_notification' || replay.metadata.deliveryId !== deliveryId) throw new ConflictException('Idempotency-Key was already used for a different delivery retry');
        return { task, delivery, dispatch: false };
      }
      if (delivery.status !== 'failed') throw new ConflictException('Only failed deliveries can be retried');
      if (delivery.attemptCount >= MAX_DELIVERY_ATTEMPTS) throw new ConflictException('Delivery retry limit reached');
      delivery.status = 'queued'; delivery.updatedBy = user.userId; await deliveries.save(delivery);
      await logs.save(logs.create({ taskId, actionType: 'retry_notification', operatorUserId: user.userId, reason: null, fromStatus: task.status, toStatus: task.status, requestId, beforeSnapshot: {}, afterSnapshot: {}, metadata: { deliveryId }, createdBy: user.userId }));
      return { task, delivery, dispatch: true };
    });
    return prepared.dispatch ? this.dispatchDelivery(prepared.delivery, prepared.task) : prepared.delivery;
  }

  async processDueDeliveries(user: CurrentUser) {
    if (!this.isAdmin(user)) throw new ForbiddenException('Only an administrator may process the delivery queue');
    const now = new Date();
    await this.deliveries.update(
      { status: 'dispatching', updatedAt: LessThanOrEqual(new Date(now.getTime() - 15 * 60_000)), deletedAt: IsNull() },
      { status: 'failed', failureReason: 'dispatch lease expired', nextRetryAt: now, updatedBy: user.userId },
    );
    const due = await this.deliveries.find({
      where: [
        { status: 'queued', deletedAt: IsNull() },
        { status: 'failed', attemptCount: LessThan(MAX_DELIVERY_ATTEMPTS), nextRetryAt: LessThanOrEqual(now), deletedAt: IsNull() },
      ],
      order: { createdAt: 'asc' },
      take: 100,
    });
    let sent = 0;
    let failed = 0;
    let skipped = 0;
    for (const delivery of due) {
      const task = await this.mustGetTask(delivery.taskId);
      const result = await this.dispatchDelivery(delivery, task);
      if (result.status === 'sent') sent += 1;
      else if (result.status === 'skipped') skipped += 1;
      else failed += 1;
    }
    return { processed: due.length, sent, failed, skipped };
  }

  async runScheduledCycle(now = new Date()) {
    const systemUser: CurrentUser = {
      userId: 'plan-task-scheduler',
      corpId: 'system',
      name: '计划任务调度器',
      avatar: null,
      departments: [],
      position: null,
      roles: ['system_admin'],
      isAdmin: true,
    };
    const cycleKey = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(now);
    const windowEnd = new Date(now.getTime() + 62 * 86_400_000);
    const activePlans = await this.plans.find({ where: { status: 'active', deletedAt: IsNull() } });
    let created = 0;
    let skipped = 0;
    let failed = 0;
    for (const plan of activePlans) {
      const run = await this.generate(
        plan.id,
        systemUser,
        { windowStart: now.toISOString(), windowEnd: windowEnd.toISOString(), mode: 'generate' },
        `cron:${plan.id}:${cycleKey}`,
        'cron',
      );
      created += run.createdCount;
      skipped += run.skippedCount;
      failed += run.failedCount;
    }
    const escalated = await this.processOverdueEscalations(systemUser, cycleKey, now);
    const deliveries = await this.processDueDeliveries(systemUser);
    return { plans: activePlans.length, created, skipped, failed, escalated, deliveries };
  }

  private async processOverdueEscalations(user: CurrentUser, cycleKey: string, now: Date) {
    const candidates = await this.tasks.find({ where: { deletedAt: IsNull() } });
    let escalated = 0;
    for (const task of candidates) {
      if (!isTaskOverdue(task.status as TaskStatus, task.dueAt, now)) continue;
      const plan = await this.mustGetPlan(task.planId);
      const before = await this.deliveries.count({
        where: { dedupeKey: `${task.id}:${plan.ownerUserId}:escalation:overdue:${cycleKey}`, deletedAt: IsNull() },
      });
      await this.enqueueAndDispatch(task, plan.ownerUserId, 'escalation', `overdue:${cycleKey}`, user.userId);
      if (!before) escalated += 1;
    }
    return escalated;
  }

  private generateOccurrence(
    plan: SafetyPlanEntity,
    item: SafetyPlanItemEntity,
    run: SafetyTaskGenerationRunEntity,
    occurrenceValue: string,
    actor: string,
  ): Promise<'created' | 'skipped' | 'failed'> {
    return this.generateOccurrenceLocked(plan, item, run, occurrenceValue, actor);
  }

  private async generateOccurrenceLocked(
    plan: SafetyPlanEntity,
    item: SafetyPlanItemEntity,
    run: SafetyTaskGenerationRunEntity,
    occurrenceValue: string,
    actor: string,
  ): Promise<'created' | 'skipped' | 'failed'> {
    const occurrence = new Date(occurrenceValue);
    const generationKey = buildGenerationKey(item.id, item.ruleVersion, occurrenceValue);
    let prepared: { task: SafetyTaskEntity; outcome: 'created' | 'skipped'; delivery: SafetyTaskNotificationDeliveryEntity | null };
    try {
      prepared = await this.dataSource.transaction(async (manager) => {
        await manager.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`generation:${generationKey}`]);
        const tasks = manager.getRepository(SafetyTaskEntity);
        const participants = manager.getRepository(SafetyTaskParticipantEntity);
        const entries = manager.getRepository(SafetyTaskGenerationEntryEntity);
        let task = await tasks.findOneBy({ generationKey, deletedAt: IsNull() });
        let outcome: 'created' | 'skipped' = 'skipped';
        if (!task) {
          task = await tasks.save(tasks.create({
            planId: plan.id, planItemId: item.id, generationKey, title: item.title, status: 'pending',
            responsibleUserId: item.responsibleUserId, scheduledAt: occurrence,
            dueAt: new Date(occurrence.getTime() + item.dueOffsetMinutes * 60_000), completedAt: null,
            vesselId: plan.vesselId, scopeSnapshot: plan.scopeSnapshot, ruleVersion: item.ruleVersion,
            createdBy: actor, updatedBy: actor, deletedAt: null,
          }));
          outcome = 'created';
        }
        const participantCount = await participants.count({ where: { taskId: task.id, deletedAt: IsNull() } });
        if (outcome === 'created' || (run.mode === 'reconcile' && participantCount === 0)) {
          await participants.save([
            participants.create({ taskId: task.id, userId: item.responsibleUserId, role: 'executor', status: 'active', effectiveFrom: occurrence, effectiveUntil: null, transferredToUserId: null, completedAt: null, createdBy: actor, updatedBy: actor, deletedAt: null }),
            ...item.participantSnapshot.map((participant) => participants.create({ taskId: task.id, userId: participant.userId, role: participant.role, status: 'active', effectiveFrom: occurrence, effectiveUntil: null, transferredToUserId: null, completedAt: null, createdBy: actor, updatedBy: actor, deletedAt: null })),
          ]);
        }
        await entries.save(entries.create({
          runId: run.id, planItemId: item.id, generationKey, occurrenceAt: occurrence,
          status: outcome === 'created' ? 'succeeded' : 'skipped', taskId: task.id, attemptCount: 1,
          failureCode: null, failureMessage: null,
        }));
        const delivery = outcome === 'created'
          ? await this.prepareDelivery(manager, task, task.responsibleUserId, 'assignment', generationKey, actor)
          : null;
        return { task, outcome, delivery };
      });
    } catch (error) {
      await this.dataSource.transaction(async (manager) => {
        await manager.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`generation:${generationKey}`]);
        const entries = manager.getRepository(SafetyTaskGenerationEntryEntity);
        const existing = await entries.findOneBy({ runId: run.id, generationKey });
        if (!existing) {
          await entries.save(entries.create({
            runId: run.id, planItemId: item.id, generationKey, occurrenceAt: occurrence, status: 'failed',
            taskId: null, attemptCount: 1, failureCode: 'generation_failed',
            failureMessage: error instanceof Error ? error.message : 'generation failed',
          }));
        }
      });
      return 'failed';
    }
    if (prepared.delivery?.status === 'queued') await this.dispatchDelivery(prepared.delivery, prepared.task);
    return prepared.outcome;
  }

  private async completeParticipant(task: SafetyTaskEntity, actor: string, manager?: EntityManager) {
    const participants = manager?.getRepository(SafetyTaskParticipantEntity) ?? this.participants;
    const items = manager?.getRepository(SafetyPlanItemEntity) ?? this.items;
    let participant = await participants.findOneBy({ taskId: task.id, userId: actor, status: 'active', deletedAt: IsNull() });
    const actingParticipant = participant;
    if (participant?.role === 'delegate') {
      const delegation = await this.activeDelegation(task.id, actor, manager);
      if (delegation) {
        participant = await participants.findOneBy({
          taskId: task.id,
          userId: delegation.delegatorUserId,
          role: 'executor',
          status: 'active',
          deletedAt: IsNull(),
        });
      }
    }
    if (!participant || !EXECUTION_ROLES.has(participant.role)) {
      throw new ForbiddenException('The caller cannot complete this task');
    }
    participant.completedAt = new Date();
    participant.updatedBy = actor;
    await participants.save(participant);
    if (actingParticipant && actingParticipant.id !== participant.id) {
      actingParticipant.completedAt = participant.completedAt;
      actingParticipant.updatedBy = actor;
      await participants.save(actingParticipant);
    }
    const item = await items.findOneByOrFail({ id: task.planItemId });
    const executionParticipants = await participants.find({
      where: {
        taskId: task.id,
        status: 'active',
        role: In(['executor', 'collaborator']),
        deletedAt: IsNull(),
      },
    });
    const completed = executionParticipants.filter((row) => row.completedAt !== null).length;
    const threshold = item.completionRule === 'any'
      ? 1
      : item.completionRule === 'quorum'
        ? item.quorumCount ?? executionParticipants.length
        : executionParticipants.length;
    task.status = completed >= threshold ? 'completed' : 'in_progress';
    task.completedAt = task.status === 'completed' ? new Date() : null;
    return task;
  }

  private async transferTask(task: SafetyTaskEntity, user: CurrentUser, input: TaskActionDto, reason: string, manager: EntityManager) {
    const target = input.transferToUserId?.trim();
    if (!target || target === task.responsibleUserId) throw new UnprocessableEntityException('A different transfer target is required');
    await this.assertActivePersonnel(target, manager);
    const fromUserId = task.responsibleUserId;
    const participantRepository = manager.getRepository(SafetyTaskParticipantEntity);
      await participantRepository.update(
        { taskId: task.id, userId: fromUserId, role: 'executor', status: 'active' },
        { status: 'transferred', transferredToUserId: target, updatedBy: user.userId },
      );
      await manager.getRepository(SafetyTaskDelegationEntity).update(
        { taskId: task.id, delegatorUserId: fromUserId, status: 'active', deletedAt: IsNull() },
        { status: 'withdrawn', updatedBy: user.userId },
      );
      await participantRepository.update(
        { taskId: task.id, role: 'delegate', status: 'active' },
        { status: 'withdrawn', updatedBy: user.userId },
      );
      await participantRepository.save(participantRepository.create({ taskId: task.id, userId: target, role: 'executor', status: 'active', effectiveFrom: new Date(), effectiveUntil: null, transferredToUserId: null, completedAt: null, createdBy: user.userId, updatedBy: user.userId, deletedAt: null }));
      const transferRepository = manager.getRepository(SafetyTaskTransferEntity);
      await transferRepository.save(transferRepository.create({ taskId: task.id, fromUserId, toUserId: target, reason, transferredBy: user.userId }));
      task.responsibleUserId = target;
      task.updatedBy = user.userId;
    return manager.getRepository(SafetyTaskEntity).save(task);
  }

  private async delegateTask(task: SafetyTaskEntity, user: CurrentUser, input: TaskActionDto, reason: string, manager: EntityManager) {
    const delegateUserId = input.delegateUserId?.trim();
    const effectiveUntil = input.delegateUntil ? toBusinessDateTime(input.delegateUntil) : null;
    if (!delegateUserId || delegateUserId === task.responsibleUserId || !effectiveUntil || effectiveUntil <= new Date()) {
      throw new UnprocessableEntityException('A different delegate and future delegateUntil are required');
    }
    await this.assertActivePersonnel(delegateUserId, manager);
    const delegations = manager.getRepository(SafetyTaskDelegationEntity);
    const participants = manager.getRepository(SafetyTaskParticipantEntity);
    const now = new Date();
    await delegations.update({ taskId: task.id, status: 'active', effectiveUntil: LessThan(now), deletedAt: IsNull() }, { status: 'expired', updatedBy: user.userId });
    await participants.update({ taskId: task.id, role: 'delegate', status: 'active', effectiveUntil: LessThan(now) }, { status: 'withdrawn', updatedBy: user.userId });
    await delegations.save(delegations.create({
      taskId: task.id,
      delegatorUserId: task.responsibleUserId,
      delegateUserId,
      effectiveFrom: new Date(),
      effectiveUntil,
      reason,
      status: 'active',
      createdBy: user.userId,
      updatedBy: user.userId,
      deletedAt: null,
    }));
    await participants.save(participants.create({
      taskId: task.id,
      userId: delegateUserId,
      role: 'delegate',
      status: 'active',
      effectiveFrom: new Date(),
      effectiveUntil,
      transferredToUserId: null,
      completedAt: null,
      createdBy: user.userId,
      updatedBy: user.userId,
      deletedAt: null,
    }));
  }

  private async enqueueAndDispatch(
    task: SafetyTaskEntity,
    recipientUserId: string,
    messageType: 'assignment' | 'reminder' | 'escalation' | 'transfer',
    cycleKey: string,
    actor: string,
  ) {
    const delivery = await this.dataSource.transaction((manager) =>
      this.prepareDelivery(manager, task, recipientUserId, messageType, cycleKey, actor),
    );
    if (delivery.status === 'failed') return delivery;
    return this.dispatchDelivery(delivery, task);
  }

  private async prepareDelivery(
    manager: EntityManager,
    task: SafetyTaskEntity,
    recipientUserId: string,
    messageType: 'assignment' | 'reminder' | 'escalation' | 'transfer',
    cycleKey: string,
    actor: string,
  ) {
    const deliveries = manager.getRepository(SafetyTaskNotificationDeliveryEntity);
    const dedupeKey = `${task.id}:${recipientUserId}:${messageType}:${cycleKey}`;
    await manager.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`delivery:${dedupeKey}`]);
    let delivery = await deliveries.findOneBy({ dedupeKey, deletedAt: IsNull() });
    if (delivery?.status === 'sent' || delivery?.status === 'skipped') return delivery;
    if (delivery?.status === 'failed') return delivery;
    if (!delivery) {
      delivery = await deliveries.save(deliveries.create({
          taskId: task.id,
          recipientUserId,
          messageType,
          dedupeKey,
          payloadSnapshot: { taskId: task.id, title: task.title, dueAt: task.dueAt.toISOString() },
          status: 'queued',
          attemptCount: 0,
          attemptHistory: [],
          wecomErrcode: null,
          failureReason: null,
          nextRetryAt: null,
          sentAt: null,
          createdBy: actor,
          updatedBy: actor,
          deletedAt: null,
      }));
    }
    return delivery;
  }

  private async dispatchDelivery(delivery: SafetyTaskNotificationDeliveryEntity, task: SafetyTaskEntity) {
    if (delivery.status === 'sent' || delivery.status === 'skipped') return delivery;
    const claim = await this.deliveries.createQueryBuilder()
      .update(SafetyTaskNotificationDeliveryEntity)
      .set({ status: 'dispatching', attemptCount: () => 'attempt_count + 1' })
      .where('id = :id AND status IN (:...claimable) AND attempt_count < :maxAttempts', { id: delivery.id, claimable: ['queued', 'failed'], maxAttempts: MAX_DELIVERY_ATTEMPTS })
      .execute();
    if (!claim.affected) return this.deliveries.findOneByOrFail({ id: delivery.id });
    delivery = await this.deliveries.findOneByOrFail({ id: delivery.id });
    const attemptedAt = new Date();
    delivery.wecomErrcode = null;
    try {
      const result = await this.wecomMessageService.sendTextCard({
        userIds: [delivery.recipientUserId],
        title: this.messageTitle(delivery.messageType),
        description: `<div class="gray">期限：${task.dueAt.toLocaleString('zh-CN')}</div><div class="normal">${task.title}</div>`,
        url: `${(process.env.WEB_PUBLIC_URL ?? '').replace(/\/$/, '')}/workbench/tasks/${task.id}?notificationId=${delivery.id}`,
        btnText: '查看任务',
      });
      delivery.wecomErrcode = result.errcode ?? null;
      if (result.invalidUser.includes(delivery.recipientUserId)) {
        delivery.status = 'skipped';
        delivery.failureReason = 'invalid user';
        delivery.nextRetryAt = null;
      } else if (result.success) {
        delivery.status = 'sent';
        delivery.sentAt = new Date();
        delivery.failureReason = null;
        delivery.nextRetryAt = null;
      } else {
        delivery.status = 'failed';
        delivery.failureReason = result.failureReason ?? 'WeCom API error';
        delivery.nextRetryAt = delivery.attemptCount < MAX_DELIVERY_ATTEMPTS ? new Date(Date.now() + this.retryBackoffMs(delivery.attemptCount)) : null;
      }
    } catch (error) {
      delivery.status = 'failed';
      delivery.failureReason = error instanceof Error ? error.message : 'WeCom send failed';
      delivery.nextRetryAt = delivery.attemptCount < MAX_DELIVERY_ATTEMPTS ? new Date(Date.now() + this.retryBackoffMs(delivery.attemptCount)) : null;
    }
    delivery.attemptHistory = [
      ...(delivery.attemptHistory ?? []),
      {
        attempt: delivery.attemptCount,
        attemptedAt: attemptedAt.toISOString(),
        status: delivery.status,
        wecomErrcode: delivery.wecomErrcode,
        failureReason: delivery.failureReason,
      },
    ];
    return this.deliveries.save(delivery);
  }

  private async planResponse(plan: SafetyPlanEntity, includeItems = false) {
    const tasks = await this.tasks.find({ where: { planId: plan.id, deletedAt: IsNull() } });
    const taskSummary = {
      total: tasks.length,
      pending: tasks.filter((task) => task.status === 'pending').length,
      inProgress: tasks.filter((task) => task.status === 'in_progress').length,
      blocked: tasks.filter((task) => task.status === 'blocked').length,
      completed: tasks.filter((task) => task.status === 'completed').length,
      cancelled: tasks.filter((task) => task.status === 'cancelled').length,
      overdue: tasks.filter((task) => isTaskOverdue(task.status as TaskStatus, task.dueAt, new Date())).length,
    };
    const denominator = taskSummary.total - taskSummary.cancelled;
    return {
      ...plan,
      completionRate: denominator ? taskSummary.completed / denominator : 0,
      taskSummary,
      ...(includeItems ? { items: await this.items.find({ where: { planId: plan.id, deletedAt: IsNull() }, order: { createdAt: 'asc' } }) } : {}),
    };
  }

  private async taskSummary(task: SafetyTaskEntity, user: CurrentUser, now = new Date()) {
    return {
      ...task,
      isOverdue: isTaskOverdue(task.status as TaskStatus, task.dueAt, now),
      availableActions: await this.availableActions(task, user),
    };
  }

  private async taskDetail(task: SafetyTaskEntity, user: CurrentUser) {
    return {
      ...(await this.taskSummary(task, user)),
      participants: await this.participants.find({ where: { taskId: task.id, deletedAt: IsNull() }, order: { createdAt: 'asc' } }),
      actionLogs: await this.logs.find({ where: { taskId: task.id }, order: { createdAt: 'desc' } }),
      transfers: await this.transfers.find({ where: { taskId: task.id }, order: { createdAt: 'desc' } }),
      delegations: await this.delegations.find({ where: { taskId: task.id, deletedAt: IsNull() }, order: { createdAt: 'desc' } }),
      notificationDeliveries: await this.deliveries.find({ where: { taskId: task.id, deletedAt: IsNull() }, order: { createdAt: 'desc' } }),
    };
  }

  private async filterVisibleTasks(tasks: SafetyTaskEntity[], user: CurrentUser) {
    if (this.isAdmin(user)) return tasks;
    const ownedPlanIds = new Set((await this.plans.find({ where: { ownerUserId: user.userId, deletedAt: IsNull() } })).map((plan) => plan.id));
    const participantTaskIds = new Set((await this.participants.find({ where: { userId: user.userId, deletedAt: IsNull() } })).map((row) => row.taskId));
    return tasks.filter((task) => ownedPlanIds.has(task.planId) || task.responsibleUserId === user.userId || participantTaskIds.has(task.id));
  }

  private async matchesView(task: SafetyTaskEntity, user: CurrentUser, view: string, now: Date) {
    if (view === 'initiated') {
      const plan = await this.mustGetPlan(task.planId);
      return this.isAdmin(user) || plan.ownerUserId === user.userId;
    }
    if (view === 'participated') {
      return (await this.participants.count({ where: { taskId: task.id, userId: user.userId, deletedAt: IsNull() } })) > 0;
    }
    if (view === 'completed') return task.status === 'completed';
    if (view === 'overdue') return isTaskOverdue(task.status as TaskStatus, task.dueAt, now);
    if (TERMINAL_TASK_STATUSES.has(task.status)) return false;
    const participant = await this.activeExecutionParticipant(task.id, user.userId, now);
    return participant !== null;
  }

  private async actionContext(task: SafetyTaskEntity, plan: SafetyPlanEntity, user: CurrentUser, manager?: EntityManager) {
    const now = new Date();
    return {
      isManager: this.canManagePlan(plan, user),
      isResponsible: task.responsibleUserId === user.userId,
      canExecute: (await this.activeExecutionParticipant(task.id, user.userId, now, manager)) !== null,
    };
  }

  private assertActionAuthorized(action: string, context: { isManager: boolean; isResponsible: boolean; canExecute: boolean }) {
    if (MANAGEMENT_ACTIONS.has(action) && !context.isManager) throw new ForbiddenException('Task management action is not authorized');
    if (action === 'delegate' && !context.isManager && !context.isResponsible) throw new ForbiddenException('Task delegation is not authorized');
    if (['start', 'complete', 'block'].includes(action) && !context.canExecute) throw new ForbiddenException('Task execution is not authorized');
  }

  private async availableActions(task: SafetyTaskEntity, user: CurrentUser) {
    if (TERMINAL_TASK_STATUSES.has(task.status)) return [];
    const plan = await this.mustGetPlan(task.planId);
    const context = await this.actionContext(task, plan, user);
    const actions: string[] = [];
    if (context.canExecute) {
      if (task.status === 'pending') actions.push('start');
      if (['pending', 'in_progress', 'blocked'].includes(task.status)) actions.push('complete');
      if (['pending', 'in_progress'].includes(task.status)) actions.push('block');
    }
    if (context.isManager) actions.push('reschedule', 'cancel', 'remind', 'escalate', 'transfer');
    if (context.isManager || context.isResponsible) actions.push('delegate');
    return actions;
  }

  private async activeExecutionParticipant(taskId: string, userId: string, now: Date, manager?: EntityManager) {
    const participants = manager?.getRepository(SafetyTaskParticipantEntity) ?? this.participants;
    const participant = await participants.findOneBy({ taskId, userId, status: 'active', deletedAt: IsNull() });
    if (!participant || !EXECUTION_ROLES.has(participant.role)) return null;
    if (participant.completedAt) return null;
    if (participant.effectiveFrom && participant.effectiveFrom > now) return null;
    if (participant.effectiveUntil && participant.effectiveUntil < now) return null;
    if (participant.role === 'delegate' && !(await this.activeDelegation(taskId, userId, manager))) return null;
    return participant;
  }

  private activeDelegation(taskId: string, delegateUserId: string, manager?: EntityManager) {
    const now = new Date();
    const delegations = manager?.getRepository(SafetyTaskDelegationEntity) ?? this.delegations;
    return delegations.findOne({
      where: {
        taskId,
        delegateUserId,
        status: 'active',
        effectiveUntil: LessThanOrEqual(new Date('9999-12-31T00:00:00.000Z')),
        deletedAt: IsNull(),
      },
    }).then((row) => row && row.effectiveFrom <= now && row.effectiveUntil >= now ? row : null);
  }

  private async assertTaskVisible(task: SafetyTaskEntity, user: CurrentUser) {
    if (this.isAdmin(user)) return;
    const plan = await this.mustGetPlan(task.planId);
    if (plan.ownerUserId === user.userId || task.responsibleUserId === user.userId) return;
    if (await this.participants.findOneBy({ taskId: task.id, userId: user.userId, deletedAt: IsNull() })) return;
    throw new ForbiddenException('Task is not visible to the caller');
  }

  private async validatePlanItem(input: PlanItemInputDto) {
    if (input.completionRule === 'quorum' && (!input.quorumCount || input.quorumCount < 1)) {
      throw new UnprocessableEntityException('quorumCount is required for quorum completion');
    }
    if (input.completionRule !== 'quorum' && input.quorumCount) {
      throw new UnprocessableEntityException('quorumCount is only valid for quorum completion');
    }
    const participantCount = 1 + new Set((input.participantUserIds ?? []).filter((id) => id !== input.responsibleUserId)).size;
    if (input.completionRule === 'quorum' && (input.quorumCount ?? 0) > participantCount) {
      throw new UnprocessableEntityException('quorumCount exceeds participant count');
    }
    try {
      expandOccurrences(input.recurrence as RecurrenceRule, 'Asia/Shanghai', toBusinessDateTime(input.recurrence.startAt), new Date(toBusinessDateTime(input.recurrence.startAt).getTime() + 370 * 86_400_000));
    } catch (error) {
      throw new UnprocessableEntityException(error instanceof Error ? error.message : 'Invalid recurrence rule');
    }
    await Promise.all([
      this.assertActivePersonnel(input.responsibleUserId),
      ...[...new Set(input.participantUserIds ?? [])].map((userId) => this.assertActivePersonnel(userId)),
    ]);
  }

  private async assertActivePersonnel(userId: string, manager?: EntityManager) {
    const personnel = manager?.getRepository(PersonnelEntity) ?? this.personnel;
    const person = await personnel.findOne({ where: { wecomUserId: userId, deletedAt: IsNull() } });
    if (!person || person.employmentStatus !== 'active') {
      throw new UnprocessableEntityException(`Active personnel mapping not found for ${userId}`);
    }
  }

  private async assertActiveVessel(vesselId: string) {
    const vessel = await this.vessels.findOne({ where: { id: vesselId, deletedAt: IsNull() } });
    if (!vessel || vessel.status !== 'active') throw new UnprocessableEntityException('Active vessel not found');
    return vessel;
  }

  private assertVesselScope(vessel: VesselEntity, user: CurrentUser) {
    if (this.isAdmin(user) || user.roles.some((role) => ['shipping', 'general_office'].includes(role))) return;
    if (user.departments.includes(`vessel:${vessel.id}`) || user.departments.includes(`vessel:${vessel.code}`)) return;
    throw new ForbiddenException('Plan vessel is outside the caller scope');
  }

  private snapshot(task: SafetyTaskEntity): TaskSnapshot {
    return {
      status: task.status,
      responsibleUserId: task.responsibleUserId,
      scheduledAt: task.scheduledAt.toISOString(),
      dueAt: task.dueAt.toISOString(),
    };
  }

  private actionMetadata(input: TaskActionDto) {
    return {
      scheduledAt: input.scheduledAt ?? null,
      dueAt: input.dueAt ?? null,
      recipientUserId: input.recipientUserId ?? null,
      delegateUserId: input.delegateUserId ?? null,
      delegateUntil: input.delegateUntil ?? null,
      transferToUserId: input.transferToUserId ?? null,
    };
  }

  private messageTitle(type: string) {
    if (type === 'assignment') return '安全任务待办';
    if (type === 'transfer') return '安全任务已转移';
    if (type === 'escalation') return '安全任务逾期升级';
    return '安全任务催办';
  }

  private retryBackoffMs(attempt: number) {
    return Math.min(30_000 * 2 ** Math.max(0, attempt - 1), 15 * 60_000);
  }

  private isUniqueViolation(error: unknown) {
    const value = error as { code?: string; driverError?: { code?: string } };
    return value.code === '23505' || value.driverError?.code === '23505';
  }

  private isAdmin(user: CurrentUser) {
    return user.isAdmin || user.roles.includes('system_admin');
  }

  private canManagePlan(plan: SafetyPlanEntity, user: CurrentUser) {
    return this.isAdmin(user) || plan.ownerUserId === user.userId;
  }

  private assertPlanManager(plan: SafetyPlanEntity, user: CurrentUser) {
    if (!this.canManagePlan(plan, user)) throw new ForbiddenException('Plan management is not authorized');
  }

  private async mustGetPlan(planId: string) {
    const plan = await this.plans.findOneBy({ id: planId, deletedAt: IsNull() });
    if (!plan) throw new NotFoundException('Plan not found');
    return plan;
  }

  private async mustGetTask(taskId: string) {
    const task = await this.tasks.findOneBy({ id: taskId, deletedAt: IsNull() });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  private pageMeta(total: number, page: number, pageSize: number) {
    return { total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  private withTaskLock<T>(lockKey: string, action: (manager: EntityManager) => Promise<T>) {
    return this.dataSource.transaction(async (manager) => {
      await manager.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [lockKey]);
      return action(manager);
    });
  }
}
