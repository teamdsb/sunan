import type { CanActivate, ExecutionContext, INestApplication } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { configureApp } from 'src/app.bootstrap';
import { appEnv } from 'src/config/env';
import type { CurrentUser } from 'src/common/interfaces/current-user.interface';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { FileEntity } from 'src/database/entities/file.entity';
import { CertificateTypeEntity } from 'src/database/entities/certificate-type.entity';
import { CertificateFileEntity } from 'src/database/entities/certificate-file.entity';
import { EnterpriseProfileFileEntity } from 'src/database/entities/enterprise-profile-file.entity';
import { EnterprisePolicyFileEntity } from 'src/database/entities/enterprise-policy-file.entity';
import { EvidenceRecordEntity } from 'src/database/entities/evidence-record.entity';
import { VesselEntity } from 'src/database/entities/vessel.entity';
import { WecomUserEntity } from 'src/database/entities/wecom-user.entity';
import { WorkbenchRecordEntity } from 'src/database/entities/workbench-record.entity';
import { WorkbenchRecordAttachmentEntity } from 'src/database/entities/workbench-record-attachment.entity';
import { ProcurementOrderEntity } from 'src/database/entities/procurement-order.entity';
import { ProcurementOrderFileEntity } from 'src/database/entities/procurement-order-file.entity';
import { FilesModule } from 'src/modules/files/files.module';
import { OssService } from 'src/modules/files/oss.service';
import { ProcurementModule } from 'src/modules/procurement/procurement.module';
import { CertificateModule } from 'src/modules/certificate/certificate.module';
import { CertificateService } from 'src/modules/certificate/certificate.service';
import { EnterpriseProfileModule } from 'src/modules/enterprise-profile/enterprise-profile.module';
import { EnterpriseProfileService } from 'src/modules/enterprise-profile/enterprise-profile.service';
import { EnterprisePolicyModule } from 'src/modules/enterprise-policy/enterprise-policy.module';
import { EnterprisePolicyService } from 'src/modules/enterprise-policy/enterprise-policy.service';
import { WorkbenchModule } from 'src/modules/workbench/workbench.module';
import { WorkbenchService } from 'src/modules/workbench/workbench.service';
import { REDIS_CLIENT } from 'src/modules/wecom/wecom.constants';
import { WecomHttpGateway } from 'src/modules/wecom/wecom-http.gateway';
import { WecomTokenService } from 'src/modules/wecom/wecom-token.service';
import { bootstrapPgTestDatabase, buildPgTypeOrmOptions, shutdownPgTestDatabase } from 'test/pg-test-container';

const user = (userId: string, roles = ['all_authenticated']): CurrentUser => ({
  userId, roles, corpId: appEnv.WECOM_CORP_ID, name: userId, avatar: null,
  departments: [], position: null, isAdmin: roles.includes('system_admin'),
});
let currentUser = user('uploader');
const authGuard: CanActivate = {
  canActivate(context: ExecutionContext) {
    context.switchToHttp().getRequest<{ user: CurrentUser }>().user = currentUser;
    return true;
  },
};

@Module({ imports: [
  TypeOrmModule.forRootAsync({ useFactory: async () => {
    await bootstrapPgTestDatabase();
    return buildPgTypeOrmOptions();
  } }),
  FilesModule, ProcurementModule, CertificateModule, EnterpriseProfileModule, EnterprisePolicyModule, WorkbenchModule,
] })
class TestFileAuthorizationModule {}

