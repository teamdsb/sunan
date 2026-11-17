import { HttpService } from '@nestjs/axios';
import type { INestApplication } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { from, of, throwError } from 'rxjs';
import request from 'supertest';
import { DataSource } from 'typeorm';

import { configureApp } from 'src/app.bootstrap';
import { appEnv } from 'src/config/env';
import { WecomMessageDeliveryEntity } from 'src/database/entities/wecom-message-delivery.entity';
import { WecomNotificationConfigAuditEntity } from 'src/database/entities/wecom-notification-config-audit.entity';
import { WecomNotificationConfigEntity } from 'src/database/entities/wecom-notification-config.entity';
import { ProcurementOrderEntity } from 'src/database/entities/procurement-order.entity';
import { CertificateEntity } from 'src/database/entities/certificate.entity';
import { CertificateTypeEntity } from 'src/database/entities/certificate-type.entity';
import { CertificateReminderEntity } from 'src/database/entities/certificate-reminder.entity';
import { SafetyTaskEntity, SafetyTaskNotificationDeliveryEntity } from 'src/database/entities/safety-plan-task.entity';
import { WecomUserEntity } from 'src/database/entities/wecom-user.entity';
import { M9Wave4Notifications1710000028000 } from 'src/database/migrations/1710000028000-m9-wave4-notifications';
import { CertificateReminderJobService } from 'src/modules/reminder/certificate-reminder-job.service';
import { CertificateReminderEngineService } from 'src/modules/reminder/certificate-reminder-engine.service';
import { ReminderClockService } from 'src/modules/reminder/reminder-clock.service';
import { ReminderSchedulerService } from 'src/modules/reminder/reminder-scheduler.service';
import { PlanTaskSchedulerService } from 'src/modules/plan-task/plan-task-scheduler.service';
import { SettingsModule } from 'src/modules/settings/settings.module';
import { SettingsService } from 'src/modules/settings/settings.service';
import { WecomHttpGateway } from 'src/modules/wecom/wecom-http.gateway';
import { WecomMessageService } from 'src/modules/wecom/wecom-message.service';
import { WecomNotificationConfigService } from 'src/modules/wecom/wecom-notification-config.service';
import { WecomTokenService } from 'src/modules/wecom/wecom-token.service';
import { REDIS_CLIENT } from 'src/modules/wecom/wecom.constants';
import { bootstrapPgTestDatabase, buildPgTypeOrmOptions, shutdownPgTestDatabase } from 'test/pg-test-container';

@Module({ imports: [TypeOrmModule.forRootAsync({ useFactory: async () => { await bootstrapPgTestDatabase(); return buildPgTypeOrmOptions(); } }), SettingsModule] })
class NotificationTestModule {}

