import type { CanActivate, ExecutionContext, INestApplication } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { configureApp } from 'src/app.bootstrap';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { OssService } from 'src/modules/files/oss.service';
import { FileEntity } from 'src/database/entities/file.entity';
import { ProcurementReportEntity } from 'src/database/entities/procurement-report.entity';
import { WecomUserEntity } from 'src/database/entities/wecom-user.entity';
import { ProcurementModule } from 'src/modules/procurement/procurement.module';
import { WecomMessageService } from 'src/modules/wecom/wecom-message.service';
import { bootstrapPgTestDatabase, buildPgTypeOrmOptions, shutdownPgTestDatabase } from 'test/pg-test-container';

let currentUser = {
  userId: 'shipping-applicant',
  corpId: 'ww-test',
  name: 'Shipping Applicant',
  avatar: null,
  departments: ['船务部'],
  position: '员工',
  roles: ['all_authenticated', 'shipping'],
  isAdmin: false,
};

const authGuard: CanActivate = {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<{ user?: unknown }>();
    req.user = currentUser;
    return true;
  },
};

const wecomMessageMock = {
  sendTextCard: jest.fn(async () => ({ success: true, invalidUser: [] })),
};

const ossMock = {
  uploadBuffer: jest.fn(async () => undefined),
  createDownloadSignature: jest.fn(async (ossKey: string) => ({
    downloadUrl: `https://files.test/${encodeURIComponent(ossKey)}`,
    expiresAt: new Date(Date.now() + 300_000).toISOString(),
  })),
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

describe('Procurement Wave4 integration', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [TestModule] })
      .overrideGuard(JwtAuthGuard)
      .useValue(authGuard)
      .overrideProvider(WecomMessageService)
      .useValue(wecomMessageMock)
      .overrideProvider(OssService)
      .useValue(ossMock)
      .compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    dataSource = moduleRef.get(DataSource);

    const wecomUserRepository = dataSource.getRepository(WecomUserEntity);
    await wecomUserRepository.save(
      wecomUserRepository.create([
        {
          userId: 'shipping-applicant',
          corpId: 'ww-test',
          name: 'Shipping Applicant',
          avatarUrl: null,
          departmentCodes: ['shipping_dept'],
          departmentNames: ['船务部'],
          position: '员工',
          isSystemAdmin: false,
          rawProfile: {},
        },
        {
          userId: 'shipping-manager',
          corpId: 'ww-test',
          name: 'Shipping Manager',
          avatarUrl: null,
          departmentCodes: ['shipping_dept'],
          departmentNames: ['船务部'],
          position: '经理',
          isSystemAdmin: false,
          rawProfile: {},
        },
        {
          userId: 'finance-manager',
          corpId: 'ww-test',
          name: 'Finance Manager',
          avatarUrl: null,
          departmentCodes: ['finance_dept'],
          departmentNames: ['财务部'],
          position: '经理',
          isSystemAdmin: false,
          rawProfile: {},
        },
        {
          userId: 'go-approver',
          corpId: 'ww-test',
          name: 'General Office',
          avatarUrl: null,
          departmentCodes: ['general_office'],
          departmentNames: ['总经办'],
          position: '主任',
          isSystemAdmin: false,
          rawProfile: {},
        },
      ]),
    );
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    await shutdownPgTestDatabase();
  });

  beforeEach(() => {
    wecomMessageMock.sendTextCard.mockClear();
  });

  it('supports dictionary governance with permission control', async () => {
    const deniedCreateResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/v1/procurement/admin/dimensions')
      .set('Authorization', 'Bearer token')
      .send({
        departmentCode: 'shipping_dept',
        dimensionType: 'vessel',
        dimensionKey: 'su-nan-012',
        dimensionName: '苏南012',
      });

    expect(deniedCreateResponse.status).toBe(403);

    currentUser = {
      ...currentUser,
      userId: 'go-approver',
      departments: ['总经办'],
      roles: ['all_authenticated', 'general_office'],
    };

    const createResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/v1/procurement/admin/dimensions')
      .set('Authorization', 'Bearer token')
      .send({
        departmentCode: 'shipping_dept',
        dimensionType: 'vessel',
        dimensionKey: 'su-nan-012',
        dimensionName: '苏南012',
        sortOrder: 10,
      });

    expect(createResponse.status).toBe(201);
    const createdId = (createResponse.body as { data: { id: string } }).data.id;

    const updateResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .patch(`/api/v1/procurement/admin/dimensions/${createdId}`)
      .set('Authorization', 'Bearer token')
      .send({ dimensionName: '苏南012（主船）', sortOrder: 20 });

    expect(updateResponse.status).toBe(200);
    expect((updateResponse.body as { data: { dimensionName: string; sortOrder: number } }).data).toEqual(
      expect.objectContaining({ dimensionName: '苏南012（主船）', sortOrder: 20 }),
    );

    const listResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get('/api/v1/procurement/dimensions')
      .set('Authorization', 'Bearer token')
      .query({ departmentCode: 'shipping_dept' });

    expect(listResponse.status).toBe(200);
    expect((listResponse.body as { data: Array<{ id: string }> }).data).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: createdId })]),
    );

    const disableResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .delete(`/api/v1/procurement/admin/dimensions/${createdId}`)
      .set('Authorization', 'Bearer token');

    expect(disableResponse.status).toBe(204);

    const enabledListResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get('/api/v1/procurement/dimensions')
      .set('Authorization', 'Bearer token')
      .query({ departmentCode: 'shipping_dept', isEnabled: true });

    expect(enabledListResponse.status).toBe(200);
    expect((enabledListResponse.body as { data: Array<{ id: string }> }).data).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: createdId })]),
    );
  });

  it('supports print export and wecom notifications for order/report workflows', async () => {
    currentUser = {
      ...currentUser,
      userId: 'go-approver',
      departments: ['总经办'],
      roles: ['all_authenticated', 'general_office'],
    };

    await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/v1/procurement/admin/dimensions')
      .set('Authorization', 'Bearer token')
      .send({
        departmentCode: 'shipping_dept',
        dimensionType: 'vessel',
        dimensionKey: 'su-nan-099',
        dimensionName: '苏南099',
      });

    currentUser = {
      ...currentUser,
      userId: 'shipping-applicant',
      departments: ['船务部'],
      roles: ['all_authenticated', 'shipping'],
    };

    const createOrderResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/v1/procurement/orders')
      .set('Authorization', 'Bearer token')
      .send({
        departmentCode: 'shipping_dept',
        dimensionType: 'vessel',
        dimensionKey: 'su-nan-099',
        title: '甲板物资采购',
        summary: '采购甲板维护物资',
        amount: 6800,
      });

    expect(createOrderResponse.status).toBe(201);
    const orderId = (createOrderResponse.body as { data: { id: string } }).data.id;

    const submitOrderResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post(`/api/v1/procurement/orders/${orderId}/submit`)
      .set('Authorization', 'Bearer token');

    expect(submitOrderResponse.status).toBe(201);

    currentUser = {
      ...currentUser,
      userId: 'shipping-manager',
      roles: ['all_authenticated', 'shipping'],
      departments: ['船务部'],
    };

    const deptApproveResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post(`/api/v1/procurement/orders/${orderId}/approvals/actions`)
      .set('Authorization', 'Bearer token')
      .send({ action: 'approve', source: 'internal', comment: '同意' });

    expect(deptApproveResponse.status).toBe(201);

    currentUser = {
      ...currentUser,
      userId: 'go-approver',
      roles: ['all_authenticated', 'general_office'],
      departments: ['总经办'],
    };

    const finalApproveResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post(`/api/v1/procurement/orders/${orderId}/approvals/actions`)
      .set('Authorization', 'Bearer token')
      .send({ action: 'approve', source: 'internal', comment: '通过' });

    expect(finalApproveResponse.status).toBe(201);

    currentUser = {
      ...currentUser,
      userId: 'shipping-applicant',
      roles: ['all_authenticated', 'shipping'],
      departments: ['船务部'],
    };

    const printOrderResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post(`/api/v1/procurement/orders/${orderId}/print`)
      .set('Authorization', 'Bearer token');

    expect(printOrderResponse.status).toBe(201);
    const printedOrderFileId = (printOrderResponse.body as { data: { fileId: string } }).data.fileId;

    const fileRepository = dataSource.getRepository(FileEntity);
    const printedOrderFile = await fileRepository.findOneByOrFail({ id: printedOrderFileId });
    expect(printedOrderFile.category).toBe('procurement_exports');
    expect(printedOrderFile.mimeType).toBe('application/pdf');

    const createReportResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/v1/procurement/report-requests')
      .set('Authorization', 'Bearer token')
      .send({
        reportType: 'monthly',
        periodYear: 2026,
        periodMonth: 3,
        departmentCode: 'shipping_dept',
      });

    expect(createReportResponse.status).toBe(201);
    const reportId = (createReportResponse.body as { data: { id: string } }).data.id;

    const submitReportResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post(`/api/v1/procurement/report-requests/${reportId}/submit`)
      .set('Authorization', 'Bearer token');

    expect(submitReportResponse.status).toBe(201);

    currentUser = {
      ...currentUser,
      userId: 'shipping-manager',
      roles: ['all_authenticated', 'shipping'],
      departments: ['船务部'],
    };

    const reportDeptApproveResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post(`/api/v1/procurement/reports/${reportId}/approvals/actions`)
      .set('Authorization', 'Bearer token')
      .send({ action: 'approve', source: 'internal', comment: '部门通过' });

    expect(reportDeptApproveResponse.status).toBe(201);

    currentUser = {
      ...currentUser,
      userId: 'finance-manager',
      roles: ['all_authenticated', 'finance'],
      departments: ['财务部'],
    };

    const reportFinanceApproveResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post(`/api/v1/procurement/reports/${reportId}/approvals/actions`)
      .set('Authorization', 'Bearer token')
      .send({ action: 'approve', source: 'internal', comment: '财务通过' });

    expect(reportFinanceApproveResponse.status).toBe(201);

    currentUser = {
      ...currentUser,
      userId: 'go-approver',
      roles: ['all_authenticated', 'general_office'],
      departments: ['总经办'],
    };

    const reportFinalApproveResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post(`/api/v1/procurement/reports/${reportId}/approvals/actions`)
      .set('Authorization', 'Bearer token')
      .send({ action: 'approve', source: 'internal', comment: '终审通过' });

    expect(reportFinalApproveResponse.status).toBe(201);

    currentUser = {
      ...currentUser,
      userId: 'shipping-applicant',
      roles: ['all_authenticated', 'shipping'],
      departments: ['船务部'],
    };

    const printReportResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post(`/api/v1/procurement/report-requests/${reportId}/print`)
      .set('Authorization', 'Bearer token');

    expect(printReportResponse.status).toBe(201);
    const printedReportFileId = (printReportResponse.body as { data: { fileId: string } }).data.fileId;

    const reportRepository = dataSource.getRepository(ProcurementReportEntity);
    const report = await reportRepository.findOneByOrFail({ id: reportId });
    expect(report.exportPdfFileId).toBe(printedReportFileId);

    expect(wecomMessageMock.sendTextCard).toHaveBeenCalled();
    expect(wecomMessageMock.sendTextCard.mock.calls.length).toBeGreaterThanOrEqual(7);
  });
});
