import type { CanActivate, ExecutionContext, INestApplication } from '@nestjs/common';
import { ConflictException, Module } from '@nestjs/common';
import type { Server } from 'node:http';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import request from 'supertest';
import { DataSource } from 'typeorm';

import { configureApp } from 'src/app.bootstrap';
import { appEnv } from 'src/config/env';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { InspectionCapaModule } from 'src/modules/inspection-capa/inspection-capa.module';
import { InspectionCapaService } from 'src/modules/inspection-capa/inspection-capa.service';
import { PlanTaskService } from 'src/modules/plan-task/plan-task.service';
import { InspectionEntity } from 'src/database/entities/safety-inspection-capa.entity';
import { SafetyTaskEntity, SafetyTaskActionLogEntity } from 'src/database/entities/safety-plan-task.entity';
import { FilesModule } from 'src/modules/files/files.module';
import { OssService } from 'src/modules/files/oss.service';
import { WecomMessageService } from 'src/modules/wecom/wecom-message.service';
import { WecomUserEntity } from 'src/database/entities/wecom-user.entity';
import { bootstrapPgTestDatabase, buildPgTypeOrmOptions, shutdownPgTestDatabase } from 'test/pg-test-container';

type TestUser = {
  userId: string; corpId: string; name: string; avatar: null; departments: string[];
  position: string; roles: string[]; isAdmin: boolean;
};

const makeUser = (userId: string, roles = ['all_authenticated', 'shipping']): TestUser => ({
  userId, corpId: appEnv.WECOM_CORP_ID, name: userId, avatar: null, departments: ['shipping'],
  position: roles.includes('system_admin') ? '管理员' : '船员', roles, isAdmin: roles.includes('system_admin'),
});

let currentUser = makeUser('plan-owner');
const authGuard: CanActivate = { canActivate(context: ExecutionContext) { context.switchToHttp().getRequest<{ user?: TestUser }>().user = currentUser; return true; } };

@Module({ imports: [TypeOrmModule.forRootAsync({ useFactory: async () => { await bootstrapPgTestDatabase(); return buildPgTypeOrmOptions(); } }), InspectionCapaModule, FilesModule] })
class TestModule {}

