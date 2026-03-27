import type { CanActivate, ExecutionContext, INestApplication } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import request from 'supertest';
import { configureApp } from 'src/app.bootstrap';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { UserSettingsEntity } from 'src/database/entities/user-settings.entity';
import { SettingsModule } from 'src/modules/settings/settings.module';

const authGuard: CanActivate = {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<{ user?: unknown }>();
    req.user = {
      userId: 'u-settings',
      corpId: 'ww-test',
      name: 'User',
      avatar: null,
      departments: ['总经办'],
      position: '员工',
      roles: ['all_authenticated'],
      isAdmin: false,
    };
    return true;
  },
};

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqljs',
      autoSave: false,
      synchronize: true,
      entities: [UserSettingsEntity],
    }),
    SettingsModule,
  ],
})
class TestModule {}

describe('SettingsController integration', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [TestModule] })
      .overrideGuard(JwtAuthGuard)
      .useValue(authGuard)
      .compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('auto creates defaults and supports partial update', async () => {
    const getRes = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get('/api/v1/settings')
      .set('Authorization', 'Bearer token');
    expect(getRes.status).toBe(200);
    expect((getRes.body as { data: { reminderViewMode: string } }).data.reminderViewMode).toBe('dashboard');

    const patchRes = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .patch('/api/v1/settings')
      .set('Authorization', 'Bearer token')
      .send({ reminderViewMode: 'list', enablePushNotifications: false });
    expect(patchRes.status).toBe(200);

    const getAgain = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get('/api/v1/settings')
      .set('Authorization', 'Bearer token');
    expect((getAgain.body as { data: { reminderViewMode: string; certificateGroupBy: string; enablePushNotifications: boolean } }).data).toMatchObject({
      reminderViewMode: 'list',
      certificateGroupBy: 'owner',
      enablePushNotifications: false,
    });
  });
});
