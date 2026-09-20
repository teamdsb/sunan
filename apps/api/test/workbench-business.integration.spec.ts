import { Module, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import request from 'supertest';
import * as XLSX from 'xlsx';
import { configureApp } from 'src/app.bootstrap';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/interfaces/current-user.interface';
import { WorkbenchModule } from 'src/modules/workbench/workbench.module';
import { WorkbenchService } from 'src/modules/workbench/workbench.service';
import { WorkbenchRecordEntity } from 'src/database/entities/workbench-record.entity';
import { WecomUserEntity } from 'src/database/entities/wecom-user.entity';
import { VesselEntity } from 'src/database/entities/vessel.entity';
import { FileEntity } from 'src/database/entities/file.entity';
import { ExportJobEntity } from 'src/database/entities/export-job.entity';
import { OssService } from 'src/modules/files/oss.service';
import {
  bootstrapPgTestDatabase,
  buildPgTypeOrmOptions,
  shutdownPgTestDatabase,
} from './pg-test-container';
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
const admin: CurrentUser = {
  userId: 'admin-business',
  corpId: 'test-corp',
  name: '管理员',
  avatar: null,
  position: null,
  departments: [],
  roles: ['system_admin'],
  isAdmin: true,
};
let currentUser = { ...admin };
describe('workbench business completion', () => {
  let app: INestApplication,
    db: DataSource,
    service: WorkbenchService,
    vesselId: string;
  const upload = jest.fn().mockResolvedValue(undefined);
  const api = () =>
    request(app.getHttpServer() as Parameters<typeof request>[0]);
  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [TestModule] })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(context: {
          switchToHttp(): { getRequest(): { user: CurrentUser } };
        }) {
          context.switchToHttp().getRequest().user = currentUser;
          return true;
        },
      })
      .overrideProvider(OssService)
      .useValue({
        uploadBuffer: upload,
        createDownloadSignature: async () => ({
          downloadUrl: 'https://files.test/report',
          expiresAt: new Date().toISOString(),
        }),
      })
      .compile();
    app = mod.createNestApplication();
    configureApp(app);
    await app.init();
    db = mod.get(DataSource);
    service = mod.get(WorkbenchService);
    await db.getRepository(WecomUserEntity).save(
      ['learner-a', 'learner-b'].map((userId, index) => ({
        userId,
        corpId: 'test-corp',
        name: `船员${index + 1}`,
        departmentCodes: [],
        departmentNames: [],
        departmentIds: [],
        rawProfile: {},
      })),
    );
    vesselId = (
      await db.getRepository(VesselEntity).save({
        code: 'FUEL-TEST',
        name: '测试船',
        category: 'main_vessel',
        status: 'active',
      })
    ).id;
  });
  afterAll(async () => {
    await app?.close();
    await shutdownPgTestDatabase();
  });
  beforeEach(() => {
    currentUser = { ...admin };
    upload.mockClear();
  });
  it('exports actual scoped attendance details, preserving Shanghai month boundary and missing hours', async () => {
    await api()
      .post('/api/v1/workbench/records')
      .send({
        moduleCode: 'shipping_attendance',
        title: '考勤A',
        summary: '实际记录',
        vesselId,
        occurredAt: '2026-08-31T16:30:00Z',
        payload: {
          crewName: '张三',
          period: 'am',
          locationInRange: 'true',
          dutyType: 'normal',
          workHours: 4,
        },
      })
      .expect(201);
    const stats = await api()
      .get('/api/v1/workbench/statistics/attendance')
      .query({ month: '2026-09', departmentCode: 'shipping' })
      .expect(200);
    expect(stats.body.data.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          personName: '张三',
          workHours: 4,
          date: '2026-09-01',
        }),
      ]),
    );
    const start = await api()
      .get('/api/v1/workbench/statistics/attendance/export')
      .query({
        month: '2026-09',
        departmentCode: 'shipping',
        exportFormat: 'xlsx',
      })
      .expect(202);
    const jobs = db.getRepository(ExportJobEntity);
    let job = await jobs.findOneByOrFail({ id: start.body.data.exportJobId });
    for (
      let i = 0;
      i < 100 && ['queued', 'running'].includes(job.status);
      i++
    ) {
      await new Promise((resolve) => setTimeout(resolve, 20));
      job = await jobs.findOneByOrFail({ id: job.id });
    }
    expect(job.status).toBe('succeeded');
    const buffer = upload.mock.calls[0]?.[1] as Buffer;
    const book = XLSX.read(buffer, { type: 'buffer' });
    expect(XLSX.utils.sheet_to_json(book.Sheets['考勤明细']!, {range:4})).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ 姓名: '张三', 工时: 4 }),
      ]),
    );
    currentUser = {
      ...admin,
      userId: 'another-finance',
      roles: ['finance'],
      isAdmin: false,
    };
    await api()
      .get(`/api/v1/workbench/export-jobs/${job.id}/download-url`)
      .expect(403);
    await api()
      .get('/api/v1/workbench/statistics/attendance')
      .query({ month: '2026-13' })
      .expect(400);
  });
  it('assigns learning to actual members and isolates personal confirmation with idempotent completion', async () => {
    const created = await api()
      .post('/api/v1/workbench/records')
      .send({
        moduleCode: 'goa_training',
        title: '安全学习',
        summary: '阅读安全要求',
        payload: {
          trainingType: '岗前',
          trainer: '讲师',
          hours: 2,
          participants: '实际成员',
        },
      })
      .expect(201);
    const id = created.body.data.id;
    await api()
      .post(`/api/v1/workbench/records/${id}/learning/publish`)
      .send({ userIds: ['learner-a', 'learner-b'], hours: 2 })
      .expect(201);
    await api()
      .post(`/api/v1/workbench/records/${id}/actions`)
      .send({
        actionType: 'update_payload',
        payload: { learningStatus: 'completed' },
      })
      .expect(400);
    currentUser = {
      ...admin,
      userId: 'outsider',
      roles: ['all_authenticated'],
      isAdmin: false,
    };
    await api().get(`/api/v1/workbench/records/${id}`).expect(403);
    await api()
      .post(`/api/v1/workbench/records/${id}/learning/confirm`)
      .send({ materialId: 'content' })
      .expect(403);
    currentUser = { ...currentUser, userId: 'learner-a' };
    const own = await api().get(`/api/v1/workbench/records/${id}`).expect(200);
    expect(own.body.data.learning.learners).toHaveLength(1);
    expect(own.body.data.payload.learning).toBeUndefined();
    await Promise.all([
      api()
        .post(`/api/v1/workbench/records/${id}/learning/confirm`)
        .send({ materialId: 'content' })
        .expect(201),
      api()
        .post(`/api/v1/workbench/records/${id}/learning/confirm`)
        .send({ materialId: 'content' })
        .expect(201),
    ]);
    const personal = await api()
      .get('/api/v1/workbench/statistics/learning')
      .expect(200);
    expect(personal.body.data.people).toEqual([
      expect.objectContaining({
        userId: 'learner-a',
        completed: 1,
        completedHours: 2,
      }),
    ]);
    const printed = await api()
      .get(`/api/v1/workbench/records/${id}/print`)
      .expect(200);
    expect(
      printed.body.data.snapshotData.payload.learning.learners,
    ).toHaveLength(1);
    const personalDashboard = await api()
      .get('/api/v1/workbench/dashboard')
      .expect(200);
    expect(personalDashboard.body.data.pendingTotal).toBe(0);
    currentUser = { ...admin };
    const summary = await api()
      .get(`/api/v1/workbench/records/${id}`)
      .expect(200);
    expect(summary.body.data.payload).toMatchObject({
      hours: 2,
      participants: '船员1、船员2',
    });
    expect(summary.body.data.learning).toMatchObject({
      completionRate: 50,
      completedPeople: 1,
      totalPeople: 2,
    });
    await api()
      .post('/api/v1/wecom/approval/launch')
      .send({
        moduleCode: 'goa_training',
        templateCode: 'goa_training_v2',
        businessRecordId: id,
        title: '学习审批',
        applicantUserId: admin.userId,
      })
      .expect(409);
  });
  it('uploads learning materials under the record lock and freezes them on publication', async () => {
    const created = await api()
      .post('/api/v1/workbench/records')
      .send({
        moduleCode: 'shipping_case_study',
        title: '有附件案例',
        summary: '阅读文档',
        payload: {
          caseTitle: '案例',
          learningAudience: '成员',
          studyType: '文档',
          learningSummary: '待学习',
        },
      })
      .expect(201);
    const id = created.body.data.id;
    const file = await db.getRepository(FileEntity).save({
      ossKey: 'learning/transaction.pdf',
      fileName: '学习材料.pdf',
      mimeType: 'application/pdf',
      fileSize: 100,
      category: 'document',
      uploadedBy: admin.userId,
    });
    await api()
      .post(`/api/v1/workbench/records/${id}/attachments`)
      .send({ category: 'document', fileId: file.id })
      .timeout({ response: 3000, deadline: 4000 })
      .expect(201);
    const published = await api()
      .post(`/api/v1/workbench/records/${id}/learning/publish`)
      .send({ userIds: ['learner-a'], hours: 1 })
      .expect(201);
    expect(published.body.data.materials).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fileId: file.id, title: '学习材料.pdf' }),
      ]),
    );
    await api()
      .post(`/api/v1/workbench/records/${id}/attachments`)
      .send({ category: 'document', fileId: file.id })
      .expect(409);
  });
  it('closes completed non-approval learning and accepts duplicate personal confirmation', async () => {
    const created = await api()
      .post('/api/v1/workbench/records')
      .send({
        moduleCode: 'shipping_case_study',
        title: '案例',
        summary: '学习内容',
        payload: {
          caseTitle: '案例',
          learningAudience: '成员',
          studyType: '文档',
          learningSummary: '待学习',
        },
      })
      .expect(201);
    const id = created.body.data.id;
    await api()
      .post(`/api/v1/workbench/records/${id}/learning/publish`)
      .send({ userIds: ['learner-a'], hours: 1 })
      .expect(201);
    currentUser = {
      ...admin,
      userId: 'learner-a',
      roles: ['all_authenticated'],
      isAdmin: false,
    };
    await api()
      .post(`/api/v1/workbench/records/${id}/learning/confirm`)
      .send({ materialId: 'content' })
      .expect(201);
    await api()
      .post(`/api/v1/workbench/records/${id}/learning/confirm`)
      .send({ materialId: 'content' })
      .expect(201);
    const record = await db
      .getRepository(WorkbenchRecordEntity)
      .findOneByOrFail({ id });
    expect(record.status).toBe('closed');
    expect(record.closedAt).not.toBeNull();
  });

  it('calculates monthly fuel from approved actual receipts and serializes duplicate measurements', async () => {
    const records = db.getRepository(WorkbenchRecordEntity);
    const record = await records.save(
      records.create({
        moduleCode: 'shipping_fuel_bunkering_approval',
        templateCode: 'shipping_fuel_bunkering_approval_v2',
        recordNo: 'FUEL-ACTUAL-TEST',
        title: '加注申请',
        summary: '申请不等于实绩',
        status: 'submitted',
        departmentCode: 'shipping',
        vesselId,
        ownerUserId: admin.userId,
        applicantUserId: admin.userId,
        occurredAt: new Date('2026-09-01T00:00:00Z'),
        payload: { bunkeringAmount: 999 },
        approvalChannel: 'internal',
      }),
    );
    const actual = {
      amount: 50,
      occurredAt: '2026-09-02T00:00:00Z',
      fuelType: '柴油',
      unit: 'L',
    };
    await api()
      .post(`/api/v1/workbench/records/${record.id}/fuel-actual`)
      .send(actual)
      .expect(409);
    record.status = 'approval_passed';
    await records.save(record);
    await api()
      .post(`/api/v1/workbench/records/${record.id}/fuel-actual`)
      .send(actual)
      .expect(201);
    await api()
      .post('/api/v1/workbench/fuel/measurements')
      .send({
        vesselId,
        month: '2026-08',
        fuelType: '柴油',
        unit: 'L',
        openingBalance: 200,
        closingBalance: 100,
      })
      .expect(201);
    const measurement = {
      vesselId,
      month: '2026-09',
      fuelType: '柴油',
      unit: 'L',
      closingBalance: 30,
      lowFuelThreshold: 40,
    };
    await Promise.all([
      api()
        .post('/api/v1/workbench/fuel/measurements')
        .send(measurement)
        .expect(201),
      api()
        .post('/api/v1/workbench/fuel/measurements')
        .send(measurement)
        .expect(201),
    ]);
    const report = await api()
      .get('/api/v1/workbench/statistics/fuel')
      .query({ month: '2026-09' })
      .expect(200);
    expect(report.body.data.rows).toEqual([
      expect.objectContaining({
        openingBalance: 100,
        bunkeredAmount: 50,
        closingBalance: 30,
        consumedAmount: 120,
        lowFuel: true,
      }),
    ]);
    await service.exportBusinessReport('fuel', currentUser, '2026-09');
    const book = XLSX.read(upload.mock.calls[0]?.[1] as Buffer, {
      type: 'buffer',
    });
    expect(XLSX.utils.sheet_to_json(book.Sheets['燃油月报']!, {range:4})).toEqual([
      expect.objectContaining({ 月耗: 120 }),
    ]);
    await api()
      .post('/api/v1/workbench/fuel/measurements')
      .send({
        vesselId,
        month: '2026-09',
        fuelType: '柴油',
        unit: 'L',
        closingBalance: 20,
      })
      .expect(201);
    const corrected = await api()
      .get('/api/v1/workbench/statistics/fuel')
      .query({ month: '2026-09' })
      .expect(200);
    expect(corrected.body.data.rows[0]).toMatchObject({
      openingBalance: 100,
      lowFuelThreshold: 40,
      closingBalance: 20,
      consumedAmount: 130,
    });
    currentUser = {
      ...admin,
      userId: 'wrong-crew',
      roles: ['crew'],
      departments: [],
      isAdmin: false,
    };
    await api()
      .post('/api/v1/workbench/fuel/measurements')
      .send(measurement)
      .expect(403);
    await api()
      .post(`/api/v1/workbench/records/${record.id}/fuel-actual`)
      .send(actual)
      .expect(403);
  });
});