describe('M9 Wave 4 configuration and delivery integration', () => {
  let app: INestApplication;
  let source: DataSource;
  let config: WecomNotificationConfigService;
  let messages: WecomMessageService;
  let adminToken: string;
  let memberToken: string;
  const key = 'integration-settings-key-000000000000000';
  const secret = 'independent-notification-secret';
  const originalKeys = { current: appEnv.SYSTEM_SETTINGS_ENCRYPTION_KEY, previous: appEnv.SYSTEM_SETTINGS_ENCRYPTION_KEY_PREVIOUS, admins: appEnv.WECOM_SYSTEM_ADMIN_USER_IDS };
  const post = jest.fn(() => of({ data: { errcode: 0, errmsg: 'ok' } }));
  const tokens = { getAccessTokenForApp: jest.fn(async () => 'mock-access-token'), forceRefreshForApp: jest.fn(async () => undefined) };
  const gateway = { getAccessToken: jest.fn(async () => ({ access_token: 'draft-connection-token' })) };
  const baseMessage = { userIds: ['member'], title: 't', description: 'd', url: 'https://example.com/my', sourceType: 'settings_test', sourceId: 'member', dedupeKey: 'event-1' };
  const server = () => app.getHttpServer() as Parameters<typeof request>[0];
  const patchConfig = (body: Record<string, unknown>) => request(server()).patch('/api/v1/settings/notification').set('Authorization', `Bearer ${adminToken}`).send(body);

  beforeAll(async () => {
    appEnv.WECOM_SYSTEM_ADMIN_USER_IDS = 'admin';
    appEnv.SYSTEM_SETTINGS_ENCRYPTION_KEY = key;
    const moduleRef = await Test.createTestingModule({ imports: [NotificationTestModule] })
      .overrideProvider(REDIS_CLIENT).useValue({ get: jest.fn(), set: jest.fn(), del: jest.fn() })
      .overrideProvider(HttpService).useValue({ post })
      .overrideProvider(WecomTokenService).useValue(tokens)
      .overrideProvider(WecomHttpGateway).useValue(gateway)
      .overrideProvider(CertificateReminderJobService).useValue({})
      .overrideProvider(ReminderSchedulerService).useValue({})
      .overrideProvider(PlanTaskSchedulerService).useValue({})
      .compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    source = app.get(DataSource);
    config = app.get(WecomNotificationConfigService);
    messages = app.get(WecomMessageService);
    adminToken = app.get(JwtService).sign({ sub: 'admin', corpId: appEnv.WECOM_CORP_ID });
    memberToken = app.get(JwtService).sign({ sub: 'member', corpId: appEnv.WECOM_CORP_ID });
  });

  beforeEach(async () => {
    appEnv.SYSTEM_SETTINGS_ENCRYPTION_KEY = key;
    appEnv.SYSTEM_SETTINGS_ENCRYPTION_KEY_PREVIOUS = undefined;
    await source.query('TRUNCATE notification_app_configs, notification_app_config_audits, notification_delivery_attempts, procurement_orders, wecom_users, safety_plans, certificate_types CASCADE');
    const users = source.getRepository(WecomUserEntity);
    await users.save(['admin', 'member', 'other'].map((userId) => users.create({ userId, corpId: appEnv.WECOM_CORP_ID, name: userId, rawProfile: {}, sourceStatus: 'active', roleMode: 'manual', manualRoles: ['shipping'], departmentCodes: ['shipping_dept'], departmentNames: ['船务部'], departmentIds: [6] })));
    post.mockReset().mockReturnValue(of({ data: { errcode: 0, errmsg: 'ok' } }));
    tokens.getAccessTokenForApp.mockClear();
    gateway.getAccessToken.mockClear();
  });

  afterEach(() => { jest.restoreAllMocks(); });

  afterAll(async () => {
    appEnv.SYSTEM_SETTINGS_ENCRYPTION_KEY = originalKeys.current;
    appEnv.SYSTEM_SETTINGS_ENCRYPTION_KEY_PREVIOUS = originalKeys.previous;
    appEnv.WECOM_SYSTEM_ADMIN_USER_IDS = originalKeys.admins;
    await app?.close();
    await shutdownPgTestDatabase();
  });

  it('keeps complete env defaults, rejects partial/forged config, preserves blank Secret, and increments clear/restore versions', async () => {
    appEnv.SYSTEM_SETTINGS_ENCRYPTION_KEY = undefined;
    expect(await config.resolve()).toMatchObject({ source: 'env_main', agentId: appEnv.WECOM_AGENT_ID, secret: appEnv.WECOM_AGENT_SECRET });
    expect((await patchConfig({ expectedConfigVersion: 0, agentId: '2000001', secret })).status).toBe(503);
    appEnv.SYSTEM_SETTINGS_ENCRYPTION_KEY = key;
    expect((await patchConfig({ expectedConfigVersion: 0, agentId: '2000001' })).status).toBe(422);
    expect((await patchConfig({ expectedConfigVersion: 0, secret })).status).toBe(422);
    expect((await patchConfig({ expectedConfigVersion: 0, agentId: '2000001', secret, corpId: 'other-corp' })).status).toBe(400);
    expect((await request(server()).patch('/api/v1/settings/notification').set('Authorization', `Bearer ${memberToken}`).send({ expectedConfigVersion: 0, agentId: '2000001', secret })).status).toBe(403);
    const saved = await patchConfig({ expectedConfigVersion: 0, agentId: '2000001', secret });
    expect(saved.status).toBe(200);
    expect(JSON.stringify(saved.body)).not.toContain(secret);
    const cipher = (await source.getRepository(WecomNotificationConfigEntity).findOneByOrFail({ corpId: appEnv.WECOM_CORP_ID })).secretCiphertext;
    expect(cipher).toMatch(/^v2:/);
    expect(cipher).not.toContain(secret);
    expect((await patchConfig({ expectedConfigVersion: 1, agentId: '2000002' })).status).toBe(422);
    expect((await patchConfig({ expectedConfigVersion: 1, agentId: '2000001', secret: '' })).status).toBe(200);
    expect((await config.resolve()).secret).toBe(secret);
    expect((await patchConfig({ expectedConfigVersion: 2, clearOverride: true })).status).toBe(200);
    expect(await config.resolve()).toMatchObject({ source: 'env_main', version: 3, secret: appEnv.WECOM_AGENT_SECRET });
    expect((await patchConfig({ expectedConfigVersion: 3, agentId: '2000001', secret })).status).toBe(200);
    expect((await config.resolve()).version).toBe(4);
    expect(JSON.stringify(await source.getRepository(WecomNotificationConfigAuditEntity).find())).not.toContain(secret);
  });

  it('serializes simultaneous first writes across service instances and retains one credential group', async () => {
    const secondInstance = new WecomNotificationConfigService(source.getRepository(WecomNotificationConfigEntity), source);
    const results = await Promise.allSettled([
      config.save({ actorUserId: 'admin', expectedConfigVersion: 0, agentId: '2000001', secret: 'first-secret' }),
      secondInstance.save({ actorUserId: 'admin', expectedConfigVersion: 0, agentId: '2000002', secret: 'second-secret' }),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    const resolved = await secondInstance.resolve();
    expect(resolved.secret).toBe(resolved.agentId === '2000001' ? 'first-secret' : 'second-secret');
    expect(await source.getRepository(WecomNotificationConfigAuditEntity).count()).toBe(1);
  });

  it('rotates and restores keys without losing ciphertext or falling back on a wrong key', async () => {
    await config.save({ actorUserId: 'admin', expectedConfigVersion: 0, agentId: '2000001', secret });
    appEnv.SYSTEM_SETTINGS_ENCRYPTION_KEY_PREVIOUS = key;
    appEnv.SYSTEM_SETTINGS_ENCRYPTION_KEY = 'rotated-integration-key-111111111111111';
    expect((await config.resolve()).secret).toBe(secret);
    expect((await request(server()).post('/api/v1/settings/notification/encryption-key/rotate').set('Authorization', `Bearer ${adminToken}`)).status).toBe(201);
    appEnv.SYSTEM_SETTINGS_ENCRYPTION_KEY_PREVIOUS = undefined;
    expect(await config.resolve()).toMatchObject({ secret, version: 2 });
    appEnv.SYSTEM_SETTINGS_ENCRYPTION_KEY = key;
    await expect(config.resolve()).rejects.toThrow('通知应用 Secret 无法解密');
    await expect(config.getView()).resolves.toMatchObject({ configurationError: true, source: 'admin_override' });
  });

  it('claims a single external send across concurrent instances and does not resend success after configuration changes', async () => {
    const secondInstance = new WecomMessageService({ post } as unknown as HttpService, tokens as never, config, source.getRepository(WecomMessageDeliveryEntity), source);
    await Promise.all([messages.sendTextCard(baseMessage), secondInstance.sendTextCard(baseMessage)]);
    expect(post).toHaveBeenCalledTimes(1);
    await config.save({ actorUserId: 'admin', expectedConfigVersion: 0, agentId: '2000002', secret });
    await messages.sendTextCard(baseMessage);
    expect(post).toHaveBeenCalledTimes(1);
    expect(await source.getRepository(WecomMessageDeliveryEntity).findOneByOrFail({ dedupeKey: 'event-1:member' })).toMatchObject({ status: 'sent', configSource: 'env_main', configVersion: 0, attemptCount: 1 });
  });

  it('blocks unknown send results across application changes until a recorded manual reconciliation', async () => {
    post.mockReturnValueOnce(throwError(() => ({ code: 'ECONNABORTED', config: { url: 'sensitive-token' } })));
    expect((await messages.sendTextCard(baseMessage)).uncertain).toBe(true);
    const delivery = await source.getRepository(WecomMessageDeliveryEntity).findOneByOrFail({ dedupeKey: 'event-1:member' });
    await config.save({ actorUserId: 'admin', expectedConfigVersion: 0, agentId: '2000002', secret });
    expect((await messages.sendTextCard(baseMessage)).uncertain).toBe(true);
    expect(post).toHaveBeenCalledTimes(1);
    const reconciled = await request(server()).post(`/api/v1/settings/notification/deliveries/${delivery.id}/reconcile`).set('Authorization', `Bearer ${adminToken}`).send({ delivered: true });
    expect(reconciled.status).toBe(201);
    await messages.sendTextCard(baseMessage);
    expect(post).toHaveBeenCalledTimes(1);
    expect((await source.getRepository(WecomMessageDeliveryEntity).findOneByOrFail({ id: delivery.id })).attemptHistory).toEqual(expect.arrayContaining([expect.objectContaining({ reconciledBy: 'admin', status: 'sent' })]));
  });

  it('records config-read and invalid-recipient failures without exposing secrets or changing application silently', async () => {
    await config.save({ actorUserId: 'admin', expectedConfigVersion: 0, agentId: '2000001', secret });
    const repository = source.getRepository(WecomNotificationConfigEntity);
    const readFailure = jest.spyOn(repository, 'findOne').mockRejectedValueOnce(new Error('database disconnected'));
    expect((await messages.sendTextCard(baseMessage)).success).toBe(false);
    readFailure.mockRestore();
    expect(post).not.toHaveBeenCalled();
    expect(await source.getRepository(WecomMessageDeliveryEntity).findOneByOrFail({ dedupeKey: 'event-1:member' })).toMatchObject({ status: 'failed', configSource: 'unresolved' });
    post.mockReturnValueOnce(of({ data: { errcode: 0, errmsg: 'ok', invaliduser: 'member' } }));
    await messages.sendTextCard(baseMessage);
    const delivery = await source.getRepository(WecomMessageDeliveryEntity).findOneByOrFail({ dedupeKey: 'event-1:member' });
    expect(delivery).toMatchObject({ status: 'failed', configSource: 'admin_override', attemptCount: 2, agentId: '2000001' });
    expect(delivery.attemptHistory).toHaveLength(2);
    const response = await request(server()).get('/api/v1/settings/notification/deliveries').set('Authorization', `Bearer ${adminToken}`);
    expect(response.status).toBe(200);
    expect(JSON.stringify(response.body)).toContain(delivery.id);
    expect(JSON.stringify(response.body)).not.toContain(secret);
  });

  it('only sends a draft to the selected effective member and leaves the saved configuration unchanged', async () => {
    await config.save({ actorUserId: 'admin', expectedConfigVersion: 0, agentId: '2000001', secret });
    const before = await source.getRepository(WecomNotificationConfigEntity).findOneByOrFail({ corpId: appEnv.WECOM_CORP_ID });
    const response = await request(server()).post('/api/v1/settings/notification/draft-test').set('Authorization', `Bearer ${adminToken}`).send({ agentId: '2000002', secret: 'draft-secret', testUserId: 'member' });
    expect(response.status).toBe(201);
    expect(post).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ touser: 'member', agentid: 2000002 }), expect.anything());
    expect(tokens.getAccessTokenForApp).toHaveBeenCalledWith(expect.objectContaining({ secret: 'draft-secret', cacheKey: expect.any(String) }));
    expect(await source.getRepository(WecomNotificationConfigEntity).findOneByOrFail({ id: before.id })).toEqual(before);
    await source.getRepository(WecomUserEntity).update({ userId: 'member' }, { platformStatus: 'disabled' });
    const blocked = await request(server()).post('/api/v1/settings/notification/draft-test').set('Authorization', `Bearer ${adminToken}`).send({ testUserId: 'member' });
    expect(blocked.status).toBe(403);
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('rejects retry to an available member who has lost the procurement approval role', async () => {
    const orders = source.getRepository(ProcurementOrderEntity);
    const order = await orders.save(orders.create({ orderNo: 'W4-ORDER', title: 'private order', summary: '', amount: 100, departmentCode: 'shipping_dept', status: 'submitted', submittedAt: new Date(), createdBy: 'other', updatedBy: 'other' }));
    const dedupeKey = `procurement-order:${order.id}:pending:dept:cycle-${order.submittedAt!.getTime()}`;
    post.mockReturnValueOnce(of({ data: { errcode: 45009, errmsg: 'quota' } }));
    await messages.sendTextCard({ ...baseMessage, sourceType: 'procurement', sourceId: order.id, dedupeKey });
    const delivery = await source.getRepository(WecomMessageDeliveryEntity).findOneByOrFail({ dedupeKey: `${dedupeKey}:member` });
    await source.getRepository(WecomUserEntity).update({ userId: 'member' }, { manualRoles: [], departmentMode: 'manual', manualDepartmentIds: [] });
    const response = await request(server()).post(`/api/v1/settings/notification/deliveries/${delivery.id}/retry`).set('Authorization', `Bearer ${adminToken}`);
    expect(response.status).toBe(409);
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('uses effective approval roles across departments and sends a new pending notification after return and resubmit', async () => {
    await source.getRepository(WecomUserEntity).update({ userId: 'member' }, { departmentMode: 'manual', manualDepartmentIds: [] });
    await source.getRepository(WecomUserEntity).update({ userId: 'other' }, { manualRoles: [] });
    const orders = source.getRepository(ProcurementOrderEntity);
    const order = await orders.save(orders.create({ orderNo: 'W4-RESUBMIT', title: 'role-scoped order', summary: '', amount: 100, departmentCode: 'shipping_dept', status: 'draft', createdBy: 'member', updatedBy: 'member' }));
    const submit = await request(server()).post(`/api/v1/procurement/orders/${order.id}/submit`).set('Authorization', `Bearer ${memberToken}`);
    expect(submit.status).toBe(201);
    const calls = post.mock.calls as unknown as Array<[string, { touser: string }]>;
    const firstRecipients = calls[0]?.[1];
    if (!firstRecipients) throw new Error('expected a procurement message');
    expect(firstRecipients.touser.split('|')).toContain('member');
    expect(firstRecipients.touser.split('|')).not.toContain('other');
    const returned = await request(server()).post(`/api/v1/procurement/orders/${order.id}/approvals/actions`).set('Authorization', `Bearer ${adminToken}`).send({ action: 'return', source: 'internal', comment: 'revise' });
    expect(returned.status).toBe(201);
    const resubmit = await request(server()).post(`/api/v1/procurement/orders/${order.id}/resubmit`).set('Authorization', `Bearer ${memberToken}`);
    expect(resubmit.status).toBe(201);
    const deliveries = await source.getRepository(WecomMessageDeliveryEntity).findBy({ sourceId: order.id, recipientUserId: 'member' });
    const pending = deliveries.filter((row) => row.dedupeKey.includes(':pending:'));
    expect(pending).toHaveLength(2);
    expect(pending.every((row) => row.status === 'sent')).toBe(true);
    expect(new Set(pending.map((row) => row.dedupeKey)).size).toBe(2);
  });

  it('refuses destructive down migrations after configuration history exists', async () => {
    await config.save({ actorUserId: 'admin', expectedConfigVersion: 0, clearOverride: true });
    const runner = source.createQueryRunner();
    try { await expect(new M9Wave4Notifications1710000028000().down(runner)).rejects.toThrow('通知覆盖或投递记录仍存在'); } finally { await runner.release(); }
    expect(await source.getRepository(WecomNotificationConfigAuditEntity).count()).toBe(1);
  });

  async function certificateReminderFixture() {
    const types = source.getRepository(CertificateTypeEntity);
    const code = randomUUID();
    const type = await types.save(types.create({ code, name: code, ownerScope: 'mixed', reminderCategory: 'certificate', defaultAdvanceDays: 30 }));
    const certificates = source.getRepository(CertificateEntity);
    const certificate = await certificates.save(certificates.create({ certificateTypeId: type.id, ownerType: 'vessel', ownerId: randomUUID(), title: 'W4 certificate', expiryDate: '2099-12-01', advanceDays: 30, reminderEnabled: true, reminderRecipientUserId: 'member', createdBy: 'admin', updatedBy: 'admin' }));
    const reminders = source.getRepository(CertificateReminderEntity);
    return reminders.save(reminders.create({ certificateId: certificate.id, certificateTypeId: type.id, certificateTypeName: type.name, certificateTitle: certificate.title, certificateExpiryDate: certificate.expiryDate, ownerType: 'vessel', ownerId: certificate.ownerId, ownerName: 'W4 synthetic vessel', recipientUserId: 'member', reminderType: 'upcoming', status: 'uncertain', scheduledDate: '2099-11-17', daysBeforeExpiry: 14 }));
  }

  it.each([true, false])('preserves certificate acknowledgement when an administrator reconciles delivered=%s', async (delivered) => {
    const reminder = await certificateReminderFixture();
    const dedupeKey = `certificate-reminder:${reminder.id}`;
    post.mockReturnValueOnce(throwError(() => new Error('request timeout')));
    await messages.sendTextCard({ ...baseMessage, sourceType: 'certificate_reminder', sourceId: reminder.id, dedupeKey });
    const acknowledged = await request(server()).post(`/api/v1/certificate-reminders/${reminder.id}/acknowledge`).set('Authorization', `Bearer ${memberToken}`).send({});
    expect(acknowledged.status).toBe(200);
    const delivery = await source.getRepository(WecomMessageDeliveryEntity).findOneByOrFail({ sourceId: reminder.id });
    const reconciled = await request(server()).post(`/api/v1/settings/notification/deliveries/${delivery.id}/reconcile`).set('Authorization', `Bearer ${adminToken}`).send({ delivered });
    expect(reconciled.status).toBe(201);
    expect((await source.getRepository(CertificateReminderEntity).findOneByOrFail({ id: reminder.id })).status).toBe('acknowledged');
    if (!delivered) {
      const retry = await request(server()).post(`/api/v1/settings/notification/deliveries/${delivery.id}/retry`).set('Authorization', `Bearer ${adminToken}`);
      expect(retry.status).toBe(409);
    }
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('keeps a concurrent certificate acknowledgement when a retry completes', async () => {
    const reminder = await certificateReminderFixture();
    await source.getRepository(CertificateReminderEntity).update(reminder.id, { status: 'failed' });
    post.mockReturnValueOnce(of({ data: { errcode: 45009, errmsg: 'quota' } }));
    await messages.sendTextCard({ ...baseMessage, sourceType: 'certificate_reminder', sourceId: reminder.id, dedupeKey: `certificate-reminder:${reminder.id}` });
    const delivery = await source.getRepository(WecomMessageDeliveryEntity).findOneByOrFail({ sourceId: reminder.id });
    post.mockImplementationOnce(() => from(source.getRepository(CertificateReminderEntity).update(reminder.id, { status: 'acknowledged', acknowledgedBy: 'member', acknowledgedAt: new Date() }).then(() => ({ data: { errcode: 0, errmsg: 'ok' } }))));
    const retry = await request(server()).post(`/api/v1/settings/notification/deliveries/${delivery.id}/retry`).set('Authorization', `Bearer ${adminToken}`);
    expect(retry.status).toBe(201);
    expect((await source.getRepository(CertificateReminderEntity).findOneByOrFail({ id: reminder.id })).status).toBe('acknowledged');
  });

  it('sends future task assignments and does not let a concurrent retry overwrite the successful business delivery', async () => {
    await source.query(`INSERT INTO personnel (wecom_user_id,name,department_code,employment_status,is_sync_from_wecom) VALUES ('admin','W4 Admin','shipping','active',true), ('member','W4 Member','shipping','active',true) ON CONFLICT (wecom_user_id) WHERE deleted_at IS NULL AND wecom_user_id IS NOT NULL DO UPDATE SET employment_status='active', deleted_at=NULL`);
    const auth = { Authorization: `Bearer ${adminToken}` };
    const plan = await request(server()).post('/api/v1/plans').set(auth).send({ title: 'future W4 plan', planType: 'one_time', timeZone: 'Asia/Shanghai' });
    expect(plan.status).toBe(201);
    const planId = (plan.body as { data: { id: string } }).data.id;
    const item = await request(server()).post(`/api/v1/plans/${planId}/items`).set(auth).send({ title: 'future W4 task', responsibleUserId: 'member', participantUserIds: [], completionRule: 'all', dueOffsetMinutes: 60, recurrence: { kind: 'one_time', startAt: '2099-11-18T09:00:00+08:00' } });
    expect(item.status).toBe(201);
    expect((await request(server()).post(`/api/v1/plans/${planId}/actions`).set(auth).send({ actionType: 'activate' })).status).toBe(200);
    post.mockReturnValueOnce(of({ data: { errcode: 45009, errmsg: 'quota' } }));
    const generated = await request(server()).post(`/api/v1/plans/${planId}/generation-runs`).set(auth).set('Idempotency-Key', randomUUID()).send({ windowStart: '2099-11-18T00:00:00+08:00', windowEnd: '2099-11-19T00:00:00+08:00' });
    expect(generated.status).toBe(202);
    expect(post).toHaveBeenCalledTimes(1);
    const task = await source.getRepository(SafetyTaskEntity).findOneByOrFail({ planId });
    const business = await source.getRepository(SafetyTaskNotificationDeliveryEntity).findOneByOrFail({ taskId: task.id });
    expect(business.status).toBe('failed');
    const delivery = await source.getRepository(WecomMessageDeliveryEntity).findOneByOrFail({ sourceId: business.id });
    let finish!: () => void;
    let started!: () => void;
    const sending = new Promise<void>((resolve) => { started = resolve; });
    const complete = new Promise<void>((resolve) => { finish = resolve; });
    post.mockImplementationOnce(() => { started(); return from(complete.then(() => ({ data: { errcode: 0, errmsg: 'ok' } }))); });
    const sendOriginal = messages.sendTextCard.bind(messages);
    let entered = 0;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const sendSpy = jest.spyOn(messages, 'sendTextCard').mockImplementation(async (options) => {
      entered += 1;
      if (entered === 2) release();
      await gate;
      return sendOriginal(options);
    });
    const settings = app.get(SettingsService);
    const first = settings.retryNotificationDelivery(delivery.id, 'admin');
    const second = settings.retryNotificationDelivery(delivery.id, 'admin');
    try {
      await sending;
      expect((await Promise.race([first, second])).inFlight).toBe(true);
    } finally {
      finish();
      release();
      await Promise.allSettled([first, second]);
      sendSpy.mockRestore();
    }
    expect((await source.getRepository(SafetyTaskNotificationDeliveryEntity).findOneByOrFail({ id: business.id })).status).toBe('sent');
    expect(post).toHaveBeenCalledTimes(2);
  });

  it('retains a full existing 255-character business key with a 64-character recipient', async () => {
    const userId = 'u'.repeat(64);
    expect((await messages.sendTextCard({ ...baseMessage, userIds: [userId], dedupeKey: 'k'.repeat(255) })).success).toBe(true);
    expect(await source.getRepository(WecomMessageDeliveryEntity).countBy({ recipientUserId: userId, status: 'sent' })).toBe(1);
  });

  it('preserves an acknowledgement made while the initial certificate send is in progress', async () => {
    const reminder = await certificateReminderFixture();
    await source.getRepository(CertificateReminderEntity).delete(reminder.id);
    const clock = app.get(ReminderClockService);
    const now = jest.spyOn(clock, 'now').mockReturnValue(new Date('2099-11-17T01:00:00.000Z'));
    post.mockImplementationOnce(() => from((async () => {
      const current = await source.getRepository(CertificateReminderEntity).findOneByOrFail({ certificateId: reminder.certificateId });
      await source.getRepository(CertificateReminderEntity).update(current.id, { status: 'acknowledged', acknowledgedBy: 'member', acknowledgedAt: new Date() });
      throw new Error('response lost after recipient acknowledgement');
    })()));
    try {
      await app.get(CertificateReminderEngineService).runScan({ jobId: randomUUID(), source: 'manual' });
      const current = await source.getRepository(CertificateReminderEntity).findOneByOrFail({ certificateId: reminder.certificateId });
      expect(current.status).toBe('acknowledged');
      expect(current.acknowledgedBy).toBe('member');
      expect((await source.getRepository(WecomMessageDeliveryEntity).findOneByOrFail({ sourceId: current.id })).status).toBe('uncertain');
    } finally { now.mockRestore(); }
  });
});
