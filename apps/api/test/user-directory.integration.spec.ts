import type { INestApplication, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import request from 'supertest';

import {
  bootstrapPgTestDatabase,
  buildPgTypeOrmOptions,
  shutdownPgTestDatabase,
} from 'test/pg-test-container';
import { DataSource } from 'typeorm';

import { configureApp } from 'src/app.bootstrap';
import { RequestIdMiddleware } from 'src/common/middleware/request-id.middleware';
import { WecomDepartmentEntity } from 'src/database/entities/wecom-department.entity';
import { WecomSyncBatchEntity } from 'src/database/entities/wecom-sync-batch.entity';
import { WecomUserAuditEntity } from 'src/database/entities/wecom-user-audit.entity';
import { WecomUserEntity } from 'src/database/entities/wecom-user.entity';
import { AuthModule } from 'src/modules/auth/auth.module';
import { AuthorizationService } from 'src/modules/auth/authorization.service';
import { UserDirectoryModule } from 'src/modules/user-directory/user-directory.module';
import { REDIS_CLIENT } from 'src/modules/wecom/wecom.constants';
import { WecomHttpGateway } from 'src/modules/wecom/wecom-http.gateway';
import { WecomAdminService } from 'src/modules/wecom/wecom-admin.service';
import { WecomModule } from 'src/modules/wecom/wecom.module';
import { WecomTokenService } from 'src/modules/wecom/wecom-token.service';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: async () => {
        await bootstrapPgTestDatabase();
        return buildPgTypeOrmOptions();
      },
    }),
    WecomModule,
    AuthModule,
    UserDirectoryModule,
  ],
})
class TestAppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}

