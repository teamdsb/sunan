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
import { FileEntity } from 'src/database/entities/file.entity';
import { WecomUserEntity } from 'src/database/entities/wecom-user.entity';
import { EnterprisePolicyModule } from 'src/modules/enterprise-policy/enterprise-policy.module';

let currentUser = {
  userId: 'manager-1',
  corpId: 'ww-test',
  name: 'Manager',
  avatar: null,
  departments: ['业务部'],
  position: '经理',
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
    EnterprisePolicyModule,
  ],
})
class TestModule {}

describe('EnterprisePolicyController integration', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let fileId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [TestModule] })
      .overrideGuard(JwtAuthGuard)
      .useValue(authGuard)
      .compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    dataSource = moduleRef.get(DataSource);

    const wecomRepo = dataSource.getRepository(WecomUserEntity);
    await wecomRepo.save([
      wecomRepo.create({
        userId: 'manager-1',
        corpId: 'ww-test',
        name: 'Manager1',
        avatarUrl: null,
        departmentCodes: ['business_dept'],
        departmentNames: ['业务部'],
        position: '经理',
        isSystemAdmin: false,
        rawProfile: {},
      }),
      wecomRepo.create({
        userId: 'manager-2',
        corpId: 'ww-test',
        name: 'Manager2',
        avatarUrl: null,
        departmentCodes: ['finance_dept'],
        departmentNames: ['财务部'],
        position: '经理',
        isSystemAdmin: false,
        rawProfile: {},
      }),
      wecomRepo.create({
        userId: 'employee-1',
        corpId: 'ww-test',
        name: 'Employee',
        avatarUrl: null,
        departmentCodes: ['business_dept'],
        departmentNames: ['业务部'],
        position: '员工',
        isSystemAdmin: false,
        rawProfile: {},
      }),
    ]);

    const fileRepo = dataSource.getRepository(FileEntity);
    const file = await fileRepo.save(
      fileRepo.create({
        ossKey: 'enterprise-policies/2026/03/a.pdf',
        fileName: 'a.pdf',
        mimeType: 'application/pdf',
        fileSize: 123,
        category: 'enterprise-policies',
        uploadedBy: 'manager-1',
      }),
    );
    fileId = file.id;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    await shutdownPgTestDatabase();
  });

  it('supports create/list/detail/versions/publish/bind and blocks employee write', async () => {
    currentUser = {
      ...currentUser,
      userId: 'employee-1',
      roles: ['all_authenticated'],
    };
    const forbiddenCreate = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .post('/api/v1/enterprise-policies')
      .set('Authorization', 'Bearer token')
      .send({ title: '制度A', policyCode: 'POL-1', version: 'v1' });
    expect(forbiddenCreate.status).toBe(403);

    currentUser = {
      ...currentUser,
      userId: 'manager-1',
      roles: ['all_authenticated', 'business'],
    };
    const create = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .post('/api/v1/enterprise-policies')
      .set('Authorization', 'Bearer token')
      .send({ title: '制度A', policyCode: 'POL-1', version: 'v1' });
    expect(create.status).toBe(201);
    const id = (create.body as { data: { id: string } }).data.id;

    const list = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .get('/api/v1/enterprise-policies?page=1&pageSize=10')
      .set('Authorization', 'Bearer token');
    expect(list.status).toBe(200);

    const detail = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .get(`/api/v1/enterprise-policies/${id}`)
      .set('Authorization', 'Bearer token');
    expect(detail.status).toBe(200);

    const bind = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .post(`/api/v1/enterprise-policies/${id}/files`)
      .set('Authorization', 'Bearer token')
      .send({ fileIds: [fileId] });
    expect(bind.status).toBe(201);

    const versions = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .get(`/api/v1/enterprise-policies/${id}/versions`)
      .set('Authorization', 'Bearer token');
    expect(versions.status).toBe(200);

    const publish = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .post(`/api/v1/enterprise-policies/${id}/publish`)
      .set('Authorization', 'Bearer token');
    expect(publish.status).toBe(201);
  });

  it('enforces department scope for manager update', async () => {
    currentUser = {
      ...currentUser,
      userId: 'manager-1',
      roles: ['all_authenticated', 'business'],
    };
    const create = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .post('/api/v1/enterprise-policies')
      .set('Authorization', 'Bearer token')
      .send({ title: '制度B', policyCode: 'POL-2', version: 'v1' });
    const id = (create.body as { data: { id: string } }).data.id;

    currentUser = {
      ...currentUser,
      userId: 'manager-2',
      roles: ['all_authenticated', 'finance'],
    };
    const update = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .patch(`/api/v1/enterprise-policies/${id}`)
      .set('Authorization', 'Bearer token')
      .send({ title: '跨部门修改' });
    expect(update.status).toBe(403);
  });
});
