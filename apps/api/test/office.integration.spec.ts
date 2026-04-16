import type { CanActivate, ExecutionContext, INestApplication } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { configureApp } from 'src/app.bootstrap';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { OfficeEntryAuditEntity } from 'src/database/entities/office-entry-audit.entity';
import { OfficeEntryEntity } from 'src/database/entities/office-entry.entity';
import { OfficeModule } from 'src/modules/office/office.module';
import { bootstrapPgTestDatabase, buildPgTypeOrmOptions, shutdownPgTestDatabase } from 'test/pg-test-container';

let currentUser = {
  userId: 'office-manager',
  corpId: 'ww-test',
  name: 'Office Manager',
  avatar: null,
  departments: ['总经办'],
  position: '主任',
  roles: ['all_authenticated', 'general_office'],
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
    OfficeModule,
  ],
})
class TestModule {}

describe('OfficeController integration', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let publishedEntryId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [TestModule] })
      .overrideGuard(JwtAuthGuard)
      .useValue(authGuard)
      .compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    dataSource = moduleRef.get(DataSource);
    const entryRepository = dataSource.getRepository(OfficeEntryEntity);
    publishedEntryId = (
      await entryRepository.save(
        entryRepository.create({
          categoryCode: 'maritime',
          title: '海事入口',
          summary: '海事办理说明',
          iconType: 'maritime',
          targetType: 'external_url',
          targetValue: 'https://office.example.com/maritime',
          openMode: 'current_webview',
          visibilityRoles: ['all_authenticated'],
          managerRoles: ['shipping', 'general_office'],
          sortOrder: 10,
          status: 'published',
          createdBy: 'seed-user',
          updatedBy: 'seed-user',
        }),
      )
    ).id;

    await entryRepository.save(
      entryRepository.create({
        categoryCode: 'customs',
        title: '草稿海关入口',
        summary: '草稿数据',
        iconType: 'customs',
        targetType: 'external_url',
        targetValue: 'https://office.example.com/customs',
        openMode: 'new_window',
        visibilityRoles: ['all_authenticated'],
        managerRoles: ['business', 'general_office'],
        sortOrder: 20,
        status: 'draft',
        createdBy: 'seed-user',
        updatedBy: 'seed-user',
      }),
    );
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    await shutdownPgTestDatabase();
  });

  it('lists enabled categories and only published visible entries', async () => {
    const categories = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get('/api/v1/office/categories')
      .set('Authorization', 'Bearer token');
    expect(categories.status).toBe(200);
    expect((categories.body as { data: Array<{ code: string }> }).data).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'maritime' })]),
    );

    const entries = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get('/api/v1/office/entries')
      .set('Authorization', 'Bearer token');
    expect(entries.status).toBe(200);
    expect((entries.body as { data: Array<{ title: string }> }).data).toHaveLength(1);
    expect((entries.body as { data: Array<{ title: string }> }).data[0]?.title).toBe('海事入口');
  });

  it('creates, publishes, disables and audits office entries for category managers', async () => {
    const createResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/v1/office/admin/entries')
      .set('Authorization', 'Bearer token')
      .send({
        categoryCode: 'maritime',
        title: '新海事入口',
        summary: '用于测试的入口',
        iconType: 'maritime',
        targetType: 'internal_route',
        targetValue: '/office/search?keyword=test',
        openMode: 'current_webview',
        visibilityRoles: ['all_authenticated'],
        sortOrder: 30,
      });
    expect(createResponse.status).toBe(201);
    const createdId = (createResponse.body as { data: { id: string } }).data.id;

    const publishResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post(`/api/v1/office/admin/entries/${createdId}/publish`)
      .set('Authorization', 'Bearer token');
    expect(publishResponse.status).toBe(201);
    expect((publishResponse.body as { data: { status: string } }).data.status).toBe('published');

    const disableResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post(`/api/v1/office/admin/entries/${createdId}/disable`)
      .set('Authorization', 'Bearer token');
    expect(disableResponse.status).toBe(201);
    expect((disableResponse.body as { data: { status: string } }).data.status).toBe('disabled');

    const auditRepository = dataSource.getRepository(OfficeEntryAuditEntity);
    const audits = await auditRepository.find({ where: { entryId: createdId } });
    expect(audits.map((audit) => audit.action)).toEqual(expect.arrayContaining(['create', 'publish', 'disable']));
  });

  it('records open audit and returns launch payload', async () => {
    const response = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post(`/api/v1/office/entries/${publishedEntryId}/open`)
      .set('Authorization', 'Bearer token');
    expect(response.status).toBe(201);
    expect((response.body as { data: { targetValue: string } }).data.targetValue).toBe('https://office.example.com/maritime');

    const auditRepository = dataSource.getRepository(OfficeEntryAuditEntity);
    const openAudit = await auditRepository.findOne({ where: { entryId: publishedEntryId, action: 'open' } });
    expect(openAudit).not.toBeNull();
  });

  it('rejects cross-category management and invalid urls', async () => {
    currentUser = {
      ...currentUser,
      userId: 'shipping-manager',
      roles: ['all_authenticated', 'shipping'],
      departments: ['船务部'],
    };

    const forbiddenResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/v1/office/admin/entries')
      .set('Authorization', 'Bearer token')
      .send({
        categoryCode: 'customs',
        title: '越权海关入口',
        summary: '越权创建',
        iconType: 'customs',
        targetType: 'external_url',
        targetValue: 'https://office.example.com/customs',
        openMode: 'current_webview',
        visibilityRoles: ['all_authenticated'],
      });
    expect(forbiddenResponse.status).toBe(403);

    const invalidUrlResponse = await request(app.getHttpServer() as Parameters<typeof request>[0])
      .post('/api/v1/office/admin/entries')
      .set('Authorization', 'Bearer token')
      .send({
        categoryCode: 'maritime',
        title: '非法地址入口',
        summary: '非法地址',
        iconType: 'maritime',
        targetType: 'external_url',
        targetValue: 'http://127.0.0.1/internal',
        openMode: 'current_webview',
        visibilityRoles: ['all_authenticated'],
      });
    expect(invalidUrlResponse.status).toBe(400);

    currentUser = {
      ...currentUser,
      userId: 'office-manager',
      roles: ['all_authenticated', 'general_office'],
      departments: ['总经办'],
    };
  });
});
