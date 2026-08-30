import type { CanActivate, ExecutionContext, INestApplication } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { configureApp } from 'src/app.bootstrap';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { ProcurementOrderEntity } from 'src/database/entities/procurement-order.entity';
import { ProcurementModule } from 'src/modules/procurement/procurement.module';
import { bootstrapPgTestDatabase, buildPgTypeOrmOptions, shutdownPgTestDatabase } from 'test/pg-test-container';

let currentUser = {
  userId: 'report-applicant',
  corpId: 'ww-test',
  name: 'Reporter',
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

function toDateText(date: Date) {
  return date.toISOString();
}

describe('ProcurementReport integration', () => {
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

  it('supports monthly/yearly/details report queries', async () => {
    const orderRepo = dataSource.getRepository(ProcurementOrderEntity);

    await orderRepo.save(
      orderRepo.create({
        orderNo: 'CG202601010001',
        departmentCode: 'shipping_dept',
        dimensionType: 'vessel',
        dimensionKey: 'su-nan-001',
        title: '船舶配件',
        summary: '船舶配件补充',
        amount: 1200,
        expenseDate: '2026-01-15T00:00:00.000Z',
        status: 'submitted',
        approvalChannel: 'internal',
        externalProcessInstanceId: null,
        externalStatus: null,
        externalSyncedAt: null,
        submittedAt: new Date('2026-01-20T10:00:00.000+08:00'),
        finalApprovedAt: null,
        createdBy: 'seed-user',
        updatedBy: 'seed-user',
      }),
    );

    const monthlyResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get('/api/v1/procurement/reports/monthly')
      .set('Authorization', 'Bearer token')
      .query({ year: 2026, month: 1, departmentCode: 'shipping_dept' });

    expect(monthlyResponse.status).toBe(200);
    expect((monthlyResponse.body as { data: { items: Array<{ amount: number; orderCount: number }> } }).data.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ amount: 1200, orderCount: 1 })]),
    );

    const yearlyResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get('/api/v1/procurement/reports/yearly')
      .set('Authorization', 'Bearer token')
      .query({ year: 2026, departmentCode: 'shipping_dept' });

    expect(yearlyResponse.status).toBe(200);
    expect((yearlyResponse.body as { data: { items: Array<{ label: string; amount: number }> } }).data.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ label: '01', amount: 1200 })]),
    );

    const detailsResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get('/api/v1/procurement/reports/department-details')
      .set('Authorization', 'Bearer token')
      .query({ departmentCode: 'shipping_dept', startDate: '2026-01-01T00:00:00.000Z', endDate: '2026-01-31T23:59:59.999Z' });

    expect(detailsResponse.status).toBe(200);
    expect((detailsResponse.body as { data: Array<{ orderNo: string }> }).data).toEqual(
      expect.arrayContaining([expect.objectContaining({ orderNo: 'CG202601010001' })]),
    );
  });

  it('supports report request submit and approval flow (dept -> finance -> final)', async () => {
    const createResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/v1/procurement/report-requests')
      .set('Authorization', 'Bearer token')
      .send({
        reportType: 'monthly',
        periodYear: 2026,
        periodMonth: 1,
        departmentCode: 'shipping_dept',
      });

    expect(createResponse.status).toBe(201);
    expect((createResponse.body as { data: { status: string } }).data.status).toBe('draft');

    const reportId = (createResponse.body as { data: { id: string } }).data.id;

    const submitResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post(`/api/v1/procurement/report-requests/${reportId}/submit`)
      .set('Authorization', 'Bearer token');

    expect(submitResponse.status).toBe(201);
    expect((submitResponse.body as { data: { status: string } }).data.status).toBe('submitted');

    const deptApproveResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post(`/api/v1/procurement/reports/${reportId}/approvals/actions`)
      .set('Authorization', 'Bearer token')
      .send({ action: 'approve', comment: '部门通过', source: 'internal' });

    expect(deptApproveResponse.status).toBe(201);
    expect((deptApproveResponse.body as { data: { status: string } }).data.status).toBe('dept_approved');

    currentUser = {
      ...currentUser,
      userId: 'finance-approver',
      departments: ['财务部'],
      roles: ['all_authenticated', 'finance'],
    };

    const financeApproveResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post(`/api/v1/procurement/reports/${reportId}/approvals/actions`)
      .set('Authorization', 'Bearer token')
      .send({ action: 'approve', comment: '财务通过', source: 'internal' });

    expect(financeApproveResponse.status).toBe(201);
    expect((financeApproveResponse.body as { data: { status: string } }).data.status).toBe('finance_approved');

    currentUser = {
      ...currentUser,
      userId: 'go-approver',
      departments: ['总经办'],
      roles: ['all_authenticated', 'general_office'],
    };

    const finalApproveResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post(`/api/v1/procurement/reports/${reportId}/approvals/actions`)
      .set('Authorization', 'Bearer token')
      .send({ action: 'approve', comment: '终审通过', source: 'internal' });

    expect(finalApproveResponse.status).toBe(201);
    expect((finalApproveResponse.body as { data: { status: string } }).data.status).toBe('final_approved');

    const historyResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get(`/api/v1/procurement/reports/${reportId}/approvals`)
      .set('Authorization', 'Bearer token');

    expect(historyResponse.status).toBe(200);
    expect((historyResponse.body as { data: Array<{ approvalLevel: string }> }).data).toEqual([
      expect.objectContaining({ approvalLevel: 'dept' }),
      expect.objectContaining({ approvalLevel: 'finance' }),
      expect.objectContaining({ approvalLevel: 'final' }),
    ]);
  });

  it('enforces last-three-years window for report detail queries', async () => {
    const now = new Date();
    const validStart = new Date(now);
    validStart.setFullYear(validStart.getFullYear() - 2);
    const validEnd = new Date(now);
    validEnd.setDate(validEnd.getDate() - 1);

    const validDepartmentDetail = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get('/api/v1/procurement/reports/department-details')
      .set('Authorization', 'Bearer token')
      .query({
        departmentCode: 'shipping_dept',
        startDate: toDateText(validStart),
        endDate: toDateText(validEnd),
      });
    expect(validDepartmentDetail.status).toBe(200);

    const invalidStart = new Date(now);
    invalidStart.setFullYear(invalidStart.getFullYear() - 4);
    const invalidDepartmentDetail = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get('/api/v1/procurement/reports/department-details')
      .set('Authorization', 'Bearer token')
      .query({
        departmentCode: 'shipping_dept',
        startDate: toDateText(invalidStart),
        endDate: toDateText(validEnd),
      });
    expect(invalidDepartmentDetail.status).toBe(400);
    expect((invalidDepartmentDetail.body as { message: string }).message).toContain('date range must be in last three years');
  });
});
