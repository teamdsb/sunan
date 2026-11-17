import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { DataSource } from 'typeorm';
import * as XLSX from 'xlsx';

import { ExportJobEntity } from 'src/database/entities/export-job.entity';
import { EvidenceRecordEntity } from 'src/database/entities/evidence-record.entity';
import { FileEntity } from 'src/database/entities/file.entity';
import { SafetyTaskNotificationDeliveryEntity } from 'src/database/entities/safety-plan-task.entity';
import { VesselEntity } from 'src/database/entities/vessel.entity';
import { WorkbenchRecordEntity } from 'src/database/entities/workbench-record.entity';
import { WecomApprovalInstanceSyncEntity } from 'src/database/entities/wecom-approval-instance-sync.entity';
import { OssService } from 'src/modules/files/oss.service';
import { WecomHttpGateway } from 'src/modules/wecom/wecom-http.gateway';
import { createFullSystemRehearsal } from 'test/full-system-rehearsal';

describe('Safety and workbench authenticated HTTP rehearsal', () => {
  let rehearsal: Awaited<ReturnType<typeof createFullSystemRehearsal>>;
  let app: INestApplication;
  let source: DataSource;
  let adminToken: string;
  let vesselId: string;
  let failUpload = false;
  let failApprovalQuery = false;
  const objects = new Map<string, Buffer>();
  const get = (path: string) => request(app.getHttpServer() as Parameters<typeof request>[0]).get(`/api/v1${path}`).set('Authorization', `Bearer ${adminToken}`);
  const post = (path: string) => request(app.getHttpServer() as Parameters<typeof request>[0]).post(`/api/v1${path}`).set('Authorization', `Bearer ${adminToken}`).set('Idempotency-Key', crypto.randomUUID());
  const patch = (path: string) => request(app.getHttpServer() as Parameters<typeof request>[0]).patch(`/api/v1${path}`).set('Authorization', `Bearer ${adminToken}`);

  beforeAll(async () => {
    jest.spyOn(OssService.prototype, 'uploadBuffer').mockImplementation(async (key, body) => {
      if (failUpload) { failUpload = false; throw new Error('synthetic object storage failure'); }
      objects.set(key, body);
    });
    jest.spyOn(OssService.prototype, 'createDownloadSignature').mockImplementation(async (key) => ({ downloadUrl: `https://synthetic.invalid/${encodeURIComponent(key)}`, expiresAt: new Date(Date.now() + 60_000).toISOString() }));
    rehearsal = await createFullSystemRehearsal();
    ({ app, source } = rehearsal);
    const login = await get('/auth/wecom/callback?code=admin').expect(200);
    adminToken = login.body.data.accessToken;
    await post('/admin/wecom-directory-sync').expect(201);
    await source.query(`INSERT INTO personnel (wecom_user_id,name,department_code,employment_status,is_sync_from_wecom) VALUES ('w5-admin','合成管理员','general_office','active',true),('w5-member','合成未登录船员','shipping','active',true) ON CONFLICT (wecom_user_id) WHERE deleted_at IS NULL AND wecom_user_id IS NOT NULL DO UPDATE SET employment_status='active', deleted_at=NULL`);
    vesselId = (await source.getRepository(VesselEntity).save({ code: 'HTTP-SAFETY', name: '合成验收船', category: 'main_vessel', status: 'active' })).id;
    Object.assign(app.get(WecomHttpGateway), {
      createApprovalTemplate: jest.fn().mockResolvedValue({ template_id: 'synthetic-approval-template' }),
      getOpenApprovalData: jest.fn().mockImplementation(async (_token: string, thirdNo: string) => {
        if (failApprovalQuery) throw new Error('synthetic upstream unavailable');
        return { data: { ThirdNo: thirdNo, OpenSpStatus: 1, OpenTemplateId: 'synthetic-approval-template' } };
      }),
    });
  });
  afterAll(async () => { await rehearsal?.close(); jest.restoreAllMocks(); });

  it('lists published templates and plans, creates a next draft, and exposes issue statistics with drill-down', async () => {
    const items = [{ itemCode: 'FIRE-1', title: '灭火器有效期', resultRequired: true, evidenceRequiredOnFailure: true, sequenceNo: 1 }];
    const created = await post('/inspection-templates').send({ code: 'HTTP-FIRE', name: '消防检查', sourceType: 'company', items }).expect(201);
    const templateId: string = created.body.data.id;
    expect(created.body.data.currentVersionId).toBeNull();
    const versions = await get(`/inspection-templates/${templateId}/versions`).expect(200);
    const versionId: string = versions.body.data[0].id;
    await post(`/inspection-template-versions/${versionId}/publish`).expect(200);
    expect((await get('/inspection-templates').expect(200)).body.data).toEqual(expect.arrayContaining([expect.objectContaining({ id: templateId, currentVersionId: versionId })]));
    const next = await post(`/inspection-templates/${templateId}/versions`).send({ items: [{ ...items[0], title: '下一版消防检查' }] }).expect(201);
    expect(next.body.data).toMatchObject({ status: 'draft', versionNo: 2 });
    expect((await get('/inspection-templates').expect(200)).body.data.find((row: { id: string }) => row.id === templateId).currentVersionId).toBe(versionId);
    const plan = await post('/inspection-plans').send({ title: '下月消防检查', templateVersionId: versionId, responsibleUserId: 'w5-member', completionRule: 'all', recurrence: { kind: 'one_time', startAt: new Date(Date.now() + 86_400_000).toISOString() }, dueOffsetMinutes: 60 }).expect(201);
    expect((await get('/inspection-plans').expect(200)).body.data).toEqual(expect.arrayContaining([expect.objectContaining({ id: plan.body.data.id, templateVersionId: versionId })]));
    const issue = await post('/issues').send({ title: '消防隐患合成样本', issueType: 'hazard', severity: 'major', responsibleUserId: 'w5-member', dueAt: new Date(Date.now() + 86_400_000).toISOString() }).expect(201);
    const stats = await get('/issues/statistics').expect(200);
    expect(stats.body.data).toMatchObject({ total: 1, bySeverity: { major: 1 } });
    expect(stats.body.data.drillDown).toEqual([expect.objectContaining({ id: issue.body.data.id })]);
  });

  it('round-trips plan and item edits and runs the real generation and delivery jobs', async () => {
    const input = { title: '合成计划', planType: 'one_time', timeZone: 'Asia/Shanghai' };
    const created = await post('/plans').send(input).expect(201);
    const planId: string = created.body.data.id;
    await patch(`/plans/${planId}`).send({ ...input, title: '已修改合成计划', description: '真实HTTP修改' }).expect(200);
    expect((await get(`/plans/${planId}`).expect(200)).body.data).toMatchObject({ title: '已修改合成计划', description: '真实HTTP修改' });
    const item = { title: '巡查', responsibleUserId: 'w5-member', completionRule: 'all', dueOffsetMinutes: 60, recurrence: { kind: 'one_time', startAt: new Date(Date.now() + 2 * 86_400_000).toISOString() } };
    const added = await post(`/plans/${planId}/items`).send(item).expect(201);
    const itemId: string = added.body.data.id;
    await patch(`/plans/${planId}/items/${itemId}`).send({ ...item, title: '修改后的巡查', dueOffsetMinutes: 90 }).expect(200);
    expect((await get(`/plans/${planId}/items`).expect(200)).body.data).toEqual([expect.objectContaining({ id: itemId, title: '修改后的巡查', dueOffsetMinutes: 90, ruleVersion: 2 })]);
    await post(`/plans/${planId}/actions`).send({ actionType: 'activate' }).expect(200);
    expect((await get('/plans?status=active').expect(200)).body.data).toEqual(expect.arrayContaining([expect.objectContaining({ id: planId })]));
    const jobs = await post('/plan-task-jobs/actions/run').expect(202);
    expect(jobs.body.data).toMatchObject({ failed: 0 });
    expect(jobs.body.data.created).toBeGreaterThanOrEqual(1);
    const tasks = await get(`/tasks?planId=${planId}&view=initiated`).expect(200);
    expect(tasks.body.data).toEqual([expect.objectContaining({ title: '修改后的巡查', responsibleUserId: 'w5-member' })]);
    const deliveries = await get(`/tasks/${tasks.body.data[0].id}/notification-deliveries`).expect(200);
    expect(deliveries.body.data).toEqual(expect.arrayContaining([expect.objectContaining({ messageType: 'assignment', status: 'sent' })]));
    const deliveryRepository = source.getRepository(SafetyTaskNotificationDeliveryEntity);
    const originalDelivery = await deliveryRepository.findOneByOrFail({ id: deliveries.body.data[0].id });
    const retryDelivery = await deliveryRepository.save({ taskId: originalDelivery.taskId, recipientUserId: originalDelivery.recipientUserId, messageType: 'reminder', dedupeKey: `synthetic-http-retry:${crypto.randomUUID()}`, payloadSnapshot: originalDelivery.payloadSnapshot, status: 'failed', attemptCount: 1, nextRetryAt: new Date(Date.now() - 1_000), failureReason: 'synthetic retryable failure', createdBy: 'w5-admin', updatedBy: 'w5-admin' });
    const sendCount = rehearsal.controls.sends.length;
    const processed = await post('/task-notification-deliveries/actions/process').expect(202);
    expect(processed.body.data).toMatchObject({ processed: 1, sent: 1, failed: 0 });
    expect(rehearsal.controls.sends).toHaveLength(sendCount + 1);
    expect(await deliveryRepository.findOneByOrFail({ id: retryDelivery.id })).toMatchObject({ status: 'sent', attemptCount: 2 });
  });

  it('persists positive signature/location evidence and safely reconciles the original approval over HTTP', async () => {
    const created = await post('/workbench/records').send({ moduleCode: 'shipping_voyage_approval', title: '合成航次审批', summary: '航前检查完成', vesselId, payload: { vesselName: '合成验收船', voyageRoute: '北海-钦州', departureAt: '2026-11-18T00:00:00Z', safetySummary: '检查完成' } }).expect(201);
    const recordId: string = created.body.data.id;
    const file = await source.getRepository(FileEntity).save({ ossKey: `synthetic/${crypto.randomUUID()}.png`, fileName: 'signature.png', mimeType: 'image/png', fileSize: 100, category: 'workbench', uploadedBy: 'w5-admin' });
    const signed = await post(`/workbench/records/${recordId}/signature-evidence`).send({ signatureFileId: file.id, businessSummaryHash: 'a'.repeat(64) }).expect(201);
    const signatureId: string = signed.body.data.id;
    expect(signed.body.data).toMatchObject({ businessId: recordId, fileId: file.id, evidenceType: 'signature', capturedBy: 'w5-admin' });
    const detail = await get(`/workbench/records/${recordId}`).expect(200);
    expect(detail.body.data.signatureEvidence).toEqual([expect.objectContaining({ id: signed.body.data.id, fileId: file.id, fileName: 'signature.png', mimeType: 'image/png', fileSize: 100 })]);
    expect(detail.body.data.signatureEvidence[0]).not.toHaveProperty('ossKey');
    expect(detail.body.data.signatureEvidence[0]).not.toHaveProperty('storagePath');
    expect((await get(`/workbench/records/${recordId}/attachments/${file.id}/download-url`).expect(200)).body.data.downloadUrl).toBe(`https://synthetic.invalid/${encodeURIComponent(file.ossKey)}`);
    await get(`/files/${encodeURIComponent(file.ossKey)}/download-url`).expect(403);
    const unrelated = await post('/workbench/records').send({ moduleCode: 'shipping_voyage_approval', title: '另一条合成航次', summary: '另一条记录的附件范围', vesselId, payload: { vesselName: '合成验收船', voyageRoute: '北海-钦州', departureAt: '2026-11-18T00:00:00Z', safetySummary: '检查完成' } }).expect(201);
    await get(`/workbench/records/${unrelated.body.data.id}/attachments/${file.id}/download-url`).expect(404);
    await source.getRepository(EvidenceRecordEntity).update(signatureId, { status: 'inactive' });
    await get(`/workbench/records/${recordId}/attachments/${file.id}/download-url`).expect(404);
    expect((await get(`/workbench/records/${recordId}`).expect(200)).body.data.signatureEvidence).toEqual([]);
    const location = await post(`/workbench/records/${recordId}/location-evidence`).send({ captureStatus: 'captured', latitude: 21.5, longitude: 108.3, accuracyMeters: 20 }).expect(201);
    expect(location.body.data).toMatchObject({ businessId: recordId, captureStatus: 'captured', latitude: 21.5, longitude: 108.3 });
    const launchInput = { businessRecordId: recordId, moduleCode: 'shipping_voyage_approval', templateCode: 'shipping_voyage_approval_v1', title: '合成航次审批', applicantUserId: 'w5-admin' };
    const launched = await post('/wecom/approval/launch').send(launchInput).expect(200);
    const thirdNo: string = launched.body.data.thirdNo;
    failApprovalQuery = true;
    const uncertain = await post('/wecom/approval/launch').send(launchInput).expect(409);
    expect(uncertain.body.message).toContain('审批状态尚未核实');
    expect((await source.getRepository(WecomApprovalInstanceSyncEntity).findOneByOrFail({ businessRecordId: recordId })).approvalSyncStatus).toBe('pending_confirmation');
    expect((await source.getRepository(WorkbenchRecordEntity).findOneByOrFail({ id: recordId })).externalProcessInstanceId).toBe(thirdNo);
    failApprovalQuery = false;
    const recovered = await post('/wecom/approval/launch').send(launchInput).expect(200);
    expect(recovered.body.data.wecomLaunchConfig).toMatchObject({ oaType: '10002', thirdNo });
    expect(await source.getRepository(WecomApprovalInstanceSyncEntity).count({ where: { businessRecordId: recordId } })).toBe(1);
  });

  it('reads and retries a failed attendance export, downloads its actual workbook, and exports scoped business reports', async () => {
    await post('/workbench/records').send({ moduleCode: 'shipping_attendance', title: '合成考勤', summary: '正常值班', vesselId, occurredAt: '2026-11-17T01:00:00Z', payload: { crewName: '验收船员', period: 'am', locationInRange: 'true', dutyType: 'normal', workHours: 4 } }).expect(201);
    failUpload = true;
    const start = await get('/workbench/statistics/attendance/export?month=2026-11&exportFormat=xlsx').expect(202);
    const jobId: string = start.body.data.exportJobId;
    const waitForExport = async () => {
      let job = await source.getRepository(ExportJobEntity).findOneByOrFail({ id: jobId });
      for (let attempt = 0; attempt < 100 && ['queued', 'running'].includes(job.status); attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 20));
        job = await source.getRepository(ExportJobEntity).findOneByOrFail({ id: jobId });
      }
      return job;
    };
    expect((await waitForExport()).status).toBe('failed');
    expect((await get(`/workbench/export-jobs/${jobId}`).expect(200)).body.data).toMatchObject({ id: jobId, status: 'failed', failureMessage: 'synthetic object storage failure' });
    await post(`/workbench/export-jobs/${jobId}/retry`).expect(202);
    const finished = await waitForExport();
    expect(finished).toMatchObject({ status: 'succeeded', retryCount: 1 });
    const file = await source.getRepository(FileEntity).findOneByOrFail({ id: finished.resultFileId! });
    const buffer = objects.get(file.ossKey);
    if (!buffer) throw new Error('The completed export did not upload a workbook');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    expect(XLSX.utils.sheet_to_json(workbook.Sheets['考勤明细']!, { range: 4 })).toEqual(expect.arrayContaining([expect.objectContaining({ 姓名: '验收船员', 工时: 4 })]));
    expect((await get(`/workbench/export-jobs/${jobId}/download-url`).expect(200)).body.data.downloadUrl).toBe(`https://synthetic.invalid/${encodeURIComponent(file.ossKey)}`);
    const people = await get('/workbench/learning/people').expect(200);
    expect(people.body.data).toEqual(expect.arrayContaining([expect.objectContaining({ userId: 'w5-member' })]));
    const learning = await post('/workbench/records').send({ moduleCode: 'goa_training', title: '合成安全培训', summary: '阅读安全要求', occurredAt: '2026-11-17T01:00:00Z', payload: { trainingType: '岗前', trainer: '讲师', hours: 2, participants: '合成未登录船员' } }).expect(201);
    await post(`/workbench/records/${learning.body.data.id}/learning/publish`).send({ userIds: ['w5-member'], hours: 2 }).expect(201);
    await post('/workbench/fuel/measurements').send({ vesselId, month: '2026-11', fuelType: '柴油', unit: 'L', openingBalance: 100, closingBalance: 70 }).expect(201);
    await get('/workbench/statistics/learning/export?month=2026-11').expect(200);
    await get('/workbench/statistics/fuel/export?month=2026-11').expect(200);
    const files = await source.getRepository(FileEntity).find({ where: { category: 'workbench_export' } });
    const learningFile = files.find((row) => row.fileName === 'learning-2026-11.xlsx');
    const fuelFile = files.find((row) => row.fileName === 'fuel-2026-11.xlsx');
    if (!learningFile || !fuelFile) throw new Error('Business report export files are missing');
    const learningBook = XLSX.read(objects.get(learningFile.ossKey), { type: 'buffer' });
    expect(XLSX.utils.sheet_to_json(learningBook.Sheets['学习明细']!, { range: 4 })).toEqual(expect.arrayContaining([expect.objectContaining({ 课程: '合成安全培训', 姓名: '合成未登录船员' })]));
    const fuelBook = XLSX.read(objects.get(fuelFile.ossKey), { type: 'buffer' });
    expect(XLSX.utils.sheet_to_json(fuelBook.Sheets['燃油月报']!, { range: 4 })).toEqual(expect.arrayContaining([expect.objectContaining({ 船舶: '合成验收船', 月末实测: 70 })]));
  });
});
