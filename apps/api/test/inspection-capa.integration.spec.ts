import type { CanActivate, ExecutionContext, INestApplication } from '@nestjs/common';
import { Module } from '@nestjs/common';
import type { Server } from 'node:http';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import request from 'supertest';
import { DataSource } from 'typeorm';

import { configureApp } from 'src/app.bootstrap';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { InspectionCapaModule } from 'src/modules/inspection-capa/inspection-capa.module';
import { WecomMessageService } from 'src/modules/wecom/wecom-message.service';
import { bootstrapPgTestDatabase, buildPgTypeOrmOptions, shutdownPgTestDatabase } from 'test/pg-test-container';

type TestUser = {
  userId: string; corpId: string; name: string; avatar: null; departments: string[];
  position: string; roles: string[]; isAdmin: boolean;
};

const makeUser = (userId: string, roles = ['all_authenticated', 'shipping']): TestUser => ({
  userId, corpId: 'ww-test', name: userId, avatar: null, departments: ['shipping'],
  position: roles.includes('system_admin') ? '管理员' : '船员', roles, isAdmin: roles.includes('system_admin'),
});

let currentUser = makeUser('plan-owner');
const authGuard: CanActivate = { canActivate(context: ExecutionContext) { context.switchToHttp().getRequest<{ user?: TestUser }>().user = currentUser; return true; } };

@Module({ imports: [TypeOrmModule.forRootAsync({ useFactory: async () => { await bootstrapPgTestDatabase(); return buildPgTypeOrmOptions(); } }), InspectionCapaModule] })
class TestModule {}

describe('inspection and CAPA integration', () => {
  let app: INestApplication<Server>;
  let source: DataSource;

  beforeAll(async () => {
    const ref = await Test.createTestingModule({ imports: [TestModule] })
      .overrideGuard(JwtAuthGuard).useValue(authGuard)
      .overrideProvider(WecomMessageService).useValue({ sendTextCard: jest.fn().mockResolvedValue({ success: true, invalidUser: [] }) })
      .compile();
    app = ref.createNestApplication(); configureApp(app); await app.init(); source = ref.get(DataSource);
  });

  beforeEach(async () => {
    currentUser = makeUser('plan-owner');
    await source.query(`TRUNCATE TABLE inspection_capa_action_logs, capa_verifications, capa_action_evidence, capa_actions, capa_root_causes, safety_capas, issue_transfer_jobs, issue_sources, safety_issues, inspection_result_evidence, inspection_results, inspections, inspection_plans, inspection_template_scopes, inspection_template_items, inspection_template_versions, inspection_templates, safety_task_notification_deliveries, safety_task_generation_entries, safety_task_generation_runs, safety_task_action_logs, safety_task_delegations, safety_task_transfers, safety_task_participants, safety_tasks, safety_plan_items, safety_plans, workbench_records, files RESTART IDENTITY CASCADE`);
    await source.query(`INSERT INTO personnel (wecom_user_id,name,department_code,employment_status,is_sync_from_wecom) VALUES ('plan-owner','Plan owner','shipping','active',true),('inspector-a','Inspector A','shipping','active',true),('inspector-b','Inspector B','shipping','active',true),('verifier','Verifier','shipping','active',true) ON CONFLICT (wecom_user_id) WHERE deleted_at IS NULL AND wecom_user_id IS NOT NULL DO UPDATE SET employment_status='active', deleted_at=NULL`);
  });

  afterAll(async () => { await app?.close(); await shutdownPgTestDatabase(); });

  const key = (scope: string) => `${scope}-${crypto.randomUUID()}`;
  async function createFile() {
    const id = crypto.randomUUID();
    await source.query(`INSERT INTO files (id,oss_key,file_name,mime_type,file_size,category,uploaded_by) VALUES ($1,$2,'evidence.jpg','image/jpeg',100,'workbench','plan-owner')`, [id, `tests/${id}.jpg`]);
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

  it('keeps the issued template snapshot, blocks premature multi-person summary, and deduplicates automatic nonconformity transfer', async () => {
    const inspection = await createIssuedInspection();
    const itemKey = inspection.templateSnapshot.items[0]!.snapshotKey;
    await source.query(`UPDATE inspection_template_items SET title='后续模板编辑' WHERE version_id=$1`, [inspection.templateVersionId]);
    expect((await request(app.getHttpServer()).get(`/api/v1/inspections/${inspection.id}`).expect(200)).body.data.templateSnapshot.items[0].title).toBe('救生圈状态');
    const resultEvidence = await createFile();
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
    const inspection = await createIssuedInspection(); const itemKey = inspection.templateSnapshot.items[0]!.snapshotKey; const evidence = await createFile();
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
