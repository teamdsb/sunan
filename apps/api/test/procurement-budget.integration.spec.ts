import type {
  CanActivate,
  ExecutionContext,
  INestApplication,
} from '@nestjs/common';
import { Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { configureApp } from 'src/app.bootstrap';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { ProcurementOrderEntity } from 'src/database/entities/procurement-order.entity';
import { ProcurementModule } from 'src/modules/procurement/procurement.module';
import {
  bootstrapPgTestDatabase,
  buildPgTypeOrmOptions,
  shutdownPgTestDatabase,
} from 'test/pg-test-container';

let currentUser = {
  userId: 'business-user',
  corpId: 'ww-test',
  name: 'Business User',
  avatar: null,
  departments: ['业务部'],
  position: '员工',
  roles: ['all_authenticated', 'business'],
  isAdmin: false,
};

const authGuard: CanActivate = {
  canActivate(context: ExecutionContext) {
    context.switchToHttp().getRequest<{ user?: unknown }>().user = currentUser;
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

describe('Procurement budget integration', () => {
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

  it('uses backend budget configuration and final-approved expenses as the source of truth', async () => {
    const deniedResponse = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .post('/api/v1/procurement/admin/budgets')
      .set('Authorization', 'Bearer token')
      .send({
        budgetYear: 2026,
        departmentCode: 'business_dept',
        dimensionType: 'none',
        budgetAmount: 100,
        changeReason: '年度预算',
      });
    expect(deniedResponse.status).toBe(403);

    currentUser = {
      ...currentUser,
      userId: 'general-office-user',
      departments: ['总经办'],
      roles: ['all_authenticated', 'general_office'],
    };

    const createResponse = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .post('/api/v1/procurement/admin/budgets')
      .set('Authorization', 'Bearer token')
      .send({
        budgetYear: 2026,
        departmentCode: 'business_dept',
        dimensionType: 'none',
        budgetAmount: 100,
        changeReason: '年度预算',
      });
    expect(createResponse.status).toBe(201);
    const budgetId = (createResponse.body as { data: { id: string } }).data.id;

    const orderRepository = dataSource.getRepository(ProcurementOrderEntity);
    await orderRepository.save(
      orderRepository.create({
        orderNo: 'PO-2026-BUDGET-001',
        departmentCode: 'business_dept',
        dimensionType: 'none',
        dimensionKey: null,
        title: '预算执行采购',
        summary: '用于年度预算执行统计',
        amount: 120,
        expenseDate: '2026-06-13',
        status: 'final_approved',
        approvalChannel: 'internal',
        externalProcessInstanceId: null,
        externalStatus: null,
        externalSyncedAt: null,
        submittedAt: new Date('2026-06-10T00:00:00.000Z'),
        finalApprovedAt: new Date('2026-06-11T00:00:00.000Z'),
        createdBy: 'business-user',
        updatedBy: 'general-office-user',
      }),
    );

    const summaryResponse = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .get('/api/v1/procurement/budgets/summary')
      .set('Authorization', 'Bearer token')
      .query({ year: 2026 });
    expect(summaryResponse.status).toBe(200);
    expect(summaryResponse.body).toEqual({
      data: expect.objectContaining({
        year: 2026,
        budgetAmount: 100,
        executedAmount: 120,
        executionRate: 120,
        overBudgetAmount: 20,
        isOverBudget: true,
        items: [
          expect.objectContaining({
            departmentCode: 'business_dept',
            budgetAmount: 100,
            executedAmount: 120,
            executionRate: 120,
            isOverBudget: true,
          }),
        ],
      }),
    });

    const updateResponse = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .patch(`/api/v1/procurement/admin/budgets/${budgetId}`)
      .set('Authorization', 'Bearer token')
      .send({ budgetAmount: 150, changeReason: '追加业务预算' });
    expect(updateResponse.status).toBe(200);
    expect(
      (
        updateResponse.body as {
          data: { budgetAmount: number; isOverBudget: boolean };
        }
      ).data,
    ).toEqual(
      expect.objectContaining({ budgetAmount: 150, isOverBudget: false }),
    );

    const auditsResponse = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .get(`/api/v1/procurement/admin/budgets/${budgetId}/audits`)
      .set('Authorization', 'Bearer token');
    expect(auditsResponse.status).toBe(200);
    expect(
      (
        auditsResponse.body as {
          data: Array<{ action: string; changeReason: string }>;
        }
      ).data,
    ).toEqual([
      expect.objectContaining({
        action: 'update',
        changeReason: '追加业务预算',
      }),
      expect.objectContaining({ action: 'create', changeReason: '年度预算' }),
    ]);
  });

  it('returns an empty yearly summary when neither budgets nor qualifying expenses exist', async () => {
    const response = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .get('/api/v1/procurement/budgets/summary')
      .set('Authorization', 'Bearer token')
      .query({ year: 2099 });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: {
        year: 2099,
        budgetAmount: 0,
        executedAmount: 0,
        executionRate: 0,
        overBudgetAmount: 0,
        isOverBudget: false,
        items: [],
      },
    });
  });
});
