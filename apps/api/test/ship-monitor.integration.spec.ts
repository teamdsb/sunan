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
import { DataSource, Repository } from 'typeorm';
import request from 'supertest';
import { configureApp } from 'src/app.bootstrap';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { VesselEntity } from 'src/database/entities/vessel.entity';
import { ShipMonitorEntity } from 'src/database/entities/ship-monitor.entity';
import { ShipMonitorModule } from 'src/modules/ship-monitor/ship-monitor.module';

let currentUser = {
  userId: 'system-admin',
  corpId: 'ww-test',
  name: 'System admin',
  avatar: null,
  departments: ['船务部'],
  position: '经理',
  roles: ['all_authenticated', 'system_admin'],
  isAdmin: true,
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
  let monitors: Repository<ShipMonitorEntity>;
  let vessels: Repository<VesselEntity>;

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
    vessels = vesselRepo;
    monitors = dataSource.getRepository(ShipMonitorEntity);
    vesselId = (
      await vesselRepo.save(
        vesselRepo.create({
          code: 'SN012-MON',
          name: '苏南012-监控测试',
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

  beforeEach(async () => {
    currentUser = {
      ...currentUser,
      userId: 'system-admin',
      roles: ['all_authenticated', 'system_admin'],
      isAdmin: true,
    };
    await monitors.clear();
    await vessels.update(vesselId, { status: 'active', deletedAt: null });
  });

  const body = (monitorName = '主监控') => ({
    vesselId,
    monitorName,
    endpointUrl: 'https://monitor.example.com/live',
  });
  const http = () =>
    request(app.getHttpServer() as Parameters<typeof request>[0]);

  it('supports create, edit, ordered lists, disable/re-enable and soft deletion', async () => {
    const first = await http()
      .post('/api/v1/ship-monitors')
      .send(body())
      .expect(201);
    const id = (first.body as { data: { id: string } }).data.id;
    expect(first.body).toMatchObject({
      data: {
        ...body(),
        vesselName: '苏南012-监控测试',
        vesselCode: 'SN012-MON',
        isActive: true,
      },
    });
    await http()
      .post('/api/v1/ship-monitors')
      .send({ ...body('第二监控'), sortOrder: 5 })
      .expect(201);
    await http()
      .patch(`/api/v1/ship-monitors/${id}`)
      .send({
        monitorName: '编辑后的监控',
        accessMode: 'embed',
        sortOrder: 10,
        isActive: false,
      })
      .expect(200);
    const all = await http()
      .get('/api/v1/ship-monitors?activeOnly=false')
      .expect(200);
    expect(
      (all.body as { data: ShipMonitorEntity[] }).data.map(
        (row) => row.monitorName,
      ),
    ).toEqual(['第二监控', '编辑后的监控']);
    const scoped = await http()
      .get(`/api/v1/ship-monitors/vessels/${vesselId}`)
      .expect(200);
    expect((scoped.body as { data: ShipMonitorEntity[] }).data).toHaveLength(2);
    await http().get(`/api/v1/ship-monitors/${id}`).expect(200);
    await http()
      .patch(`/api/v1/ship-monitors/${id}`)
      .send({ isActive: true })
      .expect(200);
    const active = await http().get('/api/v1/ship-monitors').expect(200);
    expect((active.body as { data: ShipMonitorEntity[] }).data).toHaveLength(2);
    await http().delete(`/api/v1/ship-monitors/${id}`).expect(204);
    await http().get(`/api/v1/ship-monitors/${id}`).expect(404);
    await http()
      .patch(`/api/v1/ship-monitors/${id}`)
      .send({ isActive: true })
      .expect(404);
    expect(
      (await monitors.findOne({ where: { id }, withDeleted: true }))?.deletedAt,
    ).toBeInstanceOf(Date);
    await http()
      .post('/api/v1/ship-monitors')
      .send(body('编辑后的监控'))
      .expect(201);
  });

  it.each(['shipping', 'general_office', 'crew'])(
    'keeps %s read-only and hides disabled monitor details',
    async (role) => {
      const active = await http()
        .post('/api/v1/ship-monitors')
        .send(body())
        .expect(201);
      const disabled = await http()
        .post('/api/v1/ship-monitors')
        .send({ ...body('停用监控'), isActive: false })
        .expect(201);
      const activeId = (active.body as { data: { id: string } }).data.id;
      const disabledId = (disabled.body as { data: { id: string } }).data.id;
      // isAdmin alone is deliberately insufficient: configuration requires system_admin.
      currentUser = {
        ...currentUser,
        roles: ['all_authenticated', role],
        isAdmin: true,
      };
      for (const path of [
        '/api/v1/ship-monitors?activeOnly=false',
        `/api/v1/ship-monitors/vessels/${vesselId}`,
      ]) {
        const response = await http().get(path).expect(200);
        expect(
          (response.body as { data: { id: string }[] }).data.map(
            (row) => row.id,
          ),
        ).toEqual([activeId]);
      }
      await http().get(`/api/v1/ship-monitors/${activeId}`).expect(200);
      await http().get(`/api/v1/ship-monitors/${disabledId}`).expect(404);
      await http()
        .post('/api/v1/ship-monitors')
        .send(body('越权新增'))
        .expect(403);
      await http()
        .patch(`/api/v1/ship-monitors/${activeId}`)
        .send({ isActive: false })
        .expect(403);
      await http().delete(`/api/v1/ship-monitors/${activeId}`).expect(403);
    },
  );

  it('reports conflicts for create/update, including concurrent creation', async () => {
    const responses = await Promise.all([
      http().post('/api/v1/ship-monitors').send(body()),
      http().post('/api/v1/ship-monitors').send(body()),
    ]);
    expect(responses.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(responses.find((r) => r.status === 409)?.body).toMatchObject({
      message: '该船舶已存在同名监控入口',
    });
    const other = await http()
      .post('/api/v1/ship-monitors')
      .send(body('备用'))
      .expect(201);
    const id = (other.body as { data: { id: string } }).data.id;
    await http()
      .patch(`/api/v1/ship-monitors/${id}`)
      .send({ monitorName: '主监控' })
      .expect(409);
    await http()
      .patch(`/api/v1/ship-monitors/${id}`)
      .send({ monitorName: '备用' })
      .expect(200);
  });

  it('validates vessel references but allows disabling/deleting obsolete entries', async () => {
    const response = await http()
      .post('/api/v1/ship-monitors')
      .send(body())
      .expect(201);
    const id = (response.body as { data: { id: string } }).data.id;
    await http()
      .post('/api/v1/ship-monitors')
      .send({ ...body(), vesselId: '12345678-1234-4234-8234-123456789abc' })
      .expect(404);
    await vessels.update(vesselId, { status: 'inactive' });
    await http().post('/api/v1/ship-monitors').send(body('新建')).expect(422);
    await http()
      .patch(`/api/v1/ship-monitors/${id}`)
      .send({ isActive: false })
      .expect(200);
    await http()
      .patch(`/api/v1/ship-monitors/${id}`)
      .send({ isActive: true })
      .expect(422);
    await vessels.softDelete(vesselId);
    const detail = await http().get(`/api/v1/ship-monitors/${id}`).expect(200);
    expect(detail.body).toMatchObject({
      data: { vesselName: '苏南012-监控测试' },
    });
    await http().post('/api/v1/ship-monitors').send(body('新建')).expect(404);
    await http().delete(`/api/v1/ship-monitors/${id}`).expect(204);
  });

  it('returns 400 for malformed IDs/query parameters rather than database errors', async () => {
    for (const path of [
      '/api/v1/ship-monitors/not-a-uuid',
      '/api/v1/ship-monitors/vessels/not-a-uuid',
      '/api/v1/ship-monitors?vesselId=船名',
      '/api/v1/ship-monitors?activeOnly=wrong',
    ]) {
      await http().get(encodeURI(path)).expect(400);
    }
    await http()
      .patch('/api/v1/ship-monitors/not-a-uuid')
      .send({ isActive: false })
      .expect(400);
    await http().delete('/api/v1/ship-monitors/not-a-uuid').expect(400);
    await http()
      .post('/api/v1/ship-monitors')
      .send({ ...body(), vesselId: '苏南012' })
      .expect(400);
  });

  it('allows only system administrators to manage monitors', async () => {
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
      userId: 'shipping-manager',
      roles: ['all_authenticated', 'shipping'],
      position: '经理',
      isAdmin: false,
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

    const departmentManagerCreate = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .post('/api/v1/ship-monitors')
      .set('Authorization', 'Bearer token')
      .send({
        vesselId,
        monitorName: '部门管理员创建',
        endpointUrl: 'https://monitor3.example.com',
      });
    expect(departmentManagerCreate.status).toBe(403);

    currentUser = {
      ...currentUser,
      userId: 'system-admin',
      roles: ['all_authenticated', 'system_admin'],
      position: '管理员',
      isAdmin: true,
    };
    const del = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .delete(`/api/v1/ship-monitors/${id1}`)
      .set('Authorization', 'Bearer token');
    expect(del.status).toBe(204);
  });
});
