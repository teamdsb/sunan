import type { CanActivate, ExecutionContext, INestApplication } from '@nestjs/common';
import { Module } from '@nestjs/common';
import type { Server } from 'node:http';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import request from 'supertest';
import { DataSource } from 'typeorm';

import { configureApp } from 'src/app.bootstrap';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PlanTaskModule } from 'src/modules/plan-task/plan-task.module';
import { PlanTaskService } from 'src/modules/plan-task/plan-task.service';
import { WecomMessageService } from 'src/modules/wecom/wecom-message.service';
import {
  bootstrapPgTestDatabase,
  buildPgTypeOrmOptions,
  shutdownPgTestDatabase,
} from 'test/pg-test-container';

type TestUser = {
  userId: string;
  corpId: string;
  name: string;
  avatar: null;
  departments: string[];
  position: string;
  roles: string[];
  isAdmin: boolean;
};

const makeUser = (userId: string, roles = ['all_authenticated']): TestUser => ({
  userId,
  corpId: 'ww-test',
  name: userId,
  avatar: null,
  departments: ['船务部'],
  position: roles.includes('system_admin') ? '管理员' : '船员',
  roles,
  isAdmin: roles.includes('system_admin'),
});

let currentUser = makeUser('plan-owner', ['all_authenticated', 'shipping']);
const authGuard: CanActivate = {
  canActivate(context: ExecutionContext) {
    context.switchToHttp().getRequest<{ user?: unknown }>().user = currentUser;
    return true;
  },
};

type MessageResult = { success: boolean; invalidUser: string[]; errcode?: number; failureReason?: string };
const sendTextCard = jest.fn<Promise<MessageResult>, [unknown?]>(async () => ({
  success: true,
  invalidUser: [],
}));

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: async () => {
        await bootstrapPgTestDatabase();
        return buildPgTypeOrmOptions();
      },
    }),
    PlanTaskModule,
  ],
})
class TestModule {}

