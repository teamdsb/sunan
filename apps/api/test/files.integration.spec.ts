import type {
  CanActivate,
  ExecutionContext,
  INestApplication,
} from '@nestjs/common';
import { Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  bootstrapPgTestDatabase,
  buildPgTypeOrmOptions,
  shutdownPgTestDatabase,
} from 'test/pg-test-container';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { FileEntity } from 'src/database/entities/file.entity';
import { FileRecycleJobEntity } from 'src/database/entities/file-recycle-job.entity';
import { EnterpriseProfileModule } from 'src/modules/enterprise-profile/enterprise-profile.module';
import { EnterprisePolicyModule } from 'src/modules/enterprise-policy/enterprise-policy.module';
import { EnterpriseProfileService } from 'src/modules/enterprise-profile/enterprise-profile.service';
import { EnterprisePolicyService } from 'src/modules/enterprise-policy/enterprise-policy.service';
import { EnterpriseProfileFileEntity } from 'src/database/entities/enterprise-profile-file.entity';
import { WecomUserEntity } from 'src/database/entities/wecom-user.entity';
import type { CurrentUser } from 'src/common/interfaces/current-user.interface';
import { FilesService } from 'src/modules/files/files.service';

import { configureApp } from 'src/app.bootstrap';
import { FilesModule } from 'src/modules/files/files.module';
import { OssService } from 'src/modules/files/oss.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { REDIS_CLIENT } from 'src/modules/wecom/wecom.constants';
import { WecomHttpGateway } from 'src/modules/wecom/wecom-http.gateway';
import { WecomTokenService } from 'src/modules/wecom/wecom-token.service';

const authGuard: CanActivate = {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{ user?: unknown }>();
    request.user = {
      userId: 'tester',
      corpId: 'ww-test',
      name: '娴嬭瘯鐢ㄦ埛',
      avatar: null,
      departments: ['General Office'],
      position: null,
      roles: ['all_authenticated'],
      isAdmin: false,
    };
    return true;
  },
};

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: async () => {
        await bootstrapPgTestDatabase();
        return buildPgTypeOrmOptions();
      },
    }),
    FilesModule,
    EnterpriseProfileModule,
    EnterprisePolicyModule,
  ],
})
class TestFilesModule {}