describe('inspection and CAPA integration', () => {
  let app: INestApplication<Server>;
  let source: DataSource;
  const oss = { createDownloadSignature: jest.fn().mockResolvedValue({ downloadUrl: 'https://storage.test/inspection-evidence', expiresAt: '2026-11-17T11:00:00.000Z' }), deleteObject: jest.fn() };

  beforeAll(async () => {
    const ref = await Test.createTestingModule({ imports: [TestModule] })
      .overrideGuard(JwtAuthGuard).useValue(authGuard)
      .overrideProvider(WecomMessageService).useValue({ sendTextCard: jest.fn().mockResolvedValue({ success: true, invalidUser: [] }) })
      .overrideProvider(OssService).useValue(oss)
      .compile();
    app = ref.createNestApplication(); configureApp(app); await app.init(); source = ref.get(DataSource);
  });

  beforeEach(async () => {
    oss.createDownloadSignature.mockClear();
    currentUser = makeUser('plan-owner');
    await source.query(`TRUNCATE TABLE inspection_capa_action_logs, capa_verifications, capa_action_evidence, capa_actions, capa_root_causes, safety_capas, issue_transfer_jobs, issue_sources, safety_issues, inspection_result_evidence, inspection_results, inspections, inspection_plans, inspection_template_scopes, inspection_template_items, inspection_template_versions, inspection_templates, safety_task_notification_deliveries, safety_task_generation_entries, safety_task_generation_runs, safety_task_action_logs, safety_task_delegations, safety_task_transfers, safety_task_participants, safety_tasks, safety_plan_items, safety_plans, workbench_records, files RESTART IDENTITY CASCADE`);
    await source.query(`INSERT INTO personnel (wecom_user_id,name,department_code,employment_status,is_sync_from_wecom) VALUES ('plan-owner','Plan owner','shipping','active',true),('inspector-a','Inspector A','shipping','active',true),('inspector-b','Inspector B','shipping','active',true),('verifier','Verifier','shipping','active',true) ON CONFLICT (wecom_user_id) WHERE deleted_at IS NULL AND wecom_user_id IS NOT NULL DO UPDATE SET employment_status='active', deleted_at=NULL`);
    // Inspection assignees need the same effective identity as plan assignees.
    await source.getRepository(WecomUserEntity).upsert(
      ['plan-owner', 'inspector-a', 'inspector-b', 'verifier'].map((userId) => ({
        userId,
        corpId: appEnv.WECOM_CORP_ID,
        name: userId,
        sourceStatus: 'active' as const,
        departmentIds: [6],
        departmentNames: ['船务部'],
        departmentCodes: ['shipping_dept'],
      })),
      ['userId'],
    );
  });

  afterAll(async () => { await app?.close(); await shutdownPgTestDatabase(); });

  const key = (scope: string) => `${scope}-${crypto.randomUUID()}`;
  async function createFile(uploadedBy = currentUser.userId) {
    const id = crypto.randomUUID();
    await source.query(`INSERT INTO files (id,oss_key,file_name,mime_type,file_size,category,uploaded_by) VALUES ($1,$2,'evidence.jpg','image/jpeg',100,'workbench',$3)`, [id, `tests/${id}.jpg`, uploadedBy]);
    return id;
  }

  async function createIssuedInspection() {
    const template = await request(app.getHttpServer()).post('/api/v1/inspection-templates').set('Idempotency-Key', key('template')).send({ code: 'ISM-LSA', name: '救生设备检查', sourceType: 'regulation', importSource: 'ISM 2026', items: [{ itemCode: 'LSA-1', title: '救生圈状态', resultRequired: true, evidenceRequiredOnFailure: true, sequenceNo: 1 }] }).expect(201);
    const versions = await request(app.getHttpServer()).get(`/api/v1/inspection-templates/${template.body.data.id}/versions`).expect(200);
    const versionId = versions.body.data[0].id as string;
    await request(app.getHttpServer()).post(`/api/v1/inspection-template-versions/${versionId}/publish`).set('Idempotency-Key', key('publish')).expect(200);
    const plan = await request(app.getHttpServer()).post('/api/v1/inspection-plans').set('Idempotency-Key', key('plan')).send({ title: '月度救生检查', templateVersionId: versionId, responsibleUserId: 'inspector-a', participantUserIds: ['inspector-b'], completionRule: 'all', recurrence: { kind: 'one_time', startAt: '2026-07-01T09:00:00+08:00' }, dueOffsetMinutes: 60 }).expect(201);
    const generated = await request(app.getHttpServer()).post(`/api/v1/inspection-plans/${plan.body.data.id}/generation-runs`).set('Idempotency-Key', key('generate')).send({ windowStart: '2026-07-01T00:00:00.000Z', windowEnd: '2026-07-02T00:00:00.000Z', mode: 'generate' });
    if (generated.status !== 202) throw new Error(`inspection generation failed: ${JSON.stringify(generated.body)}`);
    const inspections = await request(app.getHttpServer()).get('/api/v1/inspections').expect(200);
    return inspections.body.data[0] as { id: string; templateVersionId: string; templateSnapshot: { items: Array<{ snapshotKey: string; title: string }> } };
  }

  type InspectionMutation = 'save' | 'submit' | 'summarize';
  async function prepareMutation(mutation: InspectionMutation) {
    const inspection = await createIssuedInspection();
    const service = app.get(InspectionCapaService);
    const itemKey = inspection.templateSnapshot.items[0]!.snapshotKey;
    if (mutation !== 'save') {
      for (const userId of mutation === 'summarize' ? ['inspector-a', 'inspector-b'] : ['inspector-a']) {
        await service.saveInspectionResult(inspection.id, makeUser(userId), { templateItemSnapshotKey: itemKey, conclusion: 'conforming' }, key('prepare-result'));
        if (mutation === 'summarize') await service.submitInspection(inspection.id, makeUser(userId), { signatureFileId: await createFile(userId) }, key('prepare-signature'));
      }
    }
    const signatureFileId = await createFile('inspector-a');
    const { taskId } = await source.getRepository(InspectionEntity).findOneByOrFail({ id: inspection.id });
    const write = (): Promise<unknown> => mutation === 'save'
      ? service.saveInspectionResult(inspection.id, makeUser('inspector-a'), { templateItemSnapshotKey: itemKey, conclusion: 'conforming' }, key('cancel-result'))
      : mutation === 'submit'
        ? service.submitInspection(inspection.id, makeUser('inspector-a'), { signatureFileId }, key('cancel-submit'))
        : service.summarizeInspection(inspection.id, makeUser('plan-owner'), key('cancel-summary'));
    return { inspectionId: inspection.id, taskId, write };
  }

  it.each<InspectionMutation>(['save', 'submit', 'summarize'])('blocks %s after cancellation and keeps cancellation replay idempotent', async (mutation) => {
    const { inspectionId, taskId, write } = await prepareMutation(mutation);
    const taskService = app.get(PlanTaskService);
    const requestId = key('cancel-inspection-task');
    await taskService.act(taskId, makeUser('plan-owner'), { actionType: 'cancel', reason: '检查已取消' }, requestId);
    await expect(write()).rejects.toBeInstanceOf(ConflictException);
    await taskService.act(taskId, makeUser('plan-owner'), { actionType: 'cancel', reason: '检查已取消' }, requestId);
    expect(await source.getRepository(SafetyTaskEntity).findOneByOrFail({ id: taskId })).toMatchObject({ status: 'cancelled', completedAt: null });
    expect(await source.getRepository(InspectionEntity).findOneByOrFail({ id: inspectionId })).toMatchObject({ status: 'cancelled', completedAt: null });
    expect(await source.getRepository(SafetyTaskActionLogEntity).countBy({ taskId, actionType: 'cancel' })).toBe(1);
    expect((await request(app.getHttpServer()).get(`/api/v1/inspections/${inspectionId}`).expect(200)).body.data.availableActions).toEqual(['read']);
    expect(await source.query('SELECT id FROM issue_transfer_jobs')).toHaveLength(0);
  });

  it.each<InspectionMutation>(['save', 'submit', 'summarize'])('blocks %s against a legacy cancelled task even when its inspection status is stale', async (mutation) => {
    const { inspectionId, taskId, write } = await prepareMutation(mutation);
    await source.getRepository(SafetyTaskEntity).update(taskId, { status: 'cancelled' });
    const before = await source.getRepository(InspectionEntity).findOneByOrFail({ id: inspectionId });
    await expect(write()).rejects.toBeInstanceOf(ConflictException);
    expect(await source.getRepository(InspectionEntity).findOneByOrFail({ id: inspectionId })).toMatchObject({ status: before.status, completedAt: null });
    expect(await source.getRepository(SafetyTaskEntity).findOneByOrFail({ id: taskId })).toMatchObject({ status: 'cancelled', completedAt: null });
  });

  it.each<InspectionMutation>(['save', 'submit', 'summarize'])('serializes concurrent %s behind a cancellation already waiting on the task lock', async (mutation) => {
    const { inspectionId, taskId, write } = await prepareMutation(mutation);
    const blocker = source.createQueryRunner();
    await blocker.connect();
    await blocker.startTransaction();
    const lockKey = `task:${taskId}`;
    await blocker.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [lockKey]);
    type Outcome = { error: unknown };
    const outcome = (promise: Promise<unknown>): Promise<Outcome> => promise.then(() => ({ error: null }), (error: unknown) => ({ error }));
    const cancel = outcome(app.get(PlanTaskService).act(taskId, makeUser('plan-owner'), { actionType: 'cancel', reason: '并发取消检查' }, key('concurrent-cancel')));
    let writing: Promise<Outcome> | undefined;
    let results: Outcome[] = [];
    const waitForWaiters = async (count: number) => {
      for (let attempt = 0; attempt < 100; attempt++) {
        const [row] = await source.query<Array<{ count: number }>>(`SELECT COUNT(*)::int AS count FROM pg_locks WHERE locktype='advisory' AND NOT granted AND classid=((hashtextextended($1,0)>>32)&4294967295)::oid AND objid=(hashtextextended($1,0)&4294967295)::oid`, [lockKey]);
        if (row?.count === count) return true;
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      return false;
    };
    try {
      expect(await waitForWaiters(1)).toBe(true);
      writing = outcome(write());
      expect(await waitForWaiters(2)).toBe(true);
    } finally {
      await blocker.rollbackTransaction();
      await blocker.release();
      results = await Promise.all(writing ? [cancel, writing] : [cancel]);
    }
    expect(results[0]!.error).toBeNull();
    expect(results[1]!.error).toBeInstanceOf(ConflictException);
    expect(await source.getRepository(SafetyTaskEntity).findOneByOrFail({ id: taskId })).toMatchObject({ status: 'cancelled', completedAt: null });
    expect(await source.getRepository(InspectionEntity).findOneByOrFail({ id: inspectionId })).toMatchObject({ status: 'cancelled', completedAt: null });
  });

  it('repairs executable inspections through generic plan reconciliation and blocks generic task completion', async () => {
    const issued = await createIssuedInspection();
    const [row] = await source.query<Array<{ task_id: string; plan_id: string }>>(`SELECT i.task_id, t.plan_id FROM inspections i JOIN safety_tasks t ON t.id=i.task_id WHERE i.id=$1`, [issued.id]);
    if (!row) throw new Error('Issued inspection task is missing');
    await source.query('DELETE FROM inspections WHERE id=$1', [issued.id]);
    await request(app.getHttpServer()).post(`/api/v1/plans/${row.plan_id}/generation-runs`).set('Idempotency-Key', key('generic-inspection-reconcile')).send({ windowStart: '2026-07-01T00:00:00.000Z', windowEnd: '2026-07-02T00:00:00.000Z', mode: 'reconcile' }).expect(202);
    const inspectionRows = await source.query<Array<{ id: string; template_snapshot: { items: unknown[] } }>>('SELECT id,template_snapshot FROM inspections WHERE task_id=$1', [row.task_id]);
    expect(inspectionRows).toHaveLength(1);
    expect(inspectionRows[0]!.template_snapshot.items).toHaveLength(1);
    currentUser = makeUser('inspector-a', ['all_authenticated', 'crew']);
    const detail = await request(app.getHttpServer()).get(`/api/v1/tasks/${row.task_id}`).expect(200);
    expect(detail.body.data.inspectionId).toBe(inspectionRows[0]!.id);
    expect(detail.body.data.availableActions).not.toContain('complete');
    await request(app.getHttpServer()).post(`/api/v1/tasks/${row.task_id}/actions`).set('Idempotency-Key', key('blocked-inspection-complete')).send({ actionType: 'complete' }).expect(409);
    expect((await source.query('SELECT status FROM safety_tasks WHERE id=$1', [row.task_id]))[0].status).toBe('pending');
    expect((await source.query('SELECT completed_at FROM safety_task_participants WHERE task_id=$1', [row.task_id])).every((participant: { completed_at: unknown }) => participant.completed_at === null)).toBe(true);
  });

  it('allows a measure assignee to list and read the issue while denying unrelated readers', async () => {
    const issue = await request(app.getHttpServer()).post('/api/v1/issues').set('Idempotency-Key', key('assigned-issue')).send({ title: '分派措施测试', issueType: 'hazard', severity: 'minor', responsibleUserId: 'inspector-a', dueAt: '2026-12-01T00:00:00.000Z' }).expect(201);
    const capa = await request(app.getHttpServer()).post(`/api/v1/issues/${issue.body.data.id}/capa`).set('Idempotency-Key', key('assigned-capa')).send({ verifierUserId: 'verifier' }).expect(201);
    await request(app.getHttpServer()).post(`/api/v1/capas/${capa.body.data.id}/actions`).set('Idempotency-Key', key('assigned-action')).send({ actionType: 'corrective', title: '补充现场措施', responsibleUserId: 'inspector-b', dueAt: '2026-12-01T00:00:00.000Z' }).expect(201);
    currentUser = makeUser('inspector-b', ['all_authenticated', 'crew']);
    expect((await request(app.getHttpServer()).get('/api/v1/issues').expect(200)).body.data.map((row: { id: string }) => row.id)).toContain(issue.body.data.id);
    const detail = await request(app.getHttpServer()).get(`/api/v1/issues/${issue.body.data.id}`).expect(200);
    expect(detail.body.data.availableActions).toEqual(['read']);
    expect(detail.body.data.capa.actions[0].availableActions).toContain('submit');
    currentUser = makeUser('unrelated', ['all_authenticated', 'crew']);
    await request(app.getHttpServer()).get(`/api/v1/issues/${issue.body.data.id}`).expect(403);
  });

  it('keeps the issued template snapshot, blocks premature multi-person summary, and deduplicates automatic nonconformity transfer', async () => {
    const inspection = await createIssuedInspection();
    const itemKey = inspection.templateSnapshot.items[0]!.snapshotKey;
    await source.query(`UPDATE inspection_template_items SET title='后续模板编辑' WHERE version_id=$1`, [inspection.templateVersionId]);
    expect((await request(app.getHttpServer()).get(`/api/v1/inspections/${inspection.id}`).expect(200)).body.data.templateSnapshot.items[0].title).toBe('救生圈状态');
    const resultEvidence = await createFile('inspector-a');
    currentUser = makeUser('inspector-a');
    await request(app.getHttpServer()).post(`/api/v1/inspections/${inspection.id}/results`).set('Idempotency-Key', key('result-a')).send({ templateItemSnapshotKey: itemKey, conclusion: 'nonconforming', remark: '救生圈反光带破损', evidenceFileIds: [resultEvidence] }).expect(200);
    await request(app.getHttpServer()).post(`/api/v1/inspections/${inspection.id}/submit`).set('Idempotency-Key', key('submit-a')).send({ signatureFileId: await createFile() }).expect(200);
    currentUser = makeUser('plan-owner');
    await request(app.getHttpServer()).post(`/api/v1/inspections/${inspection.id}/summaries`).set('Idempotency-Key', key('premature-summary')).expect(422);
    currentUser = makeUser('inspector-b');
    await request(app.getHttpServer()).post(`/api/v1/inspections/${inspection.id}/results`).set('Idempotency-Key', key('result-b')).send({ templateItemSnapshotKey: itemKey, conclusion: 'nonconforming', remark: '同意发现', evidenceFileIds: [resultEvidence] }).expect(200);
    await request(app.getHttpServer()).post(`/api/v1/inspections/${inspection.id}/submit`).set('Idempotency-Key', key('submit-b')).send({ signatureFileId: await createFile() }).expect(200);
    currentUser = makeUser('plan-owner');
    const summaries = await Promise.all([request(app.getHttpServer()).post(`/api/v1/inspections/${inspection.id}/summaries`).set('Idempotency-Key', key('summary-a')), request(app.getHttpServer()).post(`/api/v1/inspections/${inspection.id}/summaries`).set('Idempotency-Key', key('summary-b'))]);
    expect(summaries.map((response) => response.status)).toEqual([200, 200]);
    expect(await source.query(`SELECT id FROM safety_issues WHERE issue_type='nonconformity'`)).toHaveLength(1);
    expect(await source.query(`SELECT dedupe_key,status FROM issue_transfer_jobs`)).toEqual([expect.objectContaining({ status: 'succeeded' })]);
  });

  it('keeps failed automatic transfer jobs and reconciles them after the constraint is repaired', async () => {
    const inspection = await createIssuedInspection(); const itemKey = inspection.templateSnapshot.items[0]!.snapshotKey; const evidence = await createFile('inspector-a');
    currentUser = makeUser('inspector-a');
    await request(app.getHttpServer()).post(`/api/v1/inspections/${inspection.id}/results`).set('Idempotency-Key', key('reconcile-result-a')).send({ templateItemSnapshotKey: itemKey, conclusion: 'nonconforming', evidenceFileIds: [evidence] }).expect(200);
    await request(app.getHttpServer()).post(`/api/v1/inspections/${inspection.id}/submit`).set('Idempotency-Key', key('reconcile-submit-a')).send({ signatureFileId: await createFile() }).expect(200);
    currentUser = makeUser('inspector-b');
    await request(app.getHttpServer()).post(`/api/v1/inspections/${inspection.id}/results`).set('Idempotency-Key', key('reconcile-result-b')).send({ templateItemSnapshotKey: itemKey, conclusion: 'nonconforming', evidenceFileIds: [evidence] }).expect(200);
    await request(app.getHttpServer()).post(`/api/v1/inspections/${inspection.id}/submit`).set('Idempotency-Key', key('reconcile-submit-b')).send({ signatureFileId: await createFile() }).expect(200);
    await source.query(`ALTER TABLE safety_issues ADD CONSTRAINT ck_test_transfer_failure CHECK (responsible_user_id <> 'inspector-a')`);
    try {
      currentUser = makeUser('plan-owner');
      await request(app.getHttpServer()).post(`/api/v1/inspections/${inspection.id}/summaries`).set('Idempotency-Key', key('reconcile-summary')).expect(200);
      expect(await source.query(`SELECT status FROM issue_transfer_jobs`)).toEqual([expect.objectContaining({ status: 'failed' })]);
    } finally {
      await source.query(`ALTER TABLE safety_issues DROP CONSTRAINT ck_test_transfer_failure`);
    }
    const reconciled = await request(app.getHttpServer()).post('/api/v1/issue-transfer-jobs/actions/reconcile').set('Idempotency-Key', key('reconcile-jobs')).expect(202);
    expect(reconciled.body.data).toEqual(expect.objectContaining({ processed: 1, succeeded: 1, failed: 0 }));
    expect(await source.query(`SELECT id FROM safety_issues WHERE issue_type='nonconformity'`)).toHaveLength(1);
  });

  it('enforces evidence, independent verification, rework and privileged major-issue closure', async () => {
    const issue = await request(app.getHttpServer()).post('/api/v1/issues').set('Idempotency-Key', key('issue')).send({ title: '救生设备不符合', issueType: 'nonconformity', severity: 'major', responsibilityScope: 'vessel', responsibleUserId: 'inspector-a', dueAt: '2026-08-01T00:00:00.000Z' }).expect(201);
    const issueId = issue.body.data.id as string;
    const capa = await request(app.getHttpServer()).post(`/api/v1/issues/${issueId}/capa`).set('Idempotency-Key', key('capa')).send({ verifierUserId: 'verifier', effectivenessRequired: true }).expect(201);
    const capaId = capa.body.data.id as string;
    await request(app.getHttpServer()).put(`/api/v1/capas/${capaId}/root-cause`).set('Idempotency-Key', key('root')).send({ method: 'five_whys', conclusion: '巡检未覆盖反光带检查' }).expect(200);
    const corrective = await request(app.getHttpServer()).post(`/api/v1/capas/${capaId}/actions`).set('Idempotency-Key', key('corrective')).send({ actionType: 'corrective', title: '更换反光带', responsibleUserId: 'inspector-a', dueAt: '2026-07-20T00:00:00.000Z' }).expect(201);
    const preventive = await request(app.getHttpServer()).post(`/api/v1/capas/${capaId}/actions`).set('Idempotency-Key', key('preventive')).send({ actionType: 'preventive', title: '修订巡检表', responsibleUserId: 'inspector-a', dueAt: '2026-07-21T00:00:00.000Z' }).expect(201);
    currentUser = makeUser('inspector-a');
    for (const actionId of [corrective.body.data.id, preventive.body.data.id] as string[]) await request(app.getHttpServer()).post(`/api/v1/capa-actions/${actionId}/submit`).set('Idempotency-Key', key('submit-action')).send({ completionStatement: '已完成', evidenceFileIds: [await createFile()] }).expect(200);
    currentUser = makeUser('verifier', ['all_authenticated', 'verifier']);
    for (const actionId of [corrective.body.data.id, preventive.body.data.id] as string[]) await request(app.getHttpServer()).post(`/api/v1/capa-actions/${actionId}/accept`).set('Idempotency-Key', key('accept-action')).send({ comment: '证据充分' }).expect(200);
    await request(app.getHttpServer()).post(`/api/v1/capas/${capaId}/verifications`).set('Idempotency-Key', key('failed-verification')).send({ result: 'failed', conclusion: '需复核安装质量', effectivenessEvaluation: '暂不通过', reworkReason: '补充现场复核照片' }).expect(201);
    currentUser = makeUser('plan-owner');
    await request(app.getHttpServer()).post(`/api/v1/capas/${capaId}/request-verification`).set('Idempotency-Key', key('requeue')).expect(200);
    await request(app.getHttpServer()).put(`/api/v1/capas/${capaId}/root-cause`).set('Idempotency-Key', key('root-pending')).send({ method: 'five_whys', conclusion: '不应覆盖待验证根因' }).expect(409);
    await request(app.getHttpServer()).post(`/api/v1/capas/${capaId}/actions`).set('Idempotency-Key', key('action-pending')).send({ actionType: 'corrective', title: '不应新增待验证措施', responsibleUserId: 'inspector-a', dueAt: '2026-07-22T00:00:00.000Z' }).expect(409);
    currentUser = makeUser('verifier', ['all_authenticated', 'verifier']);
    await request(app.getHttpServer()).post(`/api/v1/capas/${capaId}/verifications`).set('Idempotency-Key', key('passed-verification')).send({ result: 'passed', conclusion: '现场复核通过', effectivenessEvaluation: '三个月内无重复问题' }).expect(201);
    currentUser = makeUser('plan-owner');
    await request(app.getHttpServer()).put(`/api/v1/capas/${capaId}/root-cause`).set('Idempotency-Key', key('root-verified')).send({ method: 'five_whys', conclusion: '不应覆盖已验证根因' }).expect(409);
    currentUser = makeUser('inspector-a');
    await request(app.getHttpServer()).post(`/api/v1/issues/${issueId}/close`).set('Idempotency-Key', key('forbidden-close')).send({ comment: '尝试关闭' }).expect(403);
    currentUser = makeUser('verifier', ['all_authenticated', 'verifier']);
    await request(app.getHttpServer()).post(`/api/v1/issues/${issueId}/close`).set('Idempotency-Key', key('close')).send({ comment: '闭环完成' }).expect(200);
    currentUser = makeUser('plan-owner');
    await request(app.getHttpServer()).post(`/api/v1/capas/${capaId}/actions`).set('Idempotency-Key', key('action-closed')).send({ actionType: 'preventive', title: '不应新增已关闭措施', responsibleUserId: 'inspector-a', dueAt: '2026-07-23T00:00:00.000Z' }).expect(409);
  });

  it('rejects another uploader inspection evidence and signature without saving partial changes', async () => {
    const inspection = await createIssuedInspection();
    const fileId = await createFile('plan-owner');
    const itemKey = inspection.templateSnapshot.items[0]!.snapshotKey;
    currentUser = makeUser('inspector-a');
    await request(app.getHttpServer()).post(`/api/v1/inspections/${inspection.id}/results`).set('Idempotency-Key', key('foreign-evidence')).send({ templateItemSnapshotKey: itemKey, conclusion: 'nonconforming', evidenceFileIds: [fileId] }).expect(403);
    expect(await source.query('SELECT id FROM inspection_results WHERE inspection_id=$1', [inspection.id])).toHaveLength(0);
    await request(app.getHttpServer()).post(`/api/v1/inspections/${inspection.id}/results`).set('Idempotency-Key', key('own-result')).send({ templateItemSnapshotKey: itemKey, conclusion: 'conforming' }).expect(200);
    await request(app.getHttpServer()).post(`/api/v1/inspections/${inspection.id}/submit`).set('Idempotency-Key', key('foreign-signature')).send({ signatureFileId: fileId }).expect(403);
    expect(await source.query('SELECT status, signature_file_id FROM inspection_results WHERE inspection_id=$1', [inspection.id])).toEqual([expect.objectContaining({ status: 'draft', signature_file_id: null })]);
  });

  it('rejects another uploader CAPA evidence before changing the action', async () => {
    const fileId = await createFile('plan-owner');
    const issue = await request(app.getHttpServer()).post('/api/v1/issues').set('Idempotency-Key', key('foreign-capa-issue')).send({ title: 'Evidence authorization', issueType: 'nonconformity', severity: 'minor', responsibilityScope: 'vessel', responsibleUserId: 'inspector-a', dueAt: '2026-08-01T00:00:00.000Z' }).expect(201);
    const capa = await request(app.getHttpServer()).post(`/api/v1/issues/${issue.body.data.id}/capa`).set('Idempotency-Key', key('foreign-capa')).send({ verifierUserId: 'verifier', effectivenessRequired: false }).expect(201);
    const action = await request(app.getHttpServer()).post(`/api/v1/capas/${capa.body.data.id}/actions`).set('Idempotency-Key', key('foreign-capa-action')).send({ actionType: 'corrective', title: 'Evidence authorization', responsibleUserId: 'inspector-a', dueAt: '2026-07-20T00:00:00.000Z' }).expect(201);
    currentUser = makeUser('inspector-a');
    await request(app.getHttpServer()).post(`/api/v1/capa-actions/${action.body.data.id}/submit`).set('Idempotency-Key', key('foreign-capa-submit')).send({ completionStatement: 'Done', evidenceFileIds: [fileId] }).expect(403);
    expect(await source.query('SELECT id FROM capa_action_evidence WHERE capa_action_id=$1', [action.body.data.id])).toHaveLength(0);
    expect(await source.query('SELECT status FROM capa_actions WHERE id=$1', [action.body.data.id])).toEqual([expect.objectContaining({ status: 'assigned' })]);
  });

  it('serves saved inspection evidence and signatures only through the readable inspection', async () => {
    const inspection = await createIssuedInspection();
    currentUser = makeUser('inspector-a', ['all_authenticated', 'crew']);
    const evidenceId = await createFile();
    const signatureId = await createFile();
    await request(app.getHttpServer()).post(`/api/v1/inspections/${inspection.id}/results`).set('Idempotency-Key', key('download-result')).send({ templateItemSnapshotKey: inspection.templateSnapshot.items[0]!.snapshotKey, conclusion: 'nonconforming', evidenceFileIds: [evidenceId] }).expect(200);
    await request(app.getHttpServer()).post(`/api/v1/inspections/${inspection.id}/submit`).set('Idempotency-Key', key('download-submit')).send({ signatureFileId: signatureId }).expect(200);
    currentUser = makeUser('inspector-b', ['all_authenticated', 'crew']);
    const download = await request(app.getHttpServer()).get(`/api/v1/inspections/${inspection.id}/files/${evidenceId}/download-url`).expect(200);
    expect(download.body.data.downloadUrl).toBe('https://storage.test/inspection-evidence');
    expect(oss.createDownloadSignature).toHaveBeenLastCalledWith(`tests/${evidenceId}.jpg`);
    await request(app.getHttpServer()).get(`/api/v1/inspections/${inspection.id}/files/${signatureId}/download-url`).expect(200);
    const detail = await request(app.getHttpServer()).get(`/api/v1/inspections/${inspection.id}`).expect(200);
    expect(detail.body.data.results[0].evidenceFiles).toEqual([expect.objectContaining({ id: evidenceId, fileName: 'evidence.jpg', mimeType: 'image/jpeg', fileSize: 100 })]);
    expect(detail.body.data.results[0].signatureFile).toMatchObject({ id: signatureId, fileName: 'evidence.jpg' });
    expect(JSON.stringify(detail.body.data.results)).not.toMatch(/ossKey|storagePath|downloadUrl/);
    oss.createDownloadSignature.mockClear();
    const foreignId = await createFile();
    await request(app.getHttpServer()).get(`/api/v1/inspections/${inspection.id}/files/${foreignId}/download-url`).expect(404);
    await request(app.getHttpServer()).get(`/api/v1/files/${encodeURIComponent(`tests/${evidenceId}.jpg`)}/download-url`).expect(403);
    currentUser = makeUser('unrelated', ['all_authenticated', 'crew']);
    await request(app.getHttpServer()).get(`/api/v1/inspections/${inspection.id}/files/${evidenceId}/download-url`).expect(403);
    expect(oss.createDownloadSignature).not.toHaveBeenCalled();
  });

  it('lets the issue verifier read CAPA evidence while rejecting foreign files and unrelated users', async () => {
    const issue = await request(app.getHttpServer()).post('/api/v1/issues').set('Idempotency-Key', key('download-capa-issue')).send({ title: 'Evidence download', issueType: 'nonconformity', severity: 'minor', responsibleUserId: 'inspector-a', dueAt: '2026-12-01T00:00:00.000Z' }).expect(201);
    const capa = await request(app.getHttpServer()).post(`/api/v1/issues/${issue.body.data.id}/capa`).set('Idempotency-Key', key('download-capa')).send({ verifierUserId: 'verifier' }).expect(201);
    const action = await request(app.getHttpServer()).post(`/api/v1/capas/${capa.body.data.id}/actions`).set('Idempotency-Key', key('download-capa-action')).send({ actionType: 'corrective', title: 'Evidence download', responsibleUserId: 'inspector-a', dueAt: '2026-12-01T00:00:00.000Z' }).expect(201);
    currentUser = makeUser('inspector-a', ['all_authenticated', 'crew']);
    const fileId = await createFile();
    await request(app.getHttpServer()).post(`/api/v1/capa-actions/${action.body.data.id}/submit`).set('Idempotency-Key', key('download-capa-submit')).send({ completionStatement: 'Done', evidenceFileIds: [fileId] }).expect(200);
    currentUser = makeUser('verifier', ['all_authenticated', 'crew']);
    await request(app.getHttpServer()).get(`/api/v1/capa-actions/${action.body.data.id}/files/${fileId}/download-url`).expect(200);
    const detail = await request(app.getHttpServer()).get(`/api/v1/issues/${issue.body.data.id}`).expect(200);
    expect(detail.body.data.capa.actions[0].evidenceFiles).toEqual([expect.objectContaining({ id: fileId, fileName: 'evidence.jpg', mimeType: 'image/jpeg', fileSize: 100 })]);
    expect(JSON.stringify(detail.body.data.capa.actions)).not.toMatch(/ossKey|storagePath|downloadUrl/);
    oss.createDownloadSignature.mockClear();
    await request(app.getHttpServer()).get(`/api/v1/capa-actions/${action.body.data.id}/files/${await createFile()}/download-url`).expect(404);
    await source.query('UPDATE capa_action_evidence SET status=$1 WHERE capa_action_id=$2', ['withdrawn', action.body.data.id]);
    await request(app.getHttpServer()).get(`/api/v1/capa-actions/${action.body.data.id}/files/${fileId}/download-url`).expect(404);
    currentUser = makeUser('unrelated', ['all_authenticated', 'crew']);
    await request(app.getHttpServer()).get(`/api/v1/capa-actions/${action.body.data.id}/files/${fileId}/download-url`).expect(403);
    expect(oss.createDownloadSignature).not.toHaveBeenCalled();
  });

  it('links each existing inspection-rectification source in both directions', async () => {
    for (const [index, moduleCode] of ['goa_safety_hazard', 'shipping_self_inspection', 'shipping_vessel_inspection', 'shipping_maritime_safety_check'].entries()) {
      const recordId = crypto.randomUUID();
      await source.query(`INSERT INTO workbench_records (id,module_code,template_code,record_no,status,title,summary,department_code,owner_user_id,applicant_user_id,occurred_at) VALUES ($1,$2,'inspection-template',$3,'checking','来源检查','来源保留','shipping','plan-owner','plan-owner',now())`, [recordId, moduleCode, `REC-${index}`]);
      const created = await request(app.getHttpServer()).post('/api/v1/issues').set('Idempotency-Key', key(`source-${moduleCode}`)).send({ title: `${moduleCode} 来源问题`, issueType: 'hazard', severity: 'minor', responsibilityScope: 'vessel', responsibleUserId: 'inspector-a', dueAt: '2026-08-01T00:00:00.000Z', source: { sourceType: 'workbench_record', sourceId: recordId } }).expect(201);
      expect(created.body.data.sources).toEqual([expect.objectContaining({ sourceType: 'workbench_record', sourceId: recordId })]);
      const reverse = await request(app.getHttpServer()).get(`/api/v1/workbench/records/${recordId}/issues`).expect(200);
      expect(reverse.body.data).toEqual([expect.objectContaining({ id: created.body.data.id })]);
    }
  });
});