describe('File access and attachment authorization integration', () => {
  let app: INestApplication;
  let ds: DataSource;
  const oss = {
    createUploadSignature: jest.fn(), uploadBuffer: jest.fn(), deleteObject: jest.fn(),
    createDownloadSignature: jest.fn(),
  };
  const token = { getAccessToken: jest.fn() };
  const gateway = { getMedia: jest.fn() };
  const http = () => request(app.getHttpServer() as Parameters<typeof request>[0]);
  const createFile = async (uploadedBy = currentUser.userId, overrides: Partial<FileEntity> = {}) =>
    ds.getRepository(FileEntity).save(ds.getRepository(FileEntity).create({
      ossKey: `procurement/attachments/2026/11/${randomUUID()}.pdf`,
      fileName: 'private.pdf', mimeType: 'application/pdf', fileSize: 128,
      category: 'procurement-attachments', uploadedBy, orphanedAt: new Date(), ...overrides,
    }));
  const createOrder = async (createdBy = currentUser.userId) =>
    ds.getRepository(ProcurementOrderEntity).save(ds.getRepository(ProcurementOrderEntity).create({
      orderNo: `AUTH-${randomUUID().slice(0, 20)}`, departmentCode: 'shipping_dept',
      title: 'File authorization', summary: 'Attachment test', amount: 1,
      status: 'draft', createdBy, updatedBy: createdBy,
    }));
  const bindFixture = async (file: FileEntity, orderId?: string) => {
    const id = orderId ?? (await createOrder('source-owner')).id;
    await ds.getRepository(ProcurementOrderFileEntity).save({ orderId: id, fileId: file.id, createdBy: 'source-owner', relationType: 'attachment' });
  };
  const createWorkbenchRecord = () => ds.getRepository(WorkbenchRecordEntity).save({
    moduleCode: 'business_oil_boom_operation', templateCode: 'file-authorization',
    recordNo: `AUTH-${randomUUID().slice(0, 20)}`, title: 'File authorization', summary: 'Attachment test',
    status: 'draft', departmentCode: 'business_dept', ownerUserId: currentUser.userId,
    applicantUserId: currentUser.userId, occurredAt: new Date(),
  });
  const createManagedTarget = async (kind: 'certificate' | 'profile' | 'policy') => {
    currentUser = user('uploader', ['all_authenticated', 'finance']);
    await ds.getRepository(WecomUserEntity).upsert({ userId: currentUser.userId, corpId: appEnv.WECOM_CORP_ID, name: currentUser.userId, departmentCodes: ['finance_dept'] }, ['userId']);
    if (kind === 'profile') {
      const service = app.get(EnterpriseProfileService);
      const target = await service.create({ title: 'Authorization profile', category: 'license' }, currentUser);
      return { bind: (fileIds: string[]) => service.bindFiles(target.id, { fileIds }, currentUser),
        seed: (fileId: string) => ds.getRepository(EnterpriseProfileFileEntity).save({ enterpriseProfileId: target.id, fileId, sortOrder: 0 }) };
    }
    if (kind === 'policy') {
      const service = app.get(EnterprisePolicyService);
      const target = await service.create({ title: 'Authorization policy', policyCode: randomUUID(), version: 'v1' }, currentUser);
      return { bind: (fileIds: string[]) => service.bindFiles(target.id, { fileIds }, currentUser),
        seed: (fileId: string) => ds.getRepository(EnterprisePolicyFileEntity).save({ enterprisePolicyId: target.id, fileId, sortOrder: 0 }) };
    }
    const vessel = await ds.getRepository(VesselEntity).save({ code: randomUUID().slice(0, 32), name: 'Authorization vessel', category: 'main_vessel', status: 'active' });
    const type = await ds.getRepository(CertificateTypeEntity).save({ code: randomUUID(), name: randomUUID(), ownerScope: 'vessel', reminderCategory: 'ship', defaultAdvanceDays: 30 });
    const service = app.get(CertificateService);
    const target = await service.create({ title: 'Authorization certificate', certificateTypeId: type.id, ownerType: 'vessel', ownerId: vessel.id, expiryDate: '2027-11-17T00:00:00+08:00' }, currentUser);
    return { bind: (fileIds: string[]) => service.bindFiles(target.id, { fileIds }, currentUser),
      seed: (fileId: string) => ds.getRepository(CertificateFileEntity).save({ certificateId: target.id, fileId, sortOrder: 0, fileRole: 'primary' }) };
  };
  const callback = (file: FileEntity) => http().post('/api/v1/files/callback').send({
    ossKey: file.ossKey, fileName: file.fileName, mimeType: file.mimeType,
    fileSize: file.fileSize, category: file.category,
  });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [TestFileAuthorizationModule] })
      .overrideGuard(JwtAuthGuard).useValue(authGuard)
      .overrideProvider(REDIS_CLIENT).useValue({ get: jest.fn(), set: jest.fn(), del: jest.fn() })
      .overrideProvider(OssService).useValue(oss)
      .overrideProvider(WecomTokenService).useValue(token)
      .overrideProvider(WecomHttpGateway).useValue(gateway).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    ds = app.get(DataSource);
  });
  afterAll(async () => { if (app) await app.close(); await shutdownPgTestDatabase(); });
  beforeEach(() => {
    currentUser = user('uploader');
    jest.clearAllMocks();
    oss.createDownloadSignature.mockReturnValue({ downloadUrl: 'https://storage.test/download', expiresAt: '2026-11-17T10:00:00.000Z' });
    token.getAccessToken.mockResolvedValue('test-token');
    gateway.getMedia.mockResolvedValue({ contentType: 'image/jpeg', buffer: Buffer.from('image') });
  });

  it('keeps uploader access to an unbound temporary file, including encoded slash keys and callback retries', async () => {
    const file = await createFile();
    expect((await http().get(`/api/v1/files/${encodeURIComponent(file.ossKey)}/download-url`)).status).toBe(200);
    expect((await callback(file)).status).toBe(201);
  });

  it.each(['temporary', 'bound', 'bound-admin'])('denies global download and callback signatures for %s files without temporary uploader access', async (kind) => {
    const file = await createFile(kind === 'temporary' ? 'other-uploader' : 'uploader');
    if (kind !== 'temporary') await bindFixture(file);
    if (kind === 'bound-admin') currentUser = user('admin', ['system_admin']);
    const download = await http().get(`/api/v1/files/${encodeURIComponent(file.ossKey)}/download-url`);
    const replay = await callback(file);
    expect([download.status, replay.status]).toEqual([403, 403]);
    expect(oss.createDownloadSignature).not.toHaveBeenCalled();
  });

  it.each(['other-uploader', 'bound'])('denies WeCom media replay signatures for %s files', async (kind) => {
    const mediaId = randomUUID();
    const file = await createFile(kind === 'other-uploader' ? 'other-uploader' : 'uploader', {
      ossKey: `inspection/photos/${randomUUID()}.jpg`, category: 'inspection-photos',
      fileName: `wecom-${mediaId}.jpg`, mimeType: 'image/jpeg',
    });
    if (kind === 'bound') await bindFixture(file);
    expect((await http().post('/api/v1/files/from-wecom').send({ mediaId, category: 'inspection-photos' })).status).toBe(403);
    expect(oss.createDownloadSignature).not.toHaveBeenCalled();
    expect(gateway.getMedia).not.toHaveBeenCalled();
  });

  it.each(['other-temporary', 'own-bound', 'other-bound'])('does not launder known %s file IDs through a readable procurement draft', async (kind) => {
    const file = await createFile(kind.startsWith('other') ? 'other-uploader' : 'uploader');
    if (kind.endsWith('bound')) await bindFixture(file);
    const target = await createOrder();
    const response = await http().post(`/api/v1/procurement/orders/${target.id}/attachments`).send({ fileIds: [file.id] });
    expect(response.status).toBe(403);
    expect(await ds.getRepository(ProcurementOrderFileEntity).countBy({ orderId: target.id })).toBe(0);
  });

  it('binds an uploader temporary file and preserves an existing attachment from another uploader idempotently', async () => {
    const temporary = await createFile();
    const historical = await createFile('previous-uploader');
    const target = await createOrder();
    await bindFixture(historical, target.id);
    const response = await http().post(`/api/v1/procurement/orders/${target.id}/attachments`).send({ fileIds: [temporary.id, historical.id] });
    expect(response.status).toBe(201);
    expect(await ds.getRepository(ProcurementOrderFileEntity).countBy({ orderId: target.id })).toBe(2);
    expect((await http().post(`/api/v1/procurement/orders/${target.id}/attachments`).send({ fileIds: [temporary.id, historical.id] })).status).toBe(201);
  });

  it.each(['certificate', 'profile', 'policy'] as const)('authorizes new %s attachments while preserving historical target attachments', async (kind) => {
    const target = await createManagedTarget(kind);
    const other = await createFile('other-uploader');
    await expect(target.bind([other.id])).rejects.toMatchObject({ status: 403 });
    const bound = await createFile();
    await bindFixture(bound);
    await expect(target.bind([bound.id])).rejects.toMatchObject({ status: 403 });
    const historical = await createFile('previous-uploader');
    await target.seed(historical.id);
    const temporary = await createFile();
    await expect(target.bind([temporary.id, historical.id])).resolves.toBeDefined();
    await expect(target.bind([temporary.id, historical.id])).resolves.toBeDefined();
  });

  it.each(['attachment', 'signature'] as const)('blocks known unauthorized workbench %s files and keeps authorized target retention', async (kind) => {
    currentUser = user('uploader', ['all_authenticated', 'business']);
    const target = await createWorkbenchRecord();
    const service = app.get(WorkbenchService);
    const bind = (fileId: string) => kind === 'attachment'
      ? service.uploadAttachment(target.id, { fileId, category: 'document' }, currentUser)
      : service.createSignatureEvidence(target.id, fileId, 'a'.repeat(64), currentUser);
    const other = await createFile('other-uploader');
    await expect(bind(other.id)).rejects.toMatchObject({ status: 403 });
    const bound = await createFile();
    await bindFixture(bound);
    await expect(bind(bound.id)).rejects.toMatchObject({ status: 403 });
    const temporary = await createFile();
    await expect(bind(temporary.id)).resolves.toBeDefined();
    await expect(bind(temporary.id)).resolves.toBeDefined();
    const historical = await createFile('previous-uploader');
    if (kind === 'attachment') await ds.getRepository(WorkbenchRecordAttachmentEntity).save({
      businessRecordId: target.id, category: 'document', fileId: historical.id, fileName: historical.fileName,
      mimeType: historical.mimeType, storagePath: historical.ossKey, uploadedBy: 'previous-uploader', uploadedAt: new Date(),
    });
    else await ds.getRepository(EvidenceRecordEntity).save({
      businessType: 'workbench_record', businessId: target.id, evidenceType: 'signature', fileId: historical.id,
      summaryHash: 'b'.repeat(64), captureStatus: 'captured', capturedBy: 'previous-uploader', status: 'active',
    });
    await expect(bind(historical.id)).resolves.toBeDefined();
  });
});