describe('User directory integration', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const gatewayMock = {
    getUserInfo: jest.fn((_accessToken: string, code: string) =>
      code === 'member-code' ? { UserId: 'member-user' } : { UserId: 'admin-user' },
    ),
    getUserDetail: jest.fn((_accessToken: string, userId: string) =>
      userId === 'member-user'
        ? { userid: 'member-user', name: '普通成员', department: [6], position: '员工' }
        : {
            userid: 'admin-user',
            name: '管理员',
            avatar: 'https://avatar.example.com/admin.png',
            department: [1, 3],
            position: '管理员',
          },
    ),
    listDepartments: jest.fn(() => ({
      department: [
        { id: 1, name: '公司成员', parentid: 0 },
        { id: 3, name: '总经办', parentid: 1 },
        { id: 6, name: '船务部', parentid: 1 },
      ],
    })),
    listUsers: jest.fn((_accessToken: string, departmentId: number) => {
      if (departmentId === 1) {
        return {
          userlist: [
            { userid: 'admin-user', name: '管理员', department: [1, 3], position: '管理员', status: 1 },
          ],
        };
      }
      if (departmentId === 3) {
        return {
          userlist: [
            { userid: 'admin-user', name: '管理员', department: [1, 3], position: '管理员', status: 1 },
          ],
        };
      }
      if (departmentId === 6) {
        return {
          userlist: [
            { userid: 'directory-only', name: '未登录成员', department: [6], position: '员工', status: 1 },
          ],
        };
      }
      return { userlist: [] };
    }),
  };

  const tokenServiceMock = {
    getAccessToken: jest.fn(() => 'upstream-access-token'),
    getCorpJsapiTicket: jest.fn(() => 'corp-ticket'),
    getAgentJsapiTicket: jest.fn(() => 'agent-ticket'),
  };

  async function login(code = 'admin-code'): Promise<string> {
    const response = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get('/api/v1/auth/wecom/callback')
      .query({ code });
    expect(response.status).toBe(200);
    return (response.body as { data: { accessToken: string } }).data.accessToken;
  }

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = '01234567890123456789012345678901';
    process.env.JWT_EXPIRES_IN = '7200s';
    process.env.WECOM_CORP_ID = 'ww-test-corp';
    process.env.WECOM_AGENT_ID = '1000001';
    process.env.WECOM_AGENT_SECRET = 'test-agent-secret';
    process.env.WECOM_REDIRECT_URI = 'https://example.com/auth';

    const moduleRef = await Test.createTestingModule({ imports: [TestAppModule] })
      .overrideProvider(REDIS_CLIENT)
      .useValue({ get: jest.fn(), set: jest.fn(), del: jest.fn() })
      .overrideProvider(WecomHttpGateway)
      .useValue(gatewayMock)
      .overrideProvider(WecomAdminService)
      .useValue({ isSystemAdmin: (userId: string) => userId === 'admin-user' })
      .overrideProvider(WecomTokenService)
      .useValue(tokenServiceMock)
      .compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    dataSource = app.get(DataSource);
  });

  beforeEach(async () => {
    await dataSource.getRepository(WecomUserAuditEntity).clear();
    await dataSource.getRepository(WecomUserEntity).clear();
    await dataSource.getRepository(WecomDepartmentEntity).clear();
    await dataSource.getRepository(WecomSyncBatchEntity).clear();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    if (app) await app.close();
    await shutdownPgTestDatabase();
  });

  it('syncs an unlogged member, deduplicates multi-department results, and is idempotent', async () => {
    gatewayMock.listUsers.mockImplementationOnce(() => {
      throw new Error('temporary WeCom failure');
    });
    const token = await login();
    const first = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/v1/admin/wecom-directory-sync')
      .set('Authorization', `Bearer ${token}`);
    expect(first.status).toBe(201);
    expect(first.body.data.status).toBe('succeeded');
    expect(first.body.data.readCount).toBe(2);

    const second = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/v1/admin/users/sync')
      .set('Authorization', `Bearer ${token}`);
    expect(second.status).toBe(201);
    expect(second.body.data.status).toBe('succeeded');
    expect(await dataSource.getRepository(WecomUserEntity).count()).toBe(2);
    expect(await dataSource.getRepository(WecomUserEntity).findOneByOrFail({ userId: 'directory-only' })).toMatchObject({
      lastLoginAt: null,
      loginStatus: 'never',
      platformStatus: 'enabled',
    });
  });

  it('does not disable a member missing from a partial directory result', async () => {
    const userRepository = dataSource.getRepository(WecomUserEntity);
    await userRepository.save(
      userRepository.create({
        userId: 'missing-user',
        corpId: 'ww-test-corp',
        name: '历史成员',
        avatarUrl: null,
        departmentIds: [6],
        departmentCodes: ['shipping_dept'],
        departmentNames: ['船务部'],
        position: null,
        rawProfile: {},
      }),
    );
    const token = await login();
    const response = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/v1/admin/users/sync')
      .set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(201);
    expect(await userRepository.findOneByOrFail({ userId: 'missing-user' })).toMatchObject({
      platformStatus: 'enabled',
      sourceStatus: 'unknown',
    });
  });

  it('supports manual empty roles and rejects stale versions or forged admin fields', async () => {
    const token = await login();
    await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/v1/admin/users/sync')
      .set('Authorization', `Bearer ${token}`);
    const list = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get('/api/v1/admin/wecom-users')
      .set('Authorization', `Bearer ${token}`)
      .query({ search: 'directory-only' });
    const version = list.body.data.items[0].platform.authorizationVersion as number;

    const update = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .patch('/api/v1/admin/wecom-users/directory-only/authorization')
      .set('Authorization', `Bearer ${token}`)
      .send({
        departmentMode: 'manual',
        manualDepartmentIds: [6],
        roleMode: 'manual',
        manualRoles: [],
        expectedAuthorizationVersion: version,
        reason: '明确不授予额外业务角色',
        isSystemAdmin: true,
      });
    expect(update.status).toBe(400);

    const valid = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .patch('/api/v1/admin/wecom-users/directory-only/authorization')
      .set('Authorization', `Bearer ${token}`)
      .send({
        departmentMode: 'manual',
        manualDepartmentIds: [6],
        roleMode: 'manual',
        manualRoles: [],
        expectedAuthorizationVersion: version,
        reason: '明确不授予额外业务角色',
      });
    expect(valid.status).toBe(200);
    expect(valid.body.data.effective.roles).toEqual(['all_authenticated']);

    const conflict = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .patch('/api/v1/admin/wecom-users/directory-only/authorization')
      .set('Authorization', `Bearer ${token}`)
      .send({ expectedAuthorizationVersion: version, reason: '旧版本' });
    expect(conflict.status).toBe(409);
  });

  it('rejects a non-admin directory request', async () => {
    const token = await login('member-code');
    const response = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(403);
  });

  it('returns 409 for concurrent edits using the same authorization version', async () => {
    const token = await login();
    await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/v1/admin/wecom-directory-sync')
      .set('Authorization', `Bearer ${token}`)
      .expect(201);
    const list = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get('/api/v1/admin/wecom-users')
      .set('Authorization', `Bearer ${token}`)
      .query({ search: 'directory-only' });
    const version = list.body.data.items[0].platform.authorizationVersion as number;
    const payload = {
      roleMode: 'manual',
      manualRoles: ['shipping'],
      expectedAuthorizationVersion: version,
      reason: '并发编辑验证',
    };
    const responses = await Promise.all([
      request(app.getHttpServer() as Parameters<typeof request>[0])
        .patch('/api/v1/admin/wecom-users/directory-only/authorization')
        .set('Authorization', `Bearer ${token}`)
        .send(payload),
      request(app.getHttpServer() as Parameters<typeof request>[0])
        .patch('/api/v1/admin/wecom-users/directory-only/authorization')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...payload, reason: '并发编辑验证-另一请求' }),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
    expect(
      await dataSource.getRepository(WecomUserAuditEntity).countBy({ userId: 'directory-only' }),
    ).toBe(1);
  });

  it('keeps a newer source snapshot when an older PostgreSQL write arrives later', async () => {
    const token = await login();
    await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/v1/admin/wecom-directory-sync')
      .set('Authorization', `Bearer ${token}`)
      .expect(201);
    const authorization = app.get(AuthorizationService);
    const source = {
      userId: 'directory-only',
      corpId: 'ww-test-corp',
      avatarUrl: null,
      departmentIds: [6],
      departmentNames: ['船务部'],
      departmentCodes: ['shipping_dept'],
      position: '新职位',
      rawProfile: { marker: 'new' },
      sourceStatus: 'active' as const,
    };
    await authorization.applySourceProfile({ ...source, name: '新来源', sourceRevision: 900 });
    await authorization.applySourceProfile({ ...source, name: '旧来源', sourceRevision: 899 });
    const saved = await dataSource.getRepository(WecomUserEntity).findOneByOrFail({
      userId: 'directory-only',
    });
    expect(saved.name).toBe('新来源');
    expect(Number(saved.sourceRevision)).toBe(900);
  });

  it('applies platform disabled immediately to OAuth, me, and refresh while preserving env admin access', async () => {
    const memberToken = await login('member-code');
    const adminToken = await login();
    const list = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ search: 'member-user' });
    const version = list.body.data.items[0].platform.authorizationVersion as number;
    const update = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .patch('/api/v1/admin/wecom-users/member-user/authorization')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ platformStatus: 'disabled', expectedAuthorizationVersion: version, reason: '离岗' });
    expect(update.status).toBe(200);

    const me = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${memberToken}`);
    expect(me.status).toBe(403);
    const refresh = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/v1/auth/refresh')
      .set('Authorization', `Bearer ${memberToken}`);
    expect(refresh.status).toBe(403);
    const oauth = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get('/api/v1/auth/wecom/callback')
      .query({ code: 'member-code' });
    expect(oauth.status).toBe(403);
  });
});