describe('FilesController integration', () => {
  let app: INestApplication;

  interface PresignResponseBody {
    data: {
      ossKey: string;
      mimeType: string;
    };
  }

  interface FileResponseBody {
    data: {
      ossKey: string;
      mimeType: string;
      downloadUrl: string;
    };
  }

  const ossServiceMock = {
    createUploadSignature: jest.fn(),
    createDownloadSignature: jest.fn(),
    uploadBuffer: jest.fn(),
    deleteObject: jest.fn(),
  };

  const wecomTokenServiceMock = {
    getAccessToken: jest.fn(),
  };

  const wecomHttpGatewayMock = {
    getMedia: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [TestFilesModule],
    })
      .overrideProvider(REDIS_CLIENT)
      .useValue({
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn(),
      })
      .overrideGuard(JwtAuthGuard)
      .useValue(authGuard)
      .overrideProvider(OssService)
      .useValue(ossServiceMock)
      .overrideProvider(WecomTokenService)
      .useValue(wecomTokenServiceMock)
      .overrideProvider(WecomHttpGateway)
      .useValue(wecomHttpGatewayMock)
      .compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    await shutdownPgTestDatabase();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    ossServiceMock.createUploadSignature.mockReturnValue({
      uploadUrl: 'https://oss.example.com/upload',
      expiresAt: '2026-03-01T01:00:00.000Z',
      headers: {
        'Content-Type': 'application/pdf',
        'x-oss-meta-original-name': '璇佷功.pdf',
      },
    });
    ossServiceMock.createDownloadSignature.mockReturnValue({
      downloadUrl: 'https://oss.example.com/download',
      expiresAt: '2026-03-01T01:15:00.000Z',
    });
    wecomTokenServiceMock.getAccessToken.mockResolvedValue('access-token');
    wecomHttpGatewayMock.getMedia.mockResolvedValue({
      buffer: Buffer.from('jpeg'),
      contentType: 'image/jpeg',
    });
  });

  it('completes presign -> callback flow', async () => {
    const presign = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .post('/api/v1/files/presign')
      .set('Authorization', 'Bearer token')
      .send({
        fileName: '璇佷功.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024,
        category: 'certificates',
      });
    const presignBody = presign.body as PresignResponseBody;

    expect(presign.status).toBe(201);
    expect(presignBody.data.ossKey).toMatch(/^certificates\//);

    const callback = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .post('/api/v1/files/callback')
      .set('Authorization', 'Bearer token')
      .send({
        ossKey: presignBody.data.ossKey,
        fileName: '璇佷功.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024,
        category: 'certificates',
      });
    const callbackBody = callback.body as FileResponseBody;

    expect(callback.status).toBe(201);
    expect(callbackBody.data.downloadUrl).toBe(
      'https://oss.example.com/download',
    );
  });

  it('rejects oversize files', async () => {
    const response = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .post('/api/v1/files/presign')
      .set('Authorization', 'Bearer token')
      .send({
        fileName: '鍒跺害.pdf',
        mimeType: 'application/pdf',
        fileSize: 60 * 1024 * 1024,
        category: 'enterprise-policies',
      });

    expect(response.status).toBe(400);
  });

  it('presigns procurement and workbench attachment categories', async () => {
    const procurement = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .post('/api/v1/files/presign')
      .set('Authorization', 'Bearer token')
      .send({
        fileName: 'receipt.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024,
        category: 'procurement-attachments',
      });

    const workbench = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .post('/api/v1/files/presign')
      .set('Authorization', 'Bearer token')
      .send({
        fileName: 'meeting.docx',
        mimeType:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        fileSize: 1024,
        category: 'workbench-attachments',
      });

    expect(procurement.status).toBe(201);
    expect((procurement.body as PresignResponseBody).data.ossKey).toMatch(
      /^procurement\/attachments\//,
    );
    expect(workbench.status).toBe(201);
    expect((workbench.body as PresignResponseBody).data.ossKey).toMatch(
      /^workbench\/attachments\//,
    );
  });

  it('returns upload limits before selection and normalizes an empty mime type', async () => {
    const policy = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .get('/api/v1/files/policies/procurement-attachments')
      .set('Authorization', 'Bearer token');

    expect(policy.status).toBe(200);
    expect(
      (policy.body as { data: { extensions: string[]; maxSize: number } }).data,
    ).toEqual(
      expect.objectContaining({
        extensions: expect.arrayContaining([
          'txt',
          'csv',
          'heic',
          'zip',
          'rar',
          'wps',
          'et',
          'dps',
        ]),
        maxSize: 20 * 1024 * 1024,
      }),
    );

    const presign = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .post('/api/v1/files/presign')
      .set('Authorization', 'Bearer token')
      .send({
        fileName: '说明.txt',
        mimeType: '',
        fileSize: 1024,
        category: 'procurement-attachments',
      });

    expect(presign.status).toBe(201);
    expect((presign.body as PresignResponseBody).data.mimeType).toBe(
      'text/plain',
    );
  });

  it('returns download url for saved file', async () => {
    const callback = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .post('/api/v1/files/callback')
      .set('Authorization', 'Bearer token')
      .send({
        ossKey: 'certificates/2026/03/file-1.pdf',
        fileName: '璇佷功.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024,
        category: 'certificates',
      });
    const callbackBody = callback.body as FileResponseBody;

    const response = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .get(
        `/api/v1/files/${encodeURIComponent(callbackBody.data.ossKey)}/download-url`,
      )
      .set('Authorization', 'Bearer token');
    const responseBody = response.body as FileResponseBody;

    expect(response.status).toBe(200);
    expect(responseBody.data.downloadUrl).toBe(
      'https://oss.example.com/download',
    );
  });

  it('returns 404 for unknown oss key', async () => {
    const response = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .get(
        `/api/v1/files/${encodeURIComponent('certificates/2026/03/missing.pdf')}/download-url`,
      )
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(404);
  });

  it('uploads image via wecom media relay', async () => {
    const response = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .post('/api/v1/files/from-wecom')
      .set('Authorization', 'Bearer token')
      .send({
        mediaId: 'media-1',
        category: 'inspection-photos',
      });
    const responseBody = response.body as FileResponseBody;

    expect(response.status).toBe(201);
    expect(ossServiceMock.uploadBuffer).toHaveBeenCalled();
    expect(responseBody.data.mimeType).toBe('image/jpeg');
  });

  async function createRecycleFile() {
    const ds = app.get(DataSource);
    return ds.getRepository(FileEntity).save({
      ossKey: `certificates/test-${randomUUID()}.pdf`, fileName: 'recycle.pdf',
      mimeType: 'application/pdf', fileSize: 10, category: 'certificates', uploadedBy: 'tester',
    });
  }

  it('retains files for 24 hours and retries failed OSS cleanup from the durable queue', async () => {
    const ds = app.get(DataSource);
    const repo = ds.getRepository(FileEntity);
    const file = await createRecycleFile();
    await request(app.getHttpServer() as Parameters<typeof request>[0]).delete(`/api/v1/files/${file.id}`).expect(204);
    const service = app.get(FilesService);
    await service.cleanupOrphanedFiles();
    expect(ossServiceMock.deleteObject).not.toHaveBeenCalledWith(file.ossKey);
    await repo.update(file.id, { orphanedAt: new Date(Date.now() - 25 * 3600_000) });
    ossServiceMock.deleteObject.mockRejectedValueOnce(new Error('storage unavailable'));
    await service.cleanupOrphanedFiles();
    expect(await repo.findOneBy({ id: file.id })).toBeNull();
    expect(await ds.getRepository(FileRecycleJobEntity).findOneBy({ fileId: file.id })).toEqual(expect.objectContaining({ attempts: 1 }));
    await expect(ds.query(`INSERT INTO evidence_audits (object_type, object_id, file_id, action, operator_user_id)
      VALUES ('test', $1, $2, 'retain', 'tester')`, [randomUUID(), file.id])).rejects.toThrow();
    await service.cleanupOrphanedFiles();
    expect(await repo.findOneBy({ id: file.id })).toBeNull();
    expect((await ds.getRepository(FileRecycleJobEntity).findOneByOrFail({ fileId: file.id })).completedAt).toBeInstanceOf(Date);
    await expect(repo.save({ ...file, id: randomUUID() })).rejects.toThrow('permanent recycling');
    expect(ossServiceMock.deleteObject).toHaveBeenCalledWith(file.ossKey);
  });

  it('rejects an old callback waiting for a recycling transaction to commit', async () => {
    const ds = app.get(DataSource);
    const file = await createRecycleFile();
    const recycler = ds.createQueryRunner();
    const callback = ds.createQueryRunner();
    await recycler.connect();
    await callback.connect();
    await recycler.startTransaction();
    try {
      await recycler.manager.insert(FileRecycleJobEntity, { fileId: file.id, ossKey: file.ossKey });
      await recycler.manager.delete(FileEntity, file.id);
      const [connection] = await callback.query('SELECT pg_backend_pid() AS pid') as Array<{ pid: number }>;
      const pid = connection?.pid;
      if (!pid) throw new Error('callback connection did not expose a backend pid');
      const registration = callback.manager.insert(FileEntity, { ...file, id: randomUUID() })
        .then(() => 'registered', (error: Error) => error.message);
      const deadline = Date.now() + 3000;
      let blocked = false;
      while (Date.now() < deadline) {
        const [activity] = await ds.query('SELECT wait_event_type FROM pg_stat_activity WHERE pid = $1', [pid]);
        if (activity?.wait_event_type === 'Lock') { blocked = true; break; }
        await new Promise<void>((resolve) => setImmediate(resolve));
      }
      await recycler.commitTransaction();
      expect(blocked).toBe(true);
      expect(await registration).toContain('permanent recycling');
      expect(await ds.getRepository(FileEntity).countBy({ ossKey: file.ossKey })).toBe(0);
    } finally {
      if (recycler.isTransactionActive) await recycler.rollbackTransaction();
      await recycler.release();
      await callback.release();
    }
  });

  it('protects shared and audit references, including rebinding during retention', async () => {
    const ds = app.get(DataSource);
    const repo = ds.getRepository(FileEntity);
    const file = await createRecycleFile();
    await request(app.getHttpServer() as Parameters<typeof request>[0]).delete(`/api/v1/files/${file.id}`).expect(204);
    await ds.query(`INSERT INTO evidence_audits (object_type, object_id, file_id, action, operator_user_id)
      VALUES ('test', $1, $2, 'retain', 'tester')`, [randomUUID(), file.id]);
    await request(app.getHttpServer() as Parameters<typeof request>[0]).delete(`/api/v1/files/${file.id}`).expect(400);
    await repo.update(file.id, { orphanedAt: new Date(Date.now() - 25 * 3600_000) });
    await app.get(FilesService).cleanupOrphanedFiles();
    expect((await repo.findOneByOrFail({ id: file.id })).orphanedAt).toBeNull();
    expect(ossServiceMock.deleteObject).not.toHaveBeenCalledWith(file.ossKey);
  });

  it('does not let a full failed batch starve an untouched recycle job', async () => {
    const ds = app.get(DataSource);
    const jobs = ds.getRepository(FileRecycleJobEntity);
    await jobs.insert(Array.from({ length: 200 }, () => ({
      fileId: randomUUID(), ossKey: `test/failed-${randomUUID()}`, attempts: 1,
      createdAt: new Date(Date.now() - 3600_000),
    })));
    const fileId = randomUUID();
    await jobs.insert({ fileId, ossKey: `test/untouched-${fileId}` });
    await app.get(FilesService).cleanupOrphanedFiles();
    expect((await jobs.findOneByOrFail({ fileId })).completedAt).toBeInstanceOf(Date);
  });

  it('does not permit a reference to be inserted after physical cleanup has begun', async () => {
    const ds = app.get(DataSource);
    const file = await createRecycleFile();
    await ds.getRepository(FileEntity).update(file.id, { orphanedAt: new Date(Date.now() - 25 * 3600_000) });
    let release!: () => void;
    let notifyStarted!: () => void;
    const started = new Promise<void>((resolve) => { notifyStarted = resolve; });
    ossServiceMock.deleteObject.mockImplementationOnce(async () => {
      notifyStarted();
      await new Promise<void>((resolve) => { release = resolve; });
    });
    const cleaning = app.get(FilesService).cleanupOrphanedFiles();
    await started;
    const binding = ds.query(`INSERT INTO evidence_audits (object_type, object_id, file_id, action, operator_user_id)
      VALUES ('test', $1, $2, 'retain', 'tester')`, [randomUUID(), file.id]).then(() => 'inserted', () => 'rejected');
    release();
    await cleaning;
    expect(await binding).toBe('rejected');
  });

  it('lets an authorized department manager unlink another uploader file while preserving shared references', async () => {
    const ds = app.get(DataSource);
    await ds.getRepository(WecomUserEntity).save({ userId: 'dept-manager', corpId: 'test-corp', name: 'Manager', departmentCodes: ['finance_dept'] });
    const user = { userId: 'dept-manager', roles: ['finance'] } as unknown as CurrentUser;
    const file = await createRecycleFile();
    const profiles = app.get(EnterpriseProfileService);
    const policies = app.get(EnterprisePolicyService);
    const profile = await profiles.create({ title: 'File retention profile', category: 'license', fileIds: [file.id] }, user);
    const policy = await policies.create({ title: 'File retention policy', policyCode: randomUUID(), version: 'v1', fileIds: [file.id] }, user);
    await profiles.unbindFile(profile.id, file.id, user);
    expect((await profiles.getById(profile.id, user)).files).toHaveLength(0);
    expect((await ds.getRepository(FileEntity).findOneByOrFail({ id: file.id })).orphanedAt).toBeNull();
    await policies.unbindFile(policy.id, file.id, user);
    const retained = await ds.getRepository(FileEntity).findOneByOrFail({ id: file.id });
    expect(retained.orphanedAt).toBeInstanceOf(Date);
    const audits = await ds.query('SELECT file_id, metadata FROM evidence_audits WHERE object_id IN ($1, $2)', [profile.id, policy.id]);
    expect(audits).toHaveLength(2);
    expect(audits.every((audit: { file_id: string | null; metadata: { fileId: string } }) => audit.file_id === null && audit.metadata.fileId === file.id)).toBe(true);
    await ds.getRepository(FileEntity).update(file.id, { orphanedAt: new Date(Date.now() - 25 * 3600_000) });
    await app.get(FilesService).cleanupOrphanedFiles();
    expect(await ds.getRepository(FileEntity).findOneBy({ id: file.id })).toBeNull();
  });

  it.each(['profile', 'policy'])('replaces and removes %s attachments transactionally', async (kind) => {
    const ds = app.get(DataSource);
    const user = { userId: 'admin', roles: ['system_admin'] } as unknown as CurrentUser;
    const first = await createRecycleFile();
    const second = await createRecycleFile();
    const service = kind === 'profile' ? app.get(EnterpriseProfileService) : app.get(EnterprisePolicyService);
    const record = await service.create({ title: 'Attachment replacement', category: 'license', policyCode: randomUUID(), version: 'v1', fileIds: [first.id] }, user);
    await service.update(record.id, { fileIds: [second.id] }, user);
    expect((await service.getById(record.id, user)).files.map((file) => file.id)).toEqual([second.id]);
    expect((await ds.getRepository(FileEntity).findOneByOrFail({ id: first.id })).orphanedAt).toBeInstanceOf(Date);
    await service.remove(record.id, user);
    expect((await ds.getRepository(FileEntity).findOneByOrFail({ id: second.id })).orphanedAt).toBeInstanceOf(Date);
    await expect(service.bindFiles(record.id, { fileIds: [first.id] }, user)).rejects.toThrow('record not found');
    if (kind === 'profile') expect(await ds.getRepository(EnterpriseProfileFileEntity).countBy({ enterpriseProfileId: record.id })).toBe(0);
  });

  it('allows simultaneous cross-record attachment swaps', async () => {
    const user = { userId: 'admin', roles: ['system_admin'] } as unknown as CurrentUser;
    const first = await createRecycleFile();
    const second = await createRecycleFile();
    const profiles = app.get(EnterpriseProfileService);
    const policies = app.get(EnterprisePolicyService);
    const profile = await profiles.create({ title: 'Swap profile', category: 'license', fileIds: [first.id] }, user);
    const policy = await policies.create({ title: 'Swap policy', policyCode: randomUUID(), version: 'v1', fileIds: [second.id] }, user);
    const [updatedProfile, updatedPolicy] = await Promise.all([
      profiles.update(profile.id, { fileIds: [second.id] }, user),
      policies.update(policy.id, { fileIds: [first.id] }, user),
    ]);
    expect(updatedProfile.files.map((file) => file.id)).toEqual([second.id]);
    expect(updatedPolicy.files.map((file) => file.id)).toEqual([first.id]);
  });
});
