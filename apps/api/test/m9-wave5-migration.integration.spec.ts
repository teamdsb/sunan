import { DataSource } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { resolve } from 'path';
import { of, throwError } from 'rxjs';

import { appEnv } from 'src/config/env';
import { WecomUserEntity } from 'src/database/entities/wecom-user.entity';
import { WecomNotificationConfigEntity } from 'src/database/entities/wecom-notification-config.entity';
import { WecomMessageDeliveryEntity } from 'src/database/entities/wecom-message-delivery.entity';
import { M9Wave2UserDirectory1710000027000 } from 'src/database/migrations/1710000027000-m9-wave2-user-directory';
import { AuthorizationService } from 'src/modules/auth/authorization.service';
import { RoleResolverService } from 'src/modules/auth/role-resolver.service';
import { WecomAdminService } from 'src/modules/wecom/wecom-admin.service';
import { WecomNotificationConfigService } from 'src/modules/wecom/wecom-notification-config.service';
import { WecomMessageService } from 'src/modules/wecom/wecom-message.service';
import { WecomTokenService } from 'src/modules/wecom/wecom-token.service';
import { bootstrapPgTestDatabase, buildPgTypeOrmOptions, shutdownPgTestDatabase } from 'test/pg-test-container';

// Frozen pre-M9 login expectations, rather than recomputing the expected result
// with the resolver under test. Department 8 intentionally has no shipping role.
const baseline = [
  { userId: 'legacy-office', ids: [3], names: ['总经办'], codes: ['general_office'], roles: ['general_office'] },
  { userId: 'legacy-finance', ids: [4], names: ['财务部'], codes: ['finance_dept'], roles: ['finance'] },
  { userId: 'legacy-business', ids: [5], names: ['业务部'], codes: ['business_dept'], roles: ['business'] },
  { userId: 'legacy-shipping', ids: [6], names: ['船务部'], codes: ['shipping_dept'], roles: ['shipping'] },
  { userId: 'legacy-logistics', ids: [7], names: ['后勤部'], codes: ['logistics_dept'], roles: ['logistics'] },
  { userId: 'legacy-crew', ids: [8], names: ['船员'], codes: ['shipping_dept'], roles: ['crew'] },
  { userId: 'legacy-position', ids: [1], names: ['公司成员'], codes: [], roles: ['crew'], position: '船长' },
  { userId: 'legacy-multi', ids: [4, 6], names: ['财务部', '船务部'], codes: ['finance_dept', 'shipping_dept'], roles: ['finance', 'shipping'] },
  { userId: 'legacy-unknown', ids: [99], names: ['未知部门'], codes: [], roles: [] },
  { userId: 'legacy-snapshot-admin', ids: [], names: [], codes: [], roles: [] },
];

