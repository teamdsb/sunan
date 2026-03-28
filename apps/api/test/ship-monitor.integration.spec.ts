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
import { DataSource } from 'typeorm';
import request from 'supertest';
import { configureApp } from 'src/app.bootstrap';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { VesselEntity } from 'src/database/entities/vessel.entity';
import { ShipMonitorModule } from 'src/modules/ship-monitor/ship-monitor.module';

let currentUser = {
  userId: 'manager-1',
  corpId: 'ww-test',
  name: 'Manager',
  avatar: null,
  departments: ['船务部'],
  position: '经理',
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
    ShipMonitorModule,
  ],
})
class TestModule {}

describe('ShipMonitorController integration', () => {
  let app: INestApplication;
  let vesselId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [TestModule] })
      .overrideGuard(JwtAuthGuard)
      .useValue(authGuard)
      .compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    const dataSource = moduleRef.get(DataSource);
    const vesselRepo = dataSource.getRepository(VesselEntity);
    vesselId = (
      await vesselRepo.save(
        vesselRepo.create({
          code: 'SN012',
          name: '苏南012',
          category: 'main_vessel',
          status: 'active',
        }),
      )
    ).id;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    await shutdownPgTestDatabase();
  });

  it('supports manager CRUD and employee readonly(active only)', async () => {
    const create1 = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .post('/api/v1/ship-monitors')
      .set('Authorization', 'Bearer token')
      .send({
        vesselId,
        monitorName: '主监控',
        endpointUrl: 'https://monitor1.example.com',
      });
    const id1 = (create1.body as { data: { id: string } }).data.id;
    expect(create1.status).toBe(201);

    const create2 = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .post('/api/v1/ship-monitors')
      .set('Authorization', 'Bearer token')
      .send({
        vesselId,
        monitorName: '备用监控',
        endpointUrl: 'https://monitor2.example.com',
      });
    const id2 = (create2.body as { data: { id: string } }).data.id;
    expect(create2.status).toBe(201);

    await request(app.getHttpServer() as Parameters<typeof request>[0])
      .patch(`/api/v1/ship-monitors/${id2}`)
      .set('Authorization', 'Bearer token')
      .send({ isActive: false });

    currentUser = {
      ...currentUser,
      userId: 'employee-1',
      roles: ['all_authenticated'],
      position: '员工',
    };
    const employeeList = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .get('/api/v1/ship-monitors?activeOnly=false')
      .set('Authorization', 'Bearer token');
    expect(employeeList.status).toBe(200);
    expect(
      (employeeList.body as { data: Array<{ id: string }> }).data,
    ).toHaveLength(1);
    expect(
      (employeeList.body as { data: Array<{ id: string }> }).data[0]?.id,
    ).toBe(id1);

    const employeeCreate = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .post('/api/v1/ship-monitors')
      .set('Authorization', 'Bearer token')
      .send({
        vesselId,
        monitorName: '员工创建',
        endpointUrl: 'https://monitor3.example.com',
      });
    expect(employeeCreate.status).toBe(403);

    currentUser = {
      ...currentUser,
      userId: 'manager-1',
      roles: ['all_authenticated', 'shipping'],
      position: '经理',
    };
    const del = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .delete(`/api/v1/ship-monitors/${id1}`)
      .set('Authorization', 'Bearer token');
    expect(del.status).toBe(204);
  });
});