describe('Plan task integration', () => {
  let app: INestApplication<Server>;
  let source: DataSource;
  let planTaskService: PlanTaskService;

  beforeAll(async () => {
    const ref = await Test.createTestingModule({ imports: [TestModule] })
      .overrideGuard(JwtAuthGuard)
      .useValue(authGuard)
      .overrideProvider(WecomMessageService)
      .useValue({ sendTextCard })
      .compile();
    app = ref.createNestApplication();
    configureApp(app);
    await app.init();
    source = ref.get(DataSource);
    planTaskService = ref.get(PlanTaskService);
  });

  beforeEach(async () => {
    currentUser = makeUser('plan-owner', ['all_authenticated', 'shipping']);
    sendTextCard.mockReset();
    sendTextCard.mockResolvedValue({ success: true, invalidUser: [] });
    await source.query(`
      TRUNCATE TABLE
        safety_task_notification_deliveries,
        safety_task_generation_entries,
        safety_task_generation_runs,
        safety_task_action_logs,
        safety_task_delegations,
        safety_task_transfers,
        safety_task_participants,
        safety_tasks,
        safety_plan_items,
        safety_plans
      RESTART IDENTITY CASCADE
    `);
    await source.query(`
      INSERT INTO personnel (wecom_user_id,name,department_code,employment_status,is_sync_from_wecom)
      VALUES
        ('plan-owner','Plan Owner','shipping','active',true),
        ('crew-old','Crew Old','shipping','active',true),
        ('crew-peer','Crew Peer','shipping','active',true),
        ('crew-new','Crew New','shipping','active',true),
        ('crew-agent','Crew Agent','shipping','active',true)
      ON CONFLICT (wecom_user_id) WHERE deleted_at IS NULL AND wecom_user_id IS NOT NULL DO UPDATE SET employment_status='active', deleted_at=NULL
    `);
  });

  afterAll(async () => {
    await app?.close();
    await shutdownPgTestDatabase();
  });

  async function createPlanWithItem(overrides: Record<string, unknown> = {}) {
    const plan = await request(app.getHttpServer())
      .post('/api/v1/plans')
      .set('Idempotency-Key', `create-${crypto.randomUUID()}`)
      .send({ title: '月末任务', planType: 'monthly', timeZone: 'Asia/Shanghai' });
    expect(plan.status).toBe(201);
    const planId = plan.body.data.id as string;
    const item = await request(app.getHttpServer())
      .post(`/api/v1/plans/${planId}/items`)
      .set('Idempotency-Key', `item-${crypto.randomUUID()}`)
      .send({
        title: '月度检查',
        responsibleUserId: 'crew-old',
        participantUserIds: ['crew-peer'],
        completionRule: 'any',
        dueOffsetMinutes: 60,
        recurrence: {
          kind: 'monthly',
          startAt: '2026-01-31T09:00:00+08:00',
          dayOfMonth: 31,
        },
        ...overrides,
      });
    expect(item.status).toBe(201);
    const activation = await request(app.getHttpServer())
      .post(`/api/v1/plans/${planId}/actions`)
      .set('Idempotency-Key', `activate-${crypto.randomUUID()}`)
      .send({ actionType: 'activate' });
    expect(activation.status).toBe(200);
    return { planId, itemId: item.body.data.id as string };
  }

  async function generate(planId: string, start = '2026-02-01T00:00:00.000Z', end = '2026-03-01T00:00:00.000Z') {
    return request(app.getHttpServer())
      .post(`/api/v1/plans/${planId}/generation-runs`)
      .set('Idempotency-Key', `generate-${crypto.randomUUID()}`)
      .send({ windowStart: start, windowEnd: end, mode: 'generate' });
  }

  it('persists generation runs and does not duplicate tasks under concurrent generation', async () => {
    const { planId } = await createPlanWithItem();
    const generated = await Promise.all([generate(planId), generate(planId)]);
    expect(generated.map((entry) => entry.status)).toEqual([202, 202]);
    expect(await source.query(`SELECT id FROM safety_tasks`)).toHaveLength(1);
    const runs = await request(app.getHttpServer()).get(`/api/v1/plans/${planId}/generation-runs`);
    expect(runs.status).toBe(200);
    expect(runs.body.data).toHaveLength(2);
    expect(runs.body.meta).toEqual(expect.objectContaining({ total: 2, page: 1, pageSize: 20 }));
    expect(
      runs.body.data.reduce((sum: number, run: { createdCount: number }) => sum + run.createdCount, 0),
    ).toBe(1);
    expect(
      runs.body.data.reduce((sum: number, run: { skippedCount: number }) => sum + run.skippedCount, 0),
    ).toBe(1);
    const assignments = await source.query(`SELECT status, dedupe_key FROM safety_task_notification_deliveries WHERE message_type='assignment'`);
    expect(assignments).toHaveLength(1);
    expect(sendTextCard).toHaveBeenCalledTimes(1);
    expect(sendTextCard).toHaveBeenCalledWith(expect.objectContaining({ url: expect.stringContaining('/workbench/tasks/') }));
  });

  it('rolls back task creation atomically and records a failed occurrence when participant persistence fails', async () => {
    const { planId } = await createPlanWithItem();
    await source.query(`ALTER TABLE safety_task_participants ADD CONSTRAINT ck_test_reject_executor CHECK (user_id <> 'crew-old')`);
    let failedRun;
    try {
      failedRun = await planTaskService.generate(
        planId,
        currentUser,
        { windowStart: '2026-02-01T00:00:00.000Z', windowEnd: '2026-03-01T00:00:00.000Z', mode: 'generate' },
        `generation-failure-${crypto.randomUUID()}`,
      );
    } finally {
      await source.query(`ALTER TABLE safety_task_participants DROP CONSTRAINT ck_test_reject_executor`);
    }
    expect(failedRun).toEqual(expect.objectContaining({ status: 'failed', failedCount: 1 }));
    expect(await source.query(`SELECT id FROM safety_tasks`)).toHaveLength(0);
    expect(await source.query(`SELECT status,task_id,failure_code FROM safety_task_generation_entries`)).toEqual([
      expect.objectContaining({ status: 'failed', task_id: null, failure_code: 'generation_failed' }),
    ]);

    const reconciled = await planTaskService.generate(
      planId,
      currentUser,
      { windowStart: '2026-02-01T00:00:00.000Z', windowEnd: '2026-03-01T00:00:00.000Z', mode: 'reconcile' },
      `generation-reconcile-${crypto.randomUUID()}`,
    );
    expect(reconciled).toEqual(expect.objectContaining({ status: 'succeeded', createdCount: 1 }));
    expect(await source.query(`SELECT id FROM safety_tasks`)).toHaveLength(1);
    expect(await source.query(`SELECT id FROM safety_task_participants`)).toHaveLength(2);
  });

  it('uses the same task source for todo, participated, completed, overdue and plan completion rate', async () => {
    const { planId } = await createPlanWithItem({ completionRule: 'any' });
    await generate(planId);
    currentUser = makeUser('crew-old');
    const todo = await request(app.getHttpServer()).get('/api/v1/tasks?view=todo');
    expect(todo.body.data).toHaveLength(1);
    const taskId = todo.body.data[0].id as string;
    const overdue = await request(app.getHttpServer()).get('/api/v1/tasks?view=overdue');
    expect(overdue.body.data.map((task: { id: string }) => task.id)).toEqual([taskId]);
    const calendar = await request(app.getHttpServer()).get('/api/v1/tasks?view=todo&startAt=2026-02-01T00:00:00.000Z&endAt=2026-03-01T00:00:00.000Z');
    expect(calendar.body.data.map((task: { id: string }) => task.id)).toEqual([taskId]);
    const startKey = `start-${crypto.randomUUID()}`;
    const concurrentStarts = await Promise.all([
      request(app.getHttpServer()).post(`/api/v1/tasks/${taskId}/actions`).set('Idempotency-Key', startKey).send({ actionType: 'start' }),
      request(app.getHttpServer()).post(`/api/v1/tasks/${taskId}/actions`).set('Idempotency-Key', startKey).send({ actionType: 'start' }),
    ]);
    expect(concurrentStarts.map((response) => response.status)).toEqual([200, 200]);
    expect(await source.query(`SELECT id FROM safety_task_action_logs WHERE task_id=$1 AND action_type='start'`, [taskId])).toHaveLength(1);
    await request(app.getHttpServer())
      .post(`/api/v1/tasks/${taskId}/actions`)
      .set('Idempotency-Key', `complete-${crypto.randomUUID()}`)
      .send({ actionType: 'complete' })
      .expect(200);
    expect((await request(app.getHttpServer()).get('/api/v1/tasks?view=completed')).body.data).toHaveLength(1);
    expect((await request(app.getHttpServer()).get('/api/v1/tasks?view=todo')).body.data).toHaveLength(0);
    currentUser = makeUser('plan-owner', ['all_authenticated', 'shipping']);
    const plan = await request(app.getHttpServer()).get(`/api/v1/plans/${planId}`);
    expect(plan.body.data.completionRate).toBe(1);
    currentUser = makeUser('crew-peer');
    expect((await request(app.getHttpServer()).get('/api/v1/tasks?view=participated')).body.data).toHaveLength(1);
  });

  it('removes an already-completed participant from todo until the remaining participant finishes', async () => {
    const { planId } = await createPlanWithItem({ completionRule: 'all' });
    await generate(planId);
    const taskId = (await source.query(`SELECT id FROM safety_tasks LIMIT 1`))[0].id as string;
    currentUser = makeUser('crew-old');
    await request(app.getHttpServer())
      .post(`/api/v1/tasks/${taskId}/actions`)
      .set('Idempotency-Key', `complete-owner-${crypto.randomUUID()}`)
      .send({ actionType: 'complete' })
      .expect(200);
    expect((await request(app.getHttpServer()).get('/api/v1/tasks?view=todo')).body.data).toHaveLength(0);
    await request(app.getHttpServer())
      .post(`/api/v1/tasks/${taskId}/actions`)
      .set('Idempotency-Key', `repeat-owner-${crypto.randomUUID()}`)
      .send({ actionType: 'complete' })
      .expect(403);
    currentUser = makeUser('crew-peer');
    expect((await request(app.getHttpServer()).get('/api/v1/tasks?view=todo')).body.data).toHaveLength(1);
    await request(app.getHttpServer())
      .post(`/api/v1/tasks/${taskId}/actions`)
      .set('Idempotency-Key', `complete-peer-${crypto.randomUUID()}`)
      .send({ actionType: 'complete' })
      .expect(200);
    expect((await request(app.getHttpServer()).get('/api/v1/tasks?view=completed')).body.data).toHaveLength(1);
  });

  it('audits reschedule and cancellation and removes cancelled work from todo and completion denominator', async () => {
    const { planId } = await createPlanWithItem();
    await generate(planId);
    const taskId = (await source.query(`SELECT id FROM safety_tasks LIMIT 1`))[0].id as string;
    await request(app.getHttpServer())
      .post(`/api/v1/tasks/${taskId}/actions`)
      .set('Idempotency-Key', `reschedule-${crypto.randomUUID()}`)
      .send({ actionType: 'reschedule', reason: '靠港延误', scheduledAt: '2026-03-02T01:00:00.000Z', dueAt: '2026-03-02T02:00:00.000Z' })
      .expect(200);
    await request(app.getHttpServer())
      .post(`/api/v1/tasks/${taskId}/actions`)
      .set('Idempotency-Key', `cancel-${crypto.randomUUID()}`)
      .send({ actionType: 'cancel', reason: '计划撤销' })
      .expect(200);
    const logs = await source.query(`SELECT action_type, reason FROM safety_task_action_logs WHERE task_id=$1 ORDER BY created_at`, [taskId]);
    expect(logs).toEqual([
      expect.objectContaining({ action_type: 'reschedule', reason: '靠港延误' }),
      expect.objectContaining({ action_type: 'cancel', reason: '计划撤销' }),
    ]);
    const plan = await request(app.getHttpServer()).get(`/api/v1/plans/${planId}`);
    expect(plan.body.data.taskSummary.cancelled).toBe(1);
    expect(plan.body.data.completionRate).toBe(0);
  });

  it('preserves transfer history, revokes the old executor and allows an effective delegate', async () => {
    const { planId } = await createPlanWithItem();
    await generate(planId);
    const taskId = (await source.query(`SELECT id FROM safety_tasks LIMIT 1`))[0].id as string;
    await request(app.getHttpServer())
      .post(`/api/v1/tasks/${taskId}/actions`)
      .set('Idempotency-Key', `old-delegate-${crypto.randomUUID()}`)
      .send({ actionType: 'delegate', delegateUserId: 'crew-agent', delegateUntil: '2026-12-31T00:00:00.000Z', reason: '旧班次代理' })
      .expect(200);
    await request(app.getHttpServer())
      .post(`/api/v1/tasks/${taskId}/actions`)
      .set('Idempotency-Key', `transfer-${crypto.randomUUID()}`)
      .send({ actionType: 'transfer', transferToUserId: 'crew-new', reason: '轮班交接' })
      .expect(200);
    currentUser = makeUser('crew-old');
    await request(app.getHttpServer())
      .post(`/api/v1/tasks/${taskId}/actions`)
      .set('Idempotency-Key', `old-start-${crypto.randomUUID()}`)
      .send({ actionType: 'start' })
      .expect(403);
    currentUser = makeUser('crew-agent');
    await request(app.getHttpServer())
      .post(`/api/v1/tasks/${taskId}/actions`)
      .set('Idempotency-Key', `revoked-agent-${crypto.randomUUID()}`)
      .send({ actionType: 'start' })
      .expect(403);
    expect((await request(app.getHttpServer()).get('/api/v1/tasks?view=participated')).body.data).toHaveLength(1);
    currentUser = makeUser('crew-new');
    await request(app.getHttpServer())
      .post(`/api/v1/tasks/${taskId}/actions`)
      .set('Idempotency-Key', `delegate-${crypto.randomUUID()}`)
      .send({ actionType: 'delegate', delegateUserId: 'crew-agent', delegateUntil: '2026-12-31T00:00:00.000Z', reason: '休假代理' })
      .expect(200);
    currentUser = makeUser('crew-agent');
    await request(app.getHttpServer())
      .post(`/api/v1/tasks/${taskId}/actions`)
      .set('Idempotency-Key', `agent-start-${crypto.randomUUID()}`)
      .send({ actionType: 'start' })
      .expect(200);
    const transfers = await source.query(`SELECT from_user_id, to_user_id, reason FROM safety_task_transfers WHERE task_id=$1`, [taskId]);
    expect(transfers).toEqual([expect.objectContaining({ from_user_id: 'crew-old', to_user_id: 'crew-new', reason: '轮班交接' })]);
  });

  it('commits transfer, audit log and notification outbox atomically and permits safe replay after rollback', async () => {
    const { planId } = await createPlanWithItem();
    await generate(planId);
    const taskId = (await source.query(`SELECT id FROM safety_tasks LIMIT 1`))[0].id as string;
    const requestId = `atomic-transfer-${crypto.randomUUID()}`;
    await source.query(`ALTER TABLE safety_task_notification_deliveries ADD CONSTRAINT ck_test_reject_transfer CHECK (recipient_user_id <> 'crew-new')`);
    try {
      await expect(planTaskService.act(
        taskId,
        currentUser,
        { actionType: 'transfer', transferToUserId: 'crew-new', reason: '原子交接' },
        requestId,
      )).rejects.toBeDefined();
    } finally {
      await source.query(`ALTER TABLE safety_task_notification_deliveries DROP CONSTRAINT ck_test_reject_transfer`);
    }
    expect(await source.query(`SELECT responsible_user_id FROM safety_tasks WHERE id=$1`, [taskId])).toEqual([
      expect.objectContaining({ responsible_user_id: 'crew-old' }),
    ]);
    expect(await source.query(`SELECT id FROM safety_task_transfers WHERE task_id=$1`, [taskId])).toHaveLength(0);
    expect(await source.query(`SELECT id FROM safety_task_action_logs WHERE request_id=$1`, [requestId])).toHaveLength(0);

    await planTaskService.act(
      taskId,
      currentUser,
      { actionType: 'transfer', transferToUserId: 'crew-new', reason: '原子交接' },
      requestId,
    );
    expect(await source.query(`SELECT id FROM safety_task_transfers WHERE task_id=$1`, [taskId])).toHaveLength(1);
    expect(await source.query(`SELECT id FROM safety_task_action_logs WHERE request_id=$1`, [requestId])).toHaveLength(1);
    expect(await source.query(`SELECT status FROM safety_task_notification_deliveries WHERE message_type='transfer'`)).toEqual([
      expect.objectContaining({ status: 'sent' }),
    ]);
  });

  it('reconciles a task whose participant write was interrupted without duplicating the task', async () => {
    const { planId } = await createPlanWithItem();
    await generate(planId);
    const taskId = (await source.query(`SELECT id FROM safety_tasks LIMIT 1`))[0].id as string;
    await source.query(`DELETE FROM safety_task_participants WHERE task_id=$1`, [taskId]);

    await request(app.getHttpServer())
      .post(`/api/v1/plans/${planId}/generation-runs`)
      .set('Idempotency-Key', `reconcile-${crypto.randomUUID()}`)
      .send({ windowStart: '2026-02-01T00:00:00.000Z', windowEnd: '2026-03-01T00:00:00.000Z', mode: 'reconcile' })
      .expect(202);

    expect(await source.query(`SELECT id FROM safety_tasks`)).toHaveLength(1);
    expect(await source.query(`SELECT role,user_id FROM safety_task_participants WHERE task_id=$1`, [taskId])).toHaveLength(2);
  });

  it('records message failure, retries the same delivery and deduplicates successful reminders', async () => {
    const { planId } = await createPlanWithItem();
    await generate(planId);
    const taskId = (await source.query(`SELECT id FROM safety_tasks LIMIT 1`))[0].id as string;
    sendTextCard.mockClear();
    sendTextCard.mockResolvedValueOnce({ success: false, invalidUser: [], errcode: 50001, failureReason: 'network timeout' });
    await request(app.getHttpServer())
      .post(`/api/v1/tasks/${taskId}/actions`)
      .set('Idempotency-Key', 'remind-business-cycle-1')
      .send({ actionType: 'remind', reason: '请尽快处理' })
      .expect(200);
    let deliveries = await request(app.getHttpServer()).get(`/api/v1/tasks/${taskId}/notification-deliveries`);
    expect(deliveries.body.data).toHaveLength(2);
    const reminder = deliveries.body.data.find((entry: { messageType: string }) => entry.messageType === 'reminder');
    expect(reminder).toEqual(expect.objectContaining({
      status: 'failed',
      attemptCount: 1,
      wecomErrcode: 50001,
      attemptHistory: [expect.objectContaining({ attempt: 1, status: 'failed', wecomErrcode: 50001, failureReason: 'network timeout' })],
    }));
    sendTextCard.mockResolvedValueOnce({ success: true, invalidUser: [] });
    await request(app.getHttpServer())
      .post(`/api/v1/tasks/${taskId}/notification-deliveries/${reminder.id}/retry`)
      .set('Idempotency-Key', 'retry-business-cycle-1')
      .expect(202);
    await request(app.getHttpServer())
      .post(`/api/v1/tasks/${taskId}/actions`)
      .set('Idempotency-Key', 'remind-business-cycle-1')
      .send({ actionType: 'remind', reason: '请尽快处理' })
      .expect(200);
    await request(app.getHttpServer())
      .post(`/api/v1/tasks/${taskId}/actions`)
      .set('Idempotency-Key', 'remind-business-cycle-1')
      .send({ actionType: 'remind', reason: '重复提交' })
      .expect(409);
    deliveries = await request(app.getHttpServer()).get(`/api/v1/tasks/${taskId}/notification-deliveries`);
    expect(deliveries.body.data).toHaveLength(2);
    expect(deliveries.body.data.find((entry: { messageType: string }) => entry.messageType === 'reminder')).toEqual(expect.objectContaining({
      status: 'sent',
      attemptCount: 2,
      attemptHistory: [
        expect.objectContaining({ attempt: 1, status: 'failed', wecomErrcode: 50001, failureReason: 'network timeout' }),
        expect.objectContaining({ attempt: 2, status: 'sent' }),
      ],
    }));
    expect(sendTextCard).toHaveBeenCalledTimes(2);
    expect(sendTextCard).toHaveBeenLastCalledWith(expect.objectContaining({
      url: expect.stringMatching(new RegExp(`/workbench/tasks/${taskId}\\?notificationId=`)),
    }));
  });

  it('runs the daily scheduler and deduplicates overdue escalation by Shanghai cycle', async () => {
    const { planId } = await createPlanWithItem();
    await generate(planId);
    await request(app.getHttpServer())
      .post(`/api/v1/plans/${planId}/actions`)
      .send({ actionType: 'pause', reason: '暂停后仍需追踪已生成任务' })
      .expect(200);
    sendTextCard.mockClear();

    const first = await planTaskService.runScheduledCycle(new Date('2026-03-02T00:00:00.000Z'));
    const replay = await planTaskService.runScheduledCycle(new Date('2026-03-02T12:00:00.000Z'));

    expect(first).toEqual(expect.objectContaining({ plans: 0, escalated: 1 }));
    expect(replay).toEqual(expect.objectContaining({ plans: 0, escalated: 0 }));
    const escalations = await source.query(`SELECT recipient_user_id, status, dedupe_key FROM safety_task_notification_deliveries WHERE message_type='escalation'`);
    expect(escalations).toEqual([expect.objectContaining({ recipient_user_id: 'plan-owner', status: 'sent', dedupe_key: expect.stringContaining('overdue:2026-03-02') })]);
    expect(sendTextCard).toHaveBeenCalledTimes(1);
  });

  it('atomically claims one queued delivery when two workers run concurrently', async () => {
    const { planId } = await createPlanWithItem();
    await generate(planId);
    const taskId = (await source.query(`SELECT id FROM safety_tasks LIMIT 1`))[0].id as string;
    await source.query(
      `INSERT INTO safety_task_notification_deliveries
        (task_id,recipient_user_id,message_type,dedupe_key,payload_snapshot,status,created_by,updated_by)
       VALUES ($1,'crew-old','reminder',$2,'{}','queued','test','test')`,
      [taskId, `${taskId}:crew-old:reminder:worker-race`],
    );
    sendTextCard.mockClear();
    const admin = makeUser('system-admin', ['system_admin']);

    await Promise.all([
      planTaskService.processDueDeliveries(admin),
      planTaskService.processDueDeliveries(admin),
    ]);

    expect(sendTextCard).toHaveBeenCalledTimes(1);
    const delivery = await source.query(`SELECT status,attempt_count FROM safety_task_notification_deliveries WHERE dedupe_key=$1`, [`${taskId}:crew-old:reminder:worker-race`]);
    expect(delivery).toEqual([expect.objectContaining({ status: 'sent', attempt_count: 1 })]);
  });
});
