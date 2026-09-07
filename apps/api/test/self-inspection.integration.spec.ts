import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  Module,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { PDFDocument, PDFName, PDFDict } from 'pdf-lib';
import { configureApp } from 'src/app.bootstrap';
import { CurrentUser } from 'src/common/interfaces/current-user.interface';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { FileEntity } from 'src/database/entities/file.entity';
import { VesselEntity } from 'src/database/entities/vessel.entity';
import { WecomUserEntity } from 'src/database/entities/wecom-user.entity';
import { WorkbenchRecordEntity } from 'src/database/entities/workbench-record.entity';
import { WorkbenchRecordActionLogEntity } from 'src/database/entities/workbench-record-action-log.entity';
import { WorkbenchRecordStepEntity } from 'src/database/entities/workbench-record-step.entity';
import { WorkbenchRecordAttachmentEntity } from 'src/database/entities/workbench-record-attachment.entity';
import { WorkbenchPrintSnapshotEntity } from 'src/database/entities/workbench-print-snapshot.entity';
import { WorkbenchModule } from 'src/modules/workbench/workbench.module';
import { OssService } from 'src/modules/files/oss.service';
import {
  bootstrapPgTestDatabase,
  buildPgTypeOrmOptions,
  shutdownPgTestDatabase,
} from 'test/pg-test-container';

const user = (id: string, roles: string[]): CurrentUser => ({
  userId: id,
  corpId: 'self-inspection-test',
  name: id,
  roles: ['all_authenticated', ...roles],
  avatar: null,
  departments: [],
  position: null,
  isAdmin: roles.includes('system_admin'),
});
let currentUser = user('issuer', ['shipping']);
const guard: CanActivate = {
  canActivate(context: ExecutionContext) {
    context.switchToHttp().getRequest<{ user: CurrentUser }>().user =
      currentUser;
    return true;
  },
};
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXs8AAAAASUVORK5CYII=',
  'base64',
);
const oss = {
  readBuffer: jest.fn().mockResolvedValue(png),
  uploadBuffer: jest.fn().mockResolvedValue(undefined),
  createDownloadSignature: jest.fn().mockResolvedValue({
    downloadUrl: 'https://test.invalid/inspection.pdf',
    expiresAt: '2026-12-01T00:00:00Z',
  }),
};
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: async () => {
        await bootstrapPgTestDatabase();
        return buildPgTypeOrmOptions();
      },
    }),
    WorkbenchModule,
  ],
})
class TestModule {}

