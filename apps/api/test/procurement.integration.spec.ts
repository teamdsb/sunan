import type { CanActivate, ExecutionContext, INestApplication } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { configureApp } from 'src/app.bootstrap';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { FileEntity } from 'src/database/entities/file.entity';
import { ProcurementModule } from 'src/modules/procurement/procurement.module';
import { bootstrapPgTestDatabase, buildPgTypeOrmOptions, shutdownPgTestDatabase } from 'test/pg-test-container';

let currentUser = {
  userId: 'applicant-1',
  corpId: 'ww-test',
  name: 'Applicant',
  avatar: null,
  departments: ['业务部'],
  position: '员工',
  roles: ['all_authenticated', 'business'],
  isAdmin: false,
};

const authGuard: CanActivate = {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<{ user?: unknown }>();
    req.user = currentUser;
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
    ProcurementModule,
  ],
})
class TestModule {}

describe('ProcurementController integration', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [TestModule] })
      .overrideGuard(JwtAuthGuard)
      .useValue(authGuard)
      .compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    dataSource = moduleRef.get(DataSource);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    await shutdownPgTestDatabase();
  });

  it('supports draft -> submit -> dept approve -> final approve flow', async () => {
    currentUser = {
      ...currentUser,
      userId: 'creator-general',
      departments: ['总经办'],
      roles: ['all_authenticated', 'general_office'],
    };

    const createResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/v1/procurement/orders')
      .set('Authorization', 'Bearer token')
      .send({
        departmentCode: 'general_office',
        title: '办公设备采购',
        summary: '采购会议平板',
        amount: 12000,
      });

    expect(createResponse.status).toBe(201);
    expect((createResponse.body as { data: { status: string; approvalChannel: string } }).data.status).toBe('draft');
    expect((createResponse.body as { data: { status: string; approvalChannel: string } }).data.approvalChannel).toBe('internal');

    const orderId = (createResponse.body as { data: { id: string } }).data.id;

    const submitResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post(`/api/v1/procurement/orders/${orderId}/submit`)
      .set('Authorization', 'Bearer token');
    expect(submitResponse.status).toBe(201);
    expect((submitResponse.body as { data: { status: string } }).data.status).toBe('submitted');

    const deptApproveResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post(`/api/v1/procurement/orders/${orderId}/approvals/actions`)
      .set('Authorization', 'Bearer token')
      .send({ action: 'approve', comment: '同意', source: 'internal' });
    expect(deptApproveResponse.status).toBe(201);
    expect((deptApproveResponse.body as { data: { status: string } }).data.status).toBe('dept_approved');

    const finalApproveResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post(`/api/v1/procurement/orders/${orderId}/approvals/actions`)
      .set('Authorization', 'Bearer token')
      .send({ action: 'approve', comment: '终审通过', source: 'internal' });
    expect(finalApproveResponse.status).toBe(201);
    expect((finalApproveResponse.body as { data: { status: string } }).data.status).toBe('final_approved');

    const approvalHistoryResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get(`/api/v1/procurement/orders/${orderId}/approvals`)
      .set('Authorization', 'Bearer token');

    expect(approvalHistoryResponse.status).toBe(200);
    expect((approvalHistoryResponse.body as { data: Array<{ approvalLevel: string }> }).data).toEqual([
      expect.objectContaining({ approvalLevel: 'dept' }),
      expect.objectContaining({ approvalLevel: 'final' }),
    ]);
  });

  it('supports return to draft and resubmit flow', async () => {
    currentUser = {
      ...currentUser,
      userId: 'logistics-applicant',
      departments: ['后勤部'],
      roles: ['all_authenticated', 'logistics'],
    };

    const createResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/v1/procurement/orders')
      .set('Authorization', 'Bearer token')
      .send({
        departmentCode: 'logistics_dept',
        dimensionType: 'logistics_category',
        dimensionKey: 'canteen',
        title: '食堂补货',
        summary: '补充厨房消耗品',
        amount: 3600,
      });

    expect(createResponse.status).toBe(201);
    const orderId = (createResponse.body as { data: { id: string } }).data.id;

    const submitResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post(`/api/v1/procurement/orders/${orderId}/submit`)
      .set('Authorization', 'Bearer token');
    expect(submitResponse.status).toBe(201);

    const returnResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post(`/api/v1/procurement/orders/${orderId}/approvals/actions`)
      .set('Authorization', 'Bearer token')
      .send({ action: 'return', comment: '补充报价单', source: 'internal' });
    expect(returnResponse.status).toBe(201);
    expect((returnResponse.body as { data: { status: string } }).data.status).toBe('draft');

    const submitAgainResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post(`/api/v1/procurement/orders/${orderId}/submit`)
      .set('Authorization', 'Bearer token');
    expect(submitAgainResponse.status).toBe(409);

    const resubmitResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post(`/api/v1/procurement/orders/${orderId}/resubmit`)
      .set('Authorization', 'Bearer token');
    expect(resubmitResponse.status).toBe(201);
    expect((resubmitResponse.body as { data: { status: string } }).data.status).toBe('submitted');
  });

  it('binds attachments in draft and exposes pending approvals', async () => {
    currentUser = {
      ...currentUser,
      userId: 'business-applicant',
      departments: ['业务部'],
      roles: ['all_authenticated', 'business'],
    };

    const createResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/v1/procurement/orders')
      .set('Authorization', 'Bearer token')
      .send({
        departmentCode: 'business_dept',
        title: '客户接待采购',
        summary: '客户接待所需物资',
        amount: 980,
      });

    expect(createResponse.status).toBe(201);
    const orderId = (createResponse.body as { data: { id: string } }).data.id;

    const fileRepository = dataSource.getRepository(FileEntity);
    const file = await fileRepository.save(
      fileRepository.create({
        ossKey: `procurement/${orderId}/receipt.pdf`,
        fileName: 'receipt.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024,
        category: 'procurement_attachment',
        uploadedBy: currentUser.userId,
      }),
    );

    const bindResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post(`/api/v1/procurement/orders/${orderId}/attachments`)
      .set('Authorization', 'Bearer token')
      .send({ fileIds: [file.id] });

    expect(bindResponse.status).toBe(201);
    expect((bindResponse.body as { data: { files: Array<{ id: string }> } }).data.files).toEqual([
      expect.objectContaining({ id: file.id }),
    ]);

    const submitResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post(`/api/v1/procurement/orders/${orderId}/submit`)
      .set('Authorization', 'Bearer token');
    expect(submitResponse.status).toBe(201);

    const pendingResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get('/api/v1/procurement/approvals/pending')
      .set('Authorization', 'Bearer token');

    expect(pendingResponse.status).toBe(200);
    expect((pendingResponse.body as { data: Array<{ entityId: string; approvalLevel: string }> }).data).toEqual(
      expect.arrayContaining([expect.objectContaining({ entityId: orderId, approvalLevel: 'dept' })]),
    );
  });
});
