import type {
  INestApplication,
  NestModule,
  MiddlewareConsumer,
} from '@nestjs/common';
import { Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  bootstrapPgTestDatabase,
  buildPgTypeOrmOptions,
  shutdownPgTestDatabase,
} from 'test/pg-test-container';
import request from 'supertest';

import { configureApp } from 'src/app.bootstrap';
import { RequestIdMiddleware } from 'src/common/middleware/request-id.middleware';
import { HealthController } from 'src/health/health.controller';
import { AuthModule } from 'src/modules/auth/auth.module';
import { WecomUserEntity } from 'src/database/entities/wecom-user.entity';
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
  ],
  controllers: [HealthController],
})
class TestAppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}

describe('AuthController integration', () => {
  let app: INestApplication;
  let expiredToken: string;

  const gatewayMock = {
    getUserInfo: jest.fn((_accessToken: string, code: string) => {
      if (code === 'expired-code') {
        return {};
      }

      if (code === 'outsider-code') {
        return { UserId: 'ghost-user' };
      }

      return { UserId: 'admin-user' };
    }),
    getUserDetail: jest.fn((_accessToken: string, userId: string) => {
      if (userId === 'ghost-user') {
        return { userid: '', name: '' };
      }

      return {
        userid: 'admin-user',
        name: '寮犱笁',
        avatar: 'https://avatar.example.com/u.png',
        department: [1],
        position: 'General Manager',
      };
    }),
    listDepartments: jest.fn(() => ({
      department: [{ id: 1, name: '总经办' }],
    })),
  };

  const tokenServiceMock = {
    getAccessToken: jest.fn(() => 'upstream-access-token'),
    getCorpJsapiTicket: jest.fn(() => 'corp-ticket'),
    getAgentJsapiTicket: jest.fn(() => 'agent-ticket'),
  };

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = '01234567890123456789012345678901';
    process.env.JWT_EXPIRES_IN = '7200s';
    process.env.WECOM_CORP_ID = 'ww-test-corp';
    process.env.WECOM_AGENT_ID = '1000001';
    process.env.WECOM_AGENT_SECRET = 'test-agent-secret';
    process.env.WECOM_REDIRECT_URI = 'https://example.com/auth';

    const [{ JwtService }] = await Promise.all([import('@nestjs/jwt')]);

    const moduleRef = await Test.createTestingModule({
      imports: [TestAppModule],
    })
      .overrideProvider(REDIS_CLIENT)
      .useValue({
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn(),
      })
      .overrideProvider(WecomHttpGateway)
      .useValue(gatewayMock)
      .overrideProvider(WecomAdminService)
      .useValue({
        isSystemAdmin: (userId: string) => userId === 'admin-user',
      })
      .overrideProvider(WecomTokenService)
      .useValue(tokenServiceMock)
      .compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    const jwtService = app.get(JwtService);
    expiredToken = await jwtService.signAsync(
      {
        sub: 'admin-user',
        corpId: 'ww-test-corp',
        name: '寮犱笁',
      },
      {
        expiresIn: -1,
      },
    );
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    await shutdownPgTestDatabase();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns health payload and request id header', async () => {
    const response = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    ).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: { status: 'ok' } });
    expect(response.headers['x-request-id']).toBeDefined();
  });

  it('exchanges code for jwt and current user info', async () => {
    const response = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .get('/api/v1/auth/wecom/callback')
      .query({ code: 'valid-code' });
    const body = response.body as {
      data: {
        accessToken: string;
        user: { roles: string[]; isAdmin: boolean };
      };
    };

    expect(response.status).toBe(200);
    expect(body.data.accessToken).toEqual(expect.any(String));
    expect(body.data.user.roles).toEqual(
      expect.arrayContaining([
        'all_authenticated',
        'general_office',
        'system_admin',
      ]),
    );
    expect(body.data.user.isAdmin).toBe(true);
  });

  it('returns 401 when code is expired', async () => {
    const response = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .get('/api/v1/auth/wecom/callback')
      .query({ code: 'expired-code' });

    expect(response.status).toBe(401);
  });

  it('returns 403 for non-directory user', async () => {
    const response = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .get('/api/v1/auth/wecom/callback')
      .query({ code: 'outsider-code' });

    expect(response.status).toBe(403);
  });

  it('refreshes an expired jwt', async () => {
    const response = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .post('/api/v1/auth/refresh')
      .set('Authorization', `Bearer ${expiredToken}`);
    const body = response.body as { data: { accessToken: string } };

    expect(response.status).toBe(200);
    expect(body.data.accessToken).toEqual(expect.any(String));
  });

  it('returns current user profile for authenticated request', async () => {
    const login = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .get('/api/v1/auth/wecom/callback')
      .query({ code: 'valid-code' });
    const loginBody = login.body as { data: { accessToken: string } };

    const response = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${loginBody.data.accessToken}`);
    const body = response.body as {
      data: {
        userId: string;
        name: string;
        avatar: string;
        department: string[];
        isAdmin: boolean;
      };
    };

    expect(response.status).toBe(200);
    expect(body.data).toMatchObject({
      userId: 'admin-user',
      name: '寮犱笁',
      avatar: 'https://avatar.example.com/u.png',
      department: ['总经办'],
      isAdmin: true,
    });
  });

  it('returns corp and agent signatures', async () => {
    const login = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .get('/api/v1/auth/wecom/callback')
      .query({ code: 'valid-code' });
    const loginBody = login.body as { data: { accessToken: string } };

    const corpResponse = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .get('/api/v1/auth/jssdk/signature')
      .query({
        url: 'https://example.com/my?page=1',
        type: 'corp',
      })
      .set('Authorization', `Bearer ${loginBody.data.accessToken}`);

    const agentResponse = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .get('/api/v1/auth/jssdk/signature')
      .query({
        url: 'https://example.com/my?page=1',
        type: 'agent',
      })
      .set('Authorization', `Bearer ${loginBody.data.accessToken}`);
    const corpBody = corpResponse.body as { data: { signature: string } };
    const agentBody = agentResponse.body as { data: { signature: string } };

    expect(corpResponse.status).toBe(200);
    expect(corpBody.data.signature).toEqual(expect.any(String));
    expect(agentResponse.status).toBe(200);
    expect(agentBody.data.signature).toEqual(expect.any(String));
  });
});