describe('M9 Wave 5 synthetic legacy migration and rollback', () => {
  let source: DataSource;
  let authorization: AuthorizationService;
  let originalIds: Array<{ id: string; user_id: string }>;
  const originalAdmins = appEnv.WECOM_SYSTEM_ADMIN_USER_IDS;

  beforeAll(async () => {
    appEnv.WECOM_SYSTEM_ADMIN_USER_IDS = 'env-only-admin';
    await bootstrapPgTestDatabase();
    source = await new DataSource(buildPgTypeOrmOptions() as ConstructorParameters<typeof DataSource>[0]).initialize();
    // Use TypeORM's actual migration ledger, down to the pre-M9 schema.
    await source.undoLastMigration();
    await source.undoLastMigration();
    for (const row of baseline) {
      await source.query(`INSERT INTO wecom_users (user_id, corp_id, name, department_ids, department_names, department_codes, position, is_system_admin, raw_profile, created_at)
        VALUES ($1,$2,$1,$3,$4,$5,$6,$7,'{}','2020-01-01')`,
      [row.userId, appEnv.WECOM_CORP_ID, JSON.stringify(row.ids), JSON.stringify(row.names), JSON.stringify(row.codes), row.position ?? null, row.userId === 'legacy-snapshot-admin']);
    }
    originalIds = await source.query('SELECT id, user_id FROM wecom_users ORDER BY user_id');
    // The real settings association uses UserID, not a declared UUID FK.
    await source.query(`INSERT INTO user_settings (user_id) VALUES ('legacy-shipping')`);
    // Additionally exercise an enforced UUID FK without claiming it is production schema.
    await source.query(`CREATE TABLE m9_w5_synthetic_uuid_reference (user_uuid uuid REFERENCES wecom_users(id), snapshot jsonb NOT NULL)`);
    await source.query(`INSERT INTO m9_w5_synthetic_uuid_reference SELECT id, '{"department":"船务部","actor":"legacy-shipping"}' FROM wecom_users WHERE user_id='legacy-shipping'`);
    expect((await source.runMigrations()).map((migration) => migration.name)).toEqual([
      'M9Wave2UserDirectory1710000027000', 'M9Wave4Notifications1710000028000',
    ]);
    authorization = new AuthorizationService(source.getRepository(WecomUserEntity), source, new RoleResolverService(), new WecomAdminService());
  });

  afterAll(async () => {
    appEnv.WECOM_SYSTEM_ADMIN_USER_IDS = originalAdmins;
    await source?.destroy();
    await shutdownPgTestDatabase();
  });

  it('retains legacy role baselines, UUIDs, associations and unknown login facts on incremental migration', async () => {
    expect(await source.query('SELECT id, user_id FROM wecom_users ORDER BY user_id')).toEqual(originalIds);
    for (const row of baseline) {
      const user = await source.getRepository(WecomUserEntity).findOneByOrFail({ userId: row.userId });
      expect(user).toMatchObject({ departmentMode: 'follow_wecom', roleMode: 'auto', platformStatus: 'enabled', sourceStatus: 'unknown', loginStatus: 'unknown', lastLoginAt: null });
      expect((await authorization.toCurrentUser(user)).roles.sort()).toEqual(['all_authenticated', ...row.roles].sort());
    }
    expect(await source.query(`SELECT s.user_id, r.snapshot FROM user_settings s JOIN wecom_users u ON s.user_id=u.user_id JOIN m9_w5_synthetic_uuid_reference r ON r.user_uuid=u.id`)).toEqual([
      { user_id: 'legacy-shipping', snapshot: { department: '船务部', actor: 'legacy-shipping' } },
    ]);
    expect(await source.runMigrations()).toEqual([]);
    expect(await source.query('SELECT count(*)::int AS count FROM notification_app_configs')).toEqual([{ count: 0 }]);
  });

  it.each([
    ['manual empty roles', `UPDATE wecom_users SET role_mode='manual', manual_roles='[]' WHERE user_id='legacy-shipping'`],
    ['platform disabled', `UPDATE wecom_users SET platform_status='disabled' WHERE user_id='legacy-shipping'`],
    ['audit after restoring defaults', `INSERT INTO wecom_user_change_audits (user_id,corp_id,actor_user_id,source,action,reason) VALUES ('legacy-shipping','test','admin','admin','update','restore')`],
  ])('refuses destructive W2 down with %s before any DDL', async (_label, setup) => {
    const runner = source.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      await runner.query(setup);
      await expect(new M9Wave2UserDirectory1710000027000().down(runner)).rejects.toThrow('不能回滚 M9-W2');
      expect(await runner.query(`SELECT count(*)::int AS count FROM information_schema.columns WHERE table_name='wecom_users' AND column_name='authorization_version'`)).toEqual([{ count: 1 }]);
    } finally {
      await runner.rollbackTransaction();
      await runner.release();
    }
  });

  it('restores a real pg_dump with revoked permissions, separate keys, a fenced version and original send history', async () => {
    const previousKeys = { current: appEnv.SYSTEM_SETTINGS_ENCRYPTION_KEY, previous: appEnv.SYSTEM_SETTINGS_ENCRYPTION_KEY_PREVIOUS };
    const recoveryKey = 'synthetic-w5-recovery-key-000000000000000';
    const secret = 'synthetic-w5-independent-secret';
    appEnv.SYSTEM_SETTINGS_ENCRYPTION_KEY = recoveryKey;
    appEnv.SYSTEM_SETTINGS_ENCRYPTION_KEY_PREVIOUS = undefined;
    let restored: DataSource | undefined;
    try {
      const config = new WecomNotificationConfigService(source.getRepository(WecomNotificationConfigEntity), source);
      await config.save({ actorUserId: 'env-only-admin', expectedConfigVersion: 0, agentId: '2000001', secret });
      const post = jest.fn().mockReturnValue(of({ data: { errcode: 0, errmsg: 'ok' } }));
      const tokens = { getAccessTokenForApp: jest.fn().mockResolvedValue('synthetic-token') } as unknown as WecomTokenService;
      const makeMessages = (db: DataSource, service: WecomNotificationConfigService) => new WecomMessageService({ post } as unknown as HttpService, tokens, service, db.getRepository(WecomMessageDeliveryEntity), db);
      const payload = { userIds: ['legacy-shipping'], sourceType: 'w5-rehearsal', sourceId: 'synthetic', title: '合成演练', description: '不调用真实企微', url: 'https://example.com/my', dedupeKey: 'w5-success' };
      const messages = makeMessages(source, config);
      expect((await messages.sendTextCard(payload)).success).toBe(true);
      post.mockReturnValueOnce(throwError(() => ({ code: 'ECONNABORTED' })));
      expect((await messages.sendTextCard({ ...payload, dedupeKey: 'w5-uncertain' })).uncertain).toBe(true);
      await source.query(`UPDATE wecom_users SET role_mode='manual', manual_roles='[]', platform_status='disabled', authorization_version=2 WHERE user_id='legacy-shipping'`);

      const run = promisify(execFile);
      const port = (source.options as { port: number }).port;
      const { stdout } = await run('docker', ['ps', '--filter', `publish=${port}`, '--format', '{{.ID}}']);
      const containers = stdout.trim().split(/\s+/).filter(Boolean);
      expect(containers).toHaveLength(1);
      const container = containers[0];
      if (!container) throw new Error('Synthetic PostgreSQL container not found');
      const username = (source.options as { username: string }).username;
      const database = String(source.options.database);
      await run('docker', ['cp', resolve(__dirname, '../../../scripts/m9-preflight.sql'), `${container}:/tmp/m9-preflight.sql`]);
      const preflight = () => run('docker', ['exec', container, 'psql', '-X', '-U', username, '-d', database, '-v', 'ON_ERROR_STOP=1', '-v', `expected_corp_id=${appEnv.WECOM_CORP_ID}`, '-f', '/tmp/m9-preflight.sql']);
      expect((await preflight()).stdout).toContain('M9 identity preflight passed');
      await source.query(`UPDATE wecom_users SET corp_id='synthetic-wrong-corp' WHERE user_id='legacy-unknown'`);
      await expect(preflight()).rejects.toMatchObject({ code: 3 });
      await source.query(`UPDATE wecom_users SET corp_id=$1 WHERE user_id='legacy-unknown'`, [appEnv.WECOM_CORP_ID]);
      // Dump and key are deliberately separate: only synthetic ciphertext is in
      // this disposable container; the recovery key stays in process memory.
      await run('docker', ['exec', container, 'pg_dump', '-U', username, '-d', database, '-Fc', '-f', '/tmp/m9-w5.dump']);
      await config.save({ actorUserId: 'env-only-admin', expectedConfigVersion: 1, agentId: '2000002', secret: 'synthetic-new-secret' });
      const highWaterVersion = (await config.getView()).configVersion;
      await run('docker', ['exec', container, 'createdb', '-U', username, 'm9_w5_restore']);
      await run('docker', ['exec', container, 'pg_restore', '-U', username, '-d', 'm9_w5_restore', '--exit-on-error', '/tmp/m9-w5.dump']);
      restored = await new DataSource({ ...source.options, database: 'm9_w5_restore' } as ConstructorParameters<typeof DataSource>[0]).initialize();
      expect(await restored.runMigrations()).toEqual([]);
      const restoredConfig = new WecomNotificationConfigService(restored.getRepository(WecomNotificationConfigEntity), restored);
      appEnv.SYSTEM_SETTINGS_ENCRYPTION_KEY = 'synthetic-wrong-key-00000000000000000000';
      await expect(restoredConfig.resolve()).rejects.toThrow('无法解密');
      expect(await restoredConfig.getView()).toMatchObject({ configurationError: true, source: 'admin_override' });
      appEnv.SYSTEM_SETTINGS_ENCRYPTION_KEY = recoveryKey;
      expect(await restoredConfig.resolve()).toMatchObject({ secret, version: 1, agentId: '2000001' });
      // Traffic/workers remain stopped while advancing past every version that
      // could exist in live Redis. Never expose restored v1/v2 to senders.
      let view = await restoredConfig.getView();
      while (view.configVersion <= highWaterVersion) {
        view = await restoredConfig.save({ actorUserId: 'env-only-admin', expectedConfigVersion: view.configVersion, agentId: '2000001', secret });
      }
      expect(view.configVersion).toBe(3);
      const restoredAuthorization = new AuthorizationService(restored.getRepository(WecomUserEntity), restored, new RoleResolverService(), new WecomAdminService());
      const user = await restored.getRepository(WecomUserEntity).findOneByOrFail({ userId: 'legacy-shipping' });
      await expect(restoredAuthorization.toCurrentUser(user)).rejects.toThrow('平台账号已停用');
      expect((await restoredAuthorization.getEffectiveAuthorization(user, { ignoreAvailability: true })).roles).toEqual(['all_authenticated']);
      expect(user.id).toBe(originalIds.find((row) => row.user_id === 'legacy-shipping')?.id);
      const beforeCalls = post.mock.calls.length;
      const recoveredMessages = makeMessages(restored, restoredConfig);
      expect((await recoveredMessages.sendTextCard(payload)).success).toBe(true);
      expect((await recoveredMessages.sendTextCard({ ...payload, dedupeKey: 'w5-uncertain' })).uncertain).toBe(true);
      expect(post).toHaveBeenCalledTimes(beforeCalls);
      expect(await restored.query(`SELECT r.snapshot FROM m9_w5_synthetic_uuid_reference r JOIN wecom_users u ON u.id=r.user_uuid`)).toEqual([{ snapshot: { department: '船务部', actor: 'legacy-shipping' } }]);
    } finally {
      appEnv.SYSTEM_SETTINGS_ENCRYPTION_KEY = previousKeys.current;
      appEnv.SYSTEM_SETTINGS_ENCRYPTION_KEY_PREVIOUS = previousKeys.previous;
      await restored?.destroy();
    }
  });
});
