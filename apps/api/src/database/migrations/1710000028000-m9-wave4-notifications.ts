import { MigrationInterface, QueryRunner } from 'typeorm';

export class M9Wave4Notifications1710000028000 implements MigrationInterface {
  name = 'M9Wave4Notifications1710000028000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE notification_app_configs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        corp_id varchar(64) NOT NULL,
        agent_id varchar(32),
        secret_ciphertext text,
        config_version integer NOT NULL DEFAULT 0 CHECK (config_version >= 0),
        updated_by varchar(64),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT ck_wecom_notification_config_complete CHECK ((agent_id IS NULL) = (secret_ciphertext IS NULL))
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX uq_notification_app_configs_corp ON notification_app_configs(corp_id)`);
    await queryRunner.query(`
      CREATE TABLE notification_app_config_audits (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        corp_id varchar(64) NOT NULL,
        actor_user_id varchar(64) NOT NULL,
        action varchar(16) NOT NULL CHECK (action IN ('save','clear','rotate')),
        config_version integer NOT NULL,
        before_snapshot jsonb NOT NULL DEFAULT '{}',
        after_snapshot jsonb NOT NULL DEFAULT '{}',
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_notification_app_config_audits_corp_created ON notification_app_config_audits(corp_id, created_at)`);
    await queryRunner.query(`
      CREATE TABLE notification_delivery_attempts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        source_type varchar(32) NOT NULL,
        source_id varchar(128) NOT NULL,
        recipient_user_id varchar(64) NOT NULL,
        dedupe_key varchar(320) NOT NULL,
        payload_snapshot jsonb NOT NULL DEFAULT '{}',
        agent_id varchar(32),
        config_source varchar(16) NOT NULL CHECK (config_source IN ('env_main','admin_override','test_draft','unresolved')),
        config_version integer,
        status varchar(16) NOT NULL DEFAULT 'sending' CHECK (status IN ('sending','sent','failed','uncertain','skipped')),
        attempt_count integer NOT NULL DEFAULT 0,
        attempt_history jsonb NOT NULL DEFAULT '[]',
        wecom_errcode integer,
        failure_reason text,
        sent_at timestamptz,
        reconciled_by varchar(64),
        reconciled_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX uq_notification_delivery_attempts_dedupe ON notification_delivery_attempts(dedupe_key)`);
    await queryRunner.query(`CREATE INDEX idx_notification_delivery_attempts_status_updated ON notification_delivery_attempts(status, updated_at)`);
    await queryRunner.query(`ALTER TABLE safety_task_notification_deliveries DROP CONSTRAINT IF EXISTS safety_task_notification_deliveries_status_check`);
    await queryRunner.query(`ALTER TABLE safety_task_notification_deliveries ADD CONSTRAINT safety_task_notification_deliveries_status_check CHECK (status IN ('queued','dispatching','sent','failed','skipped','uncertain'))`);
    await queryRunner.query(`ALTER TABLE certificate_reminders DROP CONSTRAINT IF EXISTS certificate_reminders_status_check`);
    await queryRunner.query(`ALTER TABLE certificate_reminders ADD CONSTRAINT certificate_reminders_status_check CHECK (status IN ('pending','dispatching','sent','acknowledged','failed','resolved','uncertain'))`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const notificationDataResult: unknown = await queryRunner.query(`SELECT EXISTS (SELECT 1 FROM notification_app_configs) AS configs, EXISTS (SELECT 1 FROM notification_app_config_audits) AS audits, EXISTS (SELECT 1 FROM notification_delivery_attempts) AS deliveries`);
    const notificationData = (Array.isArray(notificationDataResult) ? notificationDataResult : []) as Array<Record<string, unknown>>;
    const firstRow = notificationData[0] ?? {};
    if ([firstRow.configs, firstRow.audits, firstRow.deliveries].some((value) => value === true || value === 't')) {
      throw new Error('通知覆盖或投递记录仍存在；请先完成配置恢复和记录归档后再回滚 M9-W4 migration');
    }
    await queryRunner.query(`ALTER TABLE certificate_reminders DROP CONSTRAINT IF EXISTS certificate_reminders_status_check`);
    await queryRunner.query(`ALTER TABLE certificate_reminders ADD CONSTRAINT certificate_reminders_status_check CHECK (status IN ('pending','dispatching','sent','acknowledged','failed','resolved'))`);
    await queryRunner.query(`ALTER TABLE safety_task_notification_deliveries DROP CONSTRAINT IF EXISTS safety_task_notification_deliveries_status_check`);
    await queryRunner.query(`ALTER TABLE safety_task_notification_deliveries ADD CONSTRAINT safety_task_notification_deliveries_status_check CHECK (status IN ('queued','dispatching','sent','failed','skipped'))`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_notification_delivery_attempts_status_updated`);
    await queryRunner.query(`DROP TABLE IF EXISTS notification_delivery_attempts`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_notification_app_config_audits_corp_created`);
    await queryRunner.query(`DROP TABLE IF EXISTS notification_app_config_audits`);
    await queryRunner.query(`DROP INDEX IF EXISTS uq_notification_app_configs_corp`);
    await queryRunner.query(`DROP TABLE IF EXISTS notification_app_configs`);
  }
}
