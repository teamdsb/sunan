import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { appEnv } from 'src/config/env';
import { CertificateFileEntity } from 'src/database/entities/certificate-file.entity';
import { CertificateTypeEntity } from 'src/database/entities/certificate-type.entity';
import { EvidenceAuditEntity } from 'src/database/entities/evidence-audit.entity';
import { FileEntity } from 'src/database/entities/file.entity';
import { VesselEntity } from 'src/database/entities/vessel.entity';
import { WecomUserEntity } from 'src/database/entities/wecom-user.entity';
import { CertificateModule } from 'src/modules/certificate/certificate.module';
import { EnterprisePolicyModule } from 'src/modules/enterprise-policy/enterprise-policy.module';
import { EnterpriseProfileModule } from 'src/modules/enterprise-profile/enterprise-profile.module';
import { MasterDataModule } from 'src/modules/master-data/master-data.module';
import { OfficeModule } from 'src/modules/office/office.module';
import { ProcurementModule } from 'src/modules/procurement/procurement.module';
import { createM9Wave5Rehearsal } from 'test/m9-wave5-rehearsal';

describe('My, office and procurement HTTP contracts with real JWT and PostgreSQL', () => {
  let rehearsal: Awaited<ReturnType<typeof createM9Wave5Rehearsal>>;
  let app: INestApplication;
  let source: DataSource;
  let admin: string;
  let member: string;
  let shipping: string;
  const previous = { admins: appEnv.WECOM_SYSTEM_ADMIN_USER_IDS, key: appEnv.SYSTEM_SETTINGS_ENCRYPTION_KEY };
  const http = () => request(app.getHttpServer() as Parameters<typeof request>[0]);
  const get = (path: string, token = admin) => http().get(`/api/v1${path}`).set('Authorization', `Bearer ${token}`);
  const post = (path: string, token = admin) => http().post(`/api/v1${path}`).set('Authorization', `Bearer ${token}`);
  const patch = (path: string, token = admin) => http().patch(`/api/v1${path}`).set('Authorization', `Bearer ${token}`);
  const remove = (path: string, token = admin) => http().delete(`/api/v1${path}`).set('Authorization', `Bearer ${token}`);
  const createFile = () => source.getRepository(FileEntity).save({
    ossKey: `enterprise/policies/${randomUUID()}.pdf`, fileName: '合成制度.pdf', mimeType: 'application/pdf', fileSize: 128,
    category: 'enterprise-policies', uploadedBy: 'w5-admin', orphanedAt: new Date(),
  });

  beforeAll(async () => {
    rehearsal = await createM9Wave5Rehearsal([OfficeModule, EnterpriseProfileModule, EnterprisePolicyModule, ProcurementModule, MasterDataModule, CertificateModule]);
    ({ app, source } = rehearsal);
    const adminLogin = await get('/auth/wecom/callback?code=admin').expect(200);
    const memberLogin = await get('/auth/wecom/callback?code=member').expect(200);
    admin = adminLogin.body.data.accessToken as string;
    member = memberLogin.body.data.accessToken as string;
    await source.getRepository(WecomUserEntity).save({ userId: 'w5-shipping', corpId: appEnv.WECOM_CORP_ID, name: '合成船务', sourceStatus: 'active', departmentIds: [6], departmentNames: ['船务部'], departmentCodes: ['shipping_dept'], roleMode: 'manual', manualRoles: ['shipping'] });
    shipping = app.get(JwtService).sign({ sub: 'w5-shipping', corpId: appEnv.WECOM_CORP_ID });
  });

  afterAll(async () => {
    await rehearsal?.close();
    appEnv.WECOM_SYSTEM_ADMIN_USER_IDS = previous.admins;
    appEnv.SYSTEM_SETTINGS_ENCRYPTION_KEY = previous.key;
  });

  it('preserves deleted office audit history and paginates inside category scope', async () => {
    const payload = { categoryCode: 'maritime', title: '合成海事入口', summary: '只用于本地回归', iconType: 'maritime', targetType: 'external_url', targetValue: 'https://example.com/office', visibilityRoles: ['all_authenticated'] };
    const created = await post('/office/admin/entries').send(payload).expect(201);
    const id = created.body.data.id as string;
    await patch(`/office/admin/entries/${id}`).send({ title: '海事入口已更新' }).expect(200);
    await post(`/office/admin/entries/${id}/publish`).expect(201);
    const detail = await get(`/office/entries/${id}`, member).expect(200);
    expect(detail.body.data).toMatchObject({ title: '海事入口已更新', status: 'published' });
    await post(`/office/entries/${id}/open`, member).expect(201);
    expect((await get('/office/admin/entries', shipping).expect(200)).body.data).toEqual(expect.arrayContaining([expect.objectContaining({ id })]));
    await patch(`/office/admin/entries/${id}`, member).send({ title: '越权修改' }).expect(403);
    await remove(`/office/admin/entries/${id}`).expect(204);
    await get(`/office/entries/${id}`, member).expect(404);
    await post('/office/admin/entries').send({ ...payload, categoryCode: 'customs', title: '较新但不可管的海关入口' }).expect(201);

    const first = await get('/office/admin/audits?page=1&pageSize=1', shipping).expect(200);
    expect(first.body.meta).toMatchObject({ total: 5, totalPages: 5 });
    expect(first.body.data).toEqual([expect.objectContaining({ entryId: id, entryTitle: '海事入口已更新', action: 'delete' })]);
    const second = await get('/office/admin/audits?page=2&pageSize=1', shipping).expect(200);
    expect(second.body.data).toEqual([expect.objectContaining({ entryId: id, action: 'open' })]);
    const all = await get(`/office/admin/audits?entryId=${id}`).expect(200);
    expect(all.body.data.map((audit: { action: string }) => audit.action)).toEqual(['delete', 'open', 'publish', 'update', 'create']);
    expect((await get('/office/admin/entries').expect(200)).body.data).not.toEqual(expect.arrayContaining([expect.objectContaining({ id })]));
  });

  it('returns profile content to ordinary readers and persists a valid manager update', async () => {
    const created = await post('/enterprise-profiles').send({ title: '合成企业资料', category: 'notice', description: '初始正文', status: 'published' }).expect(201);
    const id = created.body.data.id as string;
    await patch(`/enterprise-profiles/${id}`).send({ title: '更新后的企业资料', description: '普通员工可读正文' }).expect(200);
    const detail = await get(`/enterprise-profiles/${id}`, member).expect(200);
    expect(detail.body.data).toMatchObject({ title: '更新后的企业资料', description: '普通员工可读正文', canManage: false });
    await patch(`/enterprise-profiles/${id}`, member).send({ description: '越权修改' }).expect(403);
    await remove(`/enterprise-profiles/${id}`).expect(204);
    await get(`/enterprise-profiles/${id}`).expect(404);
  });

  it('unbinds certificate attachments with real JWT permissions and preserves unrelated and shared files', async () => {
    const vessel = await source.getRepository(VesselEntity).save({ code: `CERT-${randomUUID().slice(0, 8)}`, name: '合成解绑船舶', category: 'main_vessel', status: 'active' });
    const type = await source.getRepository(CertificateTypeEntity).save({ code: `HTTP-${randomUUID()}`, name: '合成解绑证照类型', ownerScope: 'vessel', reminderCategory: 'ship', defaultAdvanceDays: 30 });
    const createCertificate = async (title: string) => {
      const response = await post('/certificates').send({ title, certificateTypeId: type.id, ownerType: 'vessel', ownerId: vessel.id, expiryDate: '2027-11-17T00:00:00+08:00' }).expect(201);
      return response.body.data.id as string;
    };
    const oldOrphanedAt = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const createCertificateFile = (name: string) => source.getRepository(FileEntity).save({
      ossKey: `certificates/${randomUUID()}.pdf`, fileName: `${name}.pdf`, mimeType: 'application/pdf', fileSize: 128,
      category: 'certificates', uploadedBy: 'w5-admin', orphanedAt: oldOrphanedAt,
    });
    const [detached, shared, foreign] = await Promise.all([
      createCertificateFile('detached'), createCertificateFile('shared'), createCertificateFile('foreign'),
    ]);
    const targetId = await createCertificate('待解绑证照');
    const otherId = await createCertificate('其他证照');
    await post(`/certificates/${targetId}/files`).send({ fileIds: [detached.id, shared.id] }).expect(201);
    await post(`/certificates/${otherId}/files`).send({ fileIds: [shared.id, foreign.id] }).expect(201);
    const relations = source.getRepository(CertificateFileEntity);
    const fileRepository = source.getRepository(FileEntity);
    const audits = source.getRepository(EvidenceAuditEntity);

    await remove(`/certificates/${targetId}/files/${detached.id}`, member).expect(403);
    expect(await relations.existsBy({ certificateId: targetId, fileId: detached.id })).toBe(true);
    expect(await audits.countBy({ objectType: 'certificate', objectId: targetId })).toBe(0);

    // An unrelated file ID is an idempotent no-op within this certificate.
    await remove(`/certificates/${targetId}/files/${foreign.id}`).expect(204);
    expect(await relations.existsBy({ certificateId: otherId, fileId: foreign.id })).toBe(true);
    expect((await fileRepository.findOneByOrFail({ id: foreign.id })).orphanedAt).toEqual(oldOrphanedAt);
    expect(await audits.countBy({ objectType: 'certificate', objectId: targetId })).toBe(0);

    await remove(`/certificates/${targetId}/files/${shared.id}`).expect(204);
    expect(await relations.existsBy({ certificateId: targetId, fileId: shared.id })).toBe(false);
    expect(await relations.existsBy({ certificateId: otherId, fileId: shared.id })).toBe(true);
    expect((await fileRepository.findOneByOrFail({ id: shared.id })).orphanedAt).toBeNull();

    const unlinkedAt = Date.now();
    await remove(`/certificates/${targetId}/files/${detached.id}`).expect(204);
    expect(await relations.existsBy({ certificateId: targetId, fileId: detached.id })).toBe(false);
    const retained = await fileRepository.findOneByOrFail({ id: detached.id });
    expect(retained.orphanedAt?.getTime()).toBeGreaterThanOrEqual(unlinkedAt);
    expect(retained.orphanedAt?.getTime()).toBeLessThanOrEqual(Date.now());
    expect((await get(`/certificates/${targetId}`).expect(200)).body.data.files).toEqual([]);
    expect((await get(`/certificates/${otherId}`).expect(200)).body.data.files.map((file: { id: string }) => file.id).sort()).toEqual([shared.id, foreign.id].sort());
    expect(await audits.findBy({ objectType: 'certificate', objectId: targetId })).toEqual(expect.arrayContaining([
      expect.objectContaining({ action: 'remove_attachment', operatorUserId: 'w5-admin', metadata: expect.objectContaining({ fileId: shared.id }) }),
      expect.objectContaining({ action: 'remove_attachment', operatorUserId: 'w5-admin', metadata: expect.objectContaining({ fileId: detached.id }) }),
    ]));
  });

  it('allows draft policy edits and file removal, then freezes the published history', async () => {
    const file = await createFile();
    const publishedFile = await createFile();
    const created = await post('/enterprise-policies').send({ title: '合成制度', policyCode: 'HTTP-POLICY', version: 'v1', summary: '初始摘要', fileIds: [file.id] }).expect(201);
    const id = created.body.data.id as string;
    await patch(`/enterprise-policies/${id}`).send({ title: '发布前标题', summary: '发布前正文' }).expect(200);
    await remove(`/enterprise-policies/${id}/files/${file.id}`).expect(204);
    expect((await get(`/enterprise-policies/${id}`).expect(200)).body.data.files).toEqual([]);
    await post(`/enterprise-policies/${id}/files`).send({ fileIds: [publishedFile.id] }).expect(201);
    await post(`/enterprise-policies/${id}/publish`).expect(201);
    await patch(`/enterprise-policies/${id}`).send({ status: 'deprecated', title: '绕过只读改名' }).expect(403);
    await post(`/enterprise-policies/${id}/files`).send({ fileIds: [file.id] }).expect(403);
    await remove(`/enterprise-policies/${id}/files/${publishedFile.id}`).expect(403);
    const reader = await get(`/enterprise-policies/${id}`, member).expect(200);
    expect(reader.body.data).toMatchObject({ title: '发布前标题', summary: '发布前正文', status: 'published', canManage: false, files: [expect.objectContaining({ id: publishedFile.id })] });
    await patch(`/enterprise-policies/${id}`).send({ status: 'deprecated' }).expect(200);
    await patch(`/enterprise-policies/${id}`).send({ summary: '修改已发布历史' }).expect(403);
    await remove(`/enterprise-policies/${id}/files/${publishedFile.id}`).expect(403);
    await remove(`/enterprise-policies/${id}`).expect(204);
    await get(`/enterprise-policies/${id}`).expect(404);

    const initialFile = await createFile();
    const initialPublished = await post('/enterprise-policies').send({ title: '带附件直接发布', policyCode: 'HTTP-POLICY-INITIAL', version: 'v1', status: 'published', fileIds: [initialFile.id] }).expect(201);
    expect(initialPublished.body.data).toMatchObject({ status: 'published', publishedAt: expect.any(String), files: [expect.objectContaining({ id: initialFile.id })] });
  });

  it('returns actual order and report pending tasks and persisted approval history', async () => {
    const created = await post('/procurement/orders').send({ departmentCode: 'general_office', dimensionType: 'none', title: '合成采购', summary: '实际HTTP审批回归', amount: 125 }).expect(201);
    const id = created.body.data.id as string;
    expect((await get(`/procurement/orders/${id}`).expect(200)).body.data).toMatchObject({ id, title: '合成采购', status: 'draft' });
    expect((await get('/procurement/orders').expect(200)).body.data).toEqual(expect.arrayContaining([expect.objectContaining({ id })]));
    await post(`/procurement/orders/${id}/submit`).expect(201);
    expect((await get('/procurement/approvals/pending?entityType=order').expect(200)).body.data).toEqual(expect.arrayContaining([expect.objectContaining({ entityId: id, approvalLevel: 'dept' })]));
    await post(`/procurement/orders/${id}/approvals/actions`).send({ action: 'approve', comment: '部门通过' }).expect(201);
    await post(`/procurement/orders/${id}/approvals/actions`).send({ action: 'approve', comment: '终审通过' }).expect(201);
    const history = await get(`/procurement/orders/${id}/approvals`).expect(200);
    expect(history.body.data).toEqual([expect.objectContaining({ action: 'approve', comment: '部门通过' }), expect.objectContaining({ action: 'approve', comment: '终审通过' })]);

    const report = await post('/procurement/report-requests').send({ reportType: 'monthly', periodYear: new Date().getFullYear(), periodMonth: new Date().getMonth() + 1, departmentCode: 'general_office' }).expect(201);
    const reportId = report.body.data.id as string;
    expect((await get(`/procurement/report-requests/${reportId}`).expect(200)).body.data).toMatchObject({ id: reportId, status: 'draft' });
    await post(`/procurement/report-requests/${reportId}/submit`).expect(201);
    expect((await get('/procurement/report-requests?status=submitted').expect(200)).body.data).toEqual(expect.arrayContaining([expect.objectContaining({ id: reportId })]));
    expect((await get('/procurement/approvals/pending?entityType=report').expect(200)).body.data).toEqual(expect.arrayContaining([expect.objectContaining({ entityId: reportId, approvalLevel: 'dept' })]));
    await post(`/procurement/reports/${reportId}/approvals/actions`).send({ action: 'approve', comment: '报表部门通过' }).expect(201);
    expect((await get(`/procurement/reports/${reportId}/approvals`).expect(200)).body.data).toEqual([expect.objectContaining({ action: 'approve', comment: '报表部门通过' })]);
  });

  it('lists configured budgets and returns submitted orders in the selected report dimension', async () => {
    const year = new Date().getFullYear();
    const dimensionKey = 'http-contract-vessel';
    await post('/procurement/admin/dimensions').send({ departmentCode: 'shipping_dept', dimensionType: 'vessel', dimensionKey, dimensionName: '合成报表船舶' }).expect(201);
    const budget = await post('/procurement/admin/budgets').send({ budgetYear: year, departmentCode: 'shipping_dept', dimensionType: 'vessel', dimensionKey, budgetAmount: 1000, changeReason: '合成预算列表回归' }).expect(201);
    const budgets = await get('/procurement/admin/budgets').query({ year, departmentCode: 'shipping_dept', isEnabled: true }).expect(200);
    expect(budgets.body.data).toEqual([expect.objectContaining({ id: budget.body.data.id, budgetYear: year, dimensionKey, dimensionName: '合成报表船舶', budgetAmount: 1000, executedAmount: 0, isEnabled: true })]);

    const startDate = new Date(Date.now() - 60_000).toISOString();
    const order = await post('/procurement/orders').send({ departmentCode: 'shipping_dept', dimensionType: 'vessel', dimensionKey, title: '合成维度明细采购', summary: '本地真实HTTP明细回归', amount: 75 }).expect(201);
    const id = order.body.data.id as string;
    await post(`/procurement/orders/${id}/submit`).expect(201);
    const query = { departmentCode: 'shipping_dept', dimensionType: 'vessel', dimensionKey, startDate, endDate: new Date().toISOString() };
    const details = await get('/procurement/reports/dimension-details').query(query).expect(200);
    expect(details.body.data).toEqual([expect.objectContaining({ orderId: id, dimensionKey, title: '合成维度明细采购', amount: 75, status: 'submitted' })]);
    expect((await get('/procurement/reports/dimension-details').query({ ...query, dimensionKey: 'other-vessel' }).expect(200)).body.data).toEqual([]);
  });

  it('returns the category and remarks needed when reopening master-data editors', async () => {
    const vessel = await post('/master-data/vessels').send({ code: 'HTTP-VESSEL', name: '合成船舶', category: 'main_vessel' }).expect(201);
    const equipment = await post('/master-data/equipment').send({ code: 'HTTP-EQUIPMENT', name: '合成泵', categoryCode: 'http-pump', vesselId: vessel.body.data.id }).expect(201);
    expect(equipment.body.data).toMatchObject({ categoryCode: 'http-pump' });
    expect((await get('/master-data/equipment').expect(200)).body.data).toEqual(expect.arrayContaining([expect.objectContaining({ id: equipment.body.data.id, categoryCode: 'http-pump' })]));
    const personnel = await post('/master-data/personnel').send({ name: '合成人员', departmentCode: 'shipping_dept', remarks: '原有备注' }).expect(201);
    expect((await get('/master-data/personnel').expect(200)).body.data).toEqual(expect.arrayContaining([expect.objectContaining({ id: personnel.body.data.id, remarks: '原有备注' })]));
  });
});