describe('船舶自查完整闭环', () => {
  let app: INestApplication;
  let source: DataSource;
  let vesselId: string;
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [TestModule] })
      .overrideGuard(JwtAuthGuard)
      .useValue(guard)
      .overrideProvider(OssService)
      .useValue(oss)
      .compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    source = moduleRef.get(DataSource);
    vesselId = (
      await source.getRepository(VesselEntity).save({
        code: 'SELF-TEST',
        name: '自查测试船',
        category: 'main_vessel',
        status: 'active',
      })
    ).id;
    for (const [id, departmentId] of [
      ['issuer', 6],
      ['executor', 8],
      ['reviewer', 6],
      ['outsider', 8],
    ] as const) {
      await source.getRepository(WecomUserEntity).save({
        userId: id,
        corpId: 'self-inspection-test',
        name: {
          issuer: '下发人员',
          executor: '执行船员',
          reviewer: '独立审核人',
          outsider: '其他船员',
        }[id],
        departmentIds: [departmentId],
        departmentNames: [],
        departmentCodes: [],
        rawProfile: {},
        isSystemAdmin: false,
      });
    }
  });
  afterAll(async () => {
    await app?.close();
    await shutdownPgTestDatabase();
  });
  beforeEach(() => {
    currentUser = user('issuer', ['shipping']);
    oss.readBuffer.mockResolvedValue(png);
  });
  const api = () =>
    request(app.getHttpServer() as Parameters<typeof request>[0]);
  const input = () => ({
    moduleCode: 'shipping_self_inspection',
    title: '甲板月度自查',
    summary: '检查护栏和防护设施',
    vesselId,
    assigneeUserId: 'executor',
    reviewerUserId: 'reviewer',
    payload: { inspectionScope: '甲板', deadline: '2026-10-01T09:00:00+08:00' },
  });
  async function create() {
    const result = await api()
      .post('/api/v1/workbench/records')
      .send(input())
      .expect(201);
    return result.body.data.id as string;
  }
  const action = (
    id: string,
    actionType: string,
    payload?: Record<string, unknown>,
    comment = '检查整改意见',
  ) =>
    api()
      .post(`/api/v1/workbench/records/${id}/actions`)
      .send({ actionType, payload, comment });
  async function photo(
    id: string,
    category: 'before_rectification' | 'after_rectification',
    uploadedBy = currentUser.userId,
  ) {
    const file = await source.getRepository(FileEntity).save({
      ossKey: `test/${crypto.randomUUID()}.png`,
      fileName: `${category}.png`,
      mimeType: 'image/png',
      fileSize: png.length,
      uploadedBy,
      category: 'workbench_attachment',
    });
    return {
      fileId: file.id,
      response: await api()
        .post(`/api/v1/workbench/records/${id}/attachments`)
        .send({ fileId: file.id, category }),
    };
  }
  async function submitForReview(id: string) {
    currentUser = user('executor', ['crew']);
    await action(id, 'start').expect(201);
    expect((await photo(id, 'before_rectification')).response.status).toBe(201);
    await action(
      id,
      'complete_step',
      { stepCode: 'on_site_inspection', checkResult: 'nonconforming' },
      '护栏破损',
    ).expect(201);
    expect((await photo(id, 'after_rectification')).response.status).toBe(201);
    await action(
      id,
      'complete_step',
      { stepCode: 'rectification' },
      '已修复护栏',
    ).expect(201);
  }

  it('下发必须有真实船舶、可用人员和独立审核人，名单仅管理人员可见', async () => {
    await api()
      .post('/api/v1/workbench/records')
      .send({ ...input(), reviewerUserId: 'executor' })
      .expect(400);
    await api()
      .post('/api/v1/workbench/records')
      .send({ ...input(), assigneeUserId: 'missing' })
      .expect(400);
    await api()
      .post('/api/v1/workbench/records')
      .send({ ...input(), vesselId: crypto.randomUUID() })
      .expect(400);
    const people = await api()
      .get('/api/v1/workbench/inspection-people')
      .expect(200);
    expect(people.body.data).toContainEqual(
      expect.objectContaining({
        userId: 'executor',
        canExecute: true,
        canReview: false,
      }),
    );
    currentUser = user('executor', ['crew']);
    await api().get('/api/v1/workbench/inspection-people').expect(403);
    await api().post('/api/v1/workbench/records').send(input()).expect(403);
  });

  it('阻止跳步骤、无证据关闭、执行人自审及通用动作绕过', async () => {
    const id = await create();
    currentUser = user('executor', ['crew']);
    await action(id, 'submit_review').expect(403);
    await action(id, 'close_record').expect(403);
    await action(id, 'complete_step', { stepCode: 'review_close' }).expect(409);
    await action(id, 'start').expect(201);
    await action(id, 'complete_step', { stepCode: 'review_close' }).expect(409);
    await action(id, 'complete_step', {
      stepCode: 'on_site_inspection',
      checkResult: 'nonconforming',
    }).expect(409);
    await action(id, 'update_payload', { status: 'closed' }).expect(403);
    currentUser = user('reviewer', ['shipping']);
    await action(id, 'close_record').expect(409);
    await api()
      .post(`/api/v1/workbench/records/${id}/participants`)
      .send({ userId: 'executor', role: 'reviewer' })
      .expect(400);
  });

  it('执行人可找到任务，其他船员不能读取、上传或打印', async () => {
    const id = await create();
    currentUser = user('executor', ['crew']);
    expect(
      (
        await api()
          .get('/api/v1/workbench/records')
          .query({ moduleCode: 'shipping_self_inspection' })
          .expect(200)
      ).body.data,
    ).toContainEqual(expect.objectContaining({ id }));
    currentUser = user('outsider', ['crew']);
    await api().get(`/api/v1/workbench/records/${id}`).expect(403);
    await api().get(`/api/v1/workbench/records/${id}/print`).expect(403);
    expect((await photo(id, 'before_rectification')).response.status).toBe(403);
  });

  it('退回后必须重新整改并上传新证据，重复审核只提交一次', async () => {
    const id = await create();
    await submitForReview(id);
    currentUser = user('reviewer', ['shipping']);
    await action(id, 'request_rework', undefined, '请补充护栏底座固定').expect(
      201,
    );
    currentUser = user('executor', ['crew']);
    await action(id, 'complete_step', { stepCode: 'rectification' }).expect(
      409,
    );
    expect((await photo(id, 'after_rectification')).response.status).toBe(201);
    await action(
      id,
      'complete_step',
      { stepCode: 'rectification' },
      '底座固定完成',
    ).expect(201);
    currentUser = user('reviewer', ['shipping']);
    const results = await Promise.all([
      action(id, 'close_record'),
      action(id, 'close_record'),
    ]);
    expect(results.map((result) => result.status).sort()).toEqual([201, 409]);
    expect(
      await source
        .getRepository(WorkbenchRecordActionLogEntity)
        .countBy({ businessRecordId: id, actionType: 'close_record' }),
    ).toBe(1);
    const detail = (
      await api().get(`/api/v1/workbench/records/${id}`).expect(200)
    ).body.data;
    expect(detail.status).toBe('closed');
    expect(detail.availableActions).toEqual([]);
    expect(
      detail.steps.every(
        (step: { status: string }) => step.status === 'completed',
      ),
    ).toBe(true);
    expect(detail.steps[2].completedBy).toBe('reviewer');
    currentUser = user('executor', ['crew']);
    expect((await photo(id, 'after_rectification')).response.status).toBe(409);
    await api()
      .post(`/api/v1/workbench/records/${id}/location-evidence`)
      .send({ captureStatus: 'manual' })
      .expect(409);
  });

  it('拒绝盗用照片、无效图片、重复引用和错误分类，事务失败不留下完成状态', async () => {
    const id = await create();
    currentUser = user('executor', ['crew']);
    await action(id, 'start').expect(201);
    expect(
      (await photo(id, 'before_rectification', 'outsider')).response.status,
    ).toBe(403);
    expect((await photo(id, 'after_rectification')).response.status).toBe(409);
    oss.readBuffer.mockResolvedValueOnce(Buffer.from('not an image'));
    expect((await photo(id, 'before_rectification')).response.status).toBe(400);
    const before = await photo(id, 'before_rectification');
    expect(before.response.status).toBe(201);
    await api()
      .post(`/api/v1/workbench/records/${id}/attachments`)
      .send({ fileId: before.fileId, category: 'before_rectification' })
      .expect(409);
    await action(id, 'complete_step', {
      stepCode: 'on_site_inspection',
      checkResult: 'nonconforming',
    }).expect(201);
    await action(id, 'complete_step', { stepCode: 'rectification' }).expect(
      409,
    );
    expect(
      (
        await source
          .getRepository(WorkbenchRecordEntity)
          .findOneByOrFail({ id })
      ).status,
    ).toBe('in_progress');
    expect(
      await source
        .getRepository(WorkbenchRecordActionLogEntity)
        .countBy({ businessRecordId: id, actionType: 'complete_step' }),
    ).toBe(1);
  });

  it('检查合格无需虚构整改照片，仍需独立审核后才能打印', async () => {
    const id = await create();
    currentUser = user('executor', ['crew']);
    await action(id, 'start').expect(201);
    await action(
      id,
      'complete_step',
      { stepCode: 'on_site_inspection', checkResult: 'conforming' },
      '检查项目均合格',
    ).expect(201);
    await api().get(`/api/v1/workbench/records/${id}/print`).expect(409);
    currentUser = user('reviewer', ['shipping']);
    await action(id, 'close_record', undefined, '复核合格').expect(201);
    await api().get(`/api/v1/workbench/records/${id}/print`).expect(200);
  });

  it('打印包含中文业务数据、操作人、审核意见和真实嵌入照片，读取失败不会生成假成功', async () => {
    const id = await create();
    await submitForReview(id);
    currentUser = user('reviewer', ['shipping']);
    await action(id, 'close_record', undefined, '现场复核通过').expect(201);
    oss.readBuffer.mockClear();
    const response = await api()
      .get(`/api/v1/workbench/records/${id}/print`)
      .expect(200);
    expect(
      oss.readBuffer.mock.calls.every(([key]: [string]) =>
        key.startsWith(`workbench/self-inspections/${id}/`),
      ),
    ).toBe(true);
    const attachment = await source
      .getRepository(WorkbenchRecordAttachmentEntity)
      .findOneByOrFail({ businessRecordId: id });
    await api()
      .get(
        `/api/v1/workbench/records/${id}/attachments/${attachment.fileId}/download-url`,
      )
      .expect(200);
    expect(oss.createDownloadSignature).toHaveBeenLastCalledWith(
      attachment.storagePath,
    );
    expect(response.body.data.snapshotData).toEqual(
      expect.objectContaining({
        vesselName: '自查测试船',
        reviewer: '独立审核人',
        steps: expect.arrayContaining([
          expect.objectContaining({ comment: '现场复核通过' }),
        ]),
        photos: expect.arrayContaining([
          expect.objectContaining({ category: 'before_rectification' }),
          expect.objectContaining({ category: 'after_rectification' }),
        ]),
      }),
    );
    const calls = oss.uploadBuffer.mock.calls as unknown as Array<
      [string, Buffer]
    >;
    const pdf = await PDFDocument.load(calls[calls.length - 1]![1]);
    expect(pdf.getPages()[0]!.getSize()).toEqual({ width: 595, height: 842 });
    expect(
      pdf
        .getPages()
        .some(
          (page) =>
            (page.node
              .Resources()
              ?.lookup(PDFName.of('XObject'), PDFDict)
              ?.keys().length ?? 0) > 0,
        ),
    ).toBe(true);
    const count = oss.uploadBuffer.mock.calls.length;
    oss.readBuffer.mockRejectedValueOnce(new Error('storage unavailable'));
    await api().get(`/api/v1/workbench/records/${id}/print`).expect(500);
    expect(oss.uploadBuffer.mock.calls.length).toBe(count);
    const snapshots = source.getRepository(WorkbenchPrintSnapshotEntity);
    const beforeFailure = await snapshots.countBy({ businessRecordId: id });
    oss.uploadBuffer.mockRejectedValueOnce(new Error('upload unavailable'));
    await api().get(`/api/v1/workbench/records/${id}/print`).expect(502);
    expect(await snapshots.countBy({ businessRecordId: id })).toBe(
      beforeFailure,
    );
  });
  it('合格检查被退回后重新检查；结构不完整的历史记录仍可明确作废', async () => {
    const id = await create();
    currentUser = user('executor', ['crew']);
    await action(id, 'start').expect(201);
    await action(id, 'complete_step', {
      stepCode: 'on_site_inspection',
      checkResult: 'conforming',
    }).expect(201);
    currentUser = user('reviewer', ['shipping']);
    await action(
      id,
      'request_rework',
      undefined,
      '遗漏护栏检查，请复查',
    ).expect(201);
    currentUser = user('executor', ['crew']);
    await action(id, 'complete_step', { stepCode: 'rectification' }).expect(
      409,
    );
    await action(id, 'complete_step', {
      stepCode: 'on_site_inspection',
      checkResult: 'nonconforming',
    }).expect(409);
    expect((await photo(id, 'before_rectification')).response.status).toBe(201);
    await action(id, 'complete_step', {
      stepCode: 'on_site_inspection',
      checkResult: 'nonconforming',
    }).expect(201);
    currentUser = user('issuer', ['shipping']);
    const malformed = await create();
    await source
      .getRepository(WorkbenchRecordStepEntity)
      .delete({ businessRecordId: malformed });
    await action(
      malformed,
      'void',
      undefined,
      '历史步骤不完整，重新建单',
    ).expect(201);
    expect(
      (
        await source
          .getRepository(WorkbenchRecordEntity)
          .findOneByOrFail({ id: malformed })
      ).status,
    ).toBe('voided');
  });
});
