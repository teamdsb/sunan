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
import { EnterpriseProfileModule } from 'src/modules/enterprise-profile/enterprise-profile.module';

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
    EnterpriseProfileModule,
  ],
})
class TestModule {}

describe('EnterpriseProfileController integration', () => {
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
        ossKey: 'enterprise-profiles/2026/03/a.pdf',
        fileName: 'a.pdf',
        mimeType: 'application/pdf',
        fileSize: 123,
        category: 'enterprise-profiles',
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

  it('blocks normal employee from create and allows manager CRUD with file bind/unbind', async () => {
    currentUser = {
      ...currentUser,
      userId: 'employee-1',
      roles: ['all_authenticated'],
    };
    const forbiddenCreate = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .post('/api/v1/enterprise-profiles')
      .set('Authorization', 'Bearer token')
      .send({ title: '资料A', category: 'license' });
    expect(forbiddenCreate.status).toBe(403);

    currentUser = {
      ...currentUser,
      userId: 'manager-1',
      roles: ['all_authenticated', 'business'],
    };
    const create = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .post('/api/v1/enterprise-profiles')
      .set('Authorization', 'Bearer token')
      .send({ title: '资料A', category: 'license', status: 'draft' });
    expect(create.status).toBe(201);
    const id = (create.body as { data: { id: string } }).data.id;

    const bind = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .post(`/api/v1/enterprise-profiles/${id}/files`)
      .set('Authorization', 'Bearer token')
      .send({ fileIds: [fileId] });
    expect(bind.status).toBe(201);
    expect(
      (bind.body as { data: { files: Array<{ id: string }> } }).data.files[0]
        ?.id,
    ).toBe(fileId);

    const unbind = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .delete(`/api/v1/enterprise-profiles/${id}/files/${fileId}`)
      .set('Authorization', 'Bearer token');
    expect(unbind.status).toBe(204);

    const remove = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .delete(`/api/v1/enterprise-profiles/${id}`)
      .set('Authorization', 'Bearer token');
    expect(remove.status).toBe(204);
  });

  it('enforces department scope for managers', async () => {
    currentUser = {
      ...currentUser,
      userId: 'manager-1',
      roles: ['all_authenticated', 'business'],
    };
    const create = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .post('/api/v1/enterprise-profiles')
      .set('Authorization', 'Bearer token')
      .send({ title: '资料B', category: 'notice', status: 'draft' });
    const id = (create.body as { data: { id: string } }).data.id;

    currentUser = {
      ...currentUser,
      userId: 'manager-2',
      roles: ['all_authenticated', 'finance'],
    };
    const update = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .patch(`/api/v1/enterprise-profiles/${id}`)
      .set('Authorization', 'Bearer token')
      .send({ title: '跨部门修改' });
    expect(update.status).toBe(403);
  });
});
