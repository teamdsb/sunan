import type { MigrationInterface, QueryRunner } from 'typeorm';

export class M9Wave2UserDirectory1710000027000 implements MigrationInterface {
  name = 'M9Wave2UserDirectory1710000027000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SEQUENCE IF NOT EXISTS "wecom_source_revision_seq" AS BIGINT START WITH 1 INCREMENT BY 1`);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "wecom_departments" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "corp_id" VARCHAR(64) NOT NULL,
        "wecom_department_id" INTEGER NOT NULL,
        "parent_id" INTEGER,
        "name" VARCHAR(128) NOT NULL,
        "source_revision" BIGINT NOT NULL DEFAULT 0,
        "last_sync_batch_id" UUID,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_wecom_departments_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_wecom_departments_corp_department" UNIQUE ("corp_id", "wecom_department_id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "wecom_directory_sync_batches" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "corp_id" VARCHAR(64) NOT NULL,
        "triggered_by" VARCHAR(64) NOT NULL,
        "source_revision" BIGINT NOT NULL,
        "status" VARCHAR(16) NOT NULL DEFAULT 'running',
        "coverage_status" VARCHAR(24) NOT NULL DEFAULT 'unverified',
        "coverage_note" TEXT,
        "started_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "finished_at" TIMESTAMPTZ,
        "read_count" INTEGER NOT NULL DEFAULT 0,
        "created_count" INTEGER NOT NULL DEFAULT 0,
        "updated_count" INTEGER NOT NULL DEFAULT 0,
        "failed_count" INTEGER NOT NULL DEFAULT 0,
        "error_summary" JSONB NOT NULL DEFAULT '[]'::jsonb,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_wecom_directory_sync_batches_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "wecom_user_change_audits" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "user_id" VARCHAR(64) NOT NULL,
        "corp_id" VARCHAR(64) NOT NULL,
        "actor_user_id" VARCHAR(64) NOT NULL,
        "source" VARCHAR(16) NOT NULL,
        "action" VARCHAR(32) NOT NULL,
        "reason" TEXT,
        "before_snapshot" JSONB NOT NULL DEFAULT '{}'::jsonb,
        "after_snapshot" JSONB NOT NULL DEFAULT '{}'::jsonb,
        "authorization_version" BIGINT,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_wecom_user_change_audits_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`ALTER TABLE "wecom_users" ADD COLUMN IF NOT EXISTS "source_status" VARCHAR(16) NOT NULL DEFAULT 'unknown'`);
    await queryRunner.query(`ALTER TABLE "wecom_users" ADD COLUMN IF NOT EXISTS "source_status_updated_at" TIMESTAMPTZ`);
    await queryRunner.query(`ALTER TABLE "wecom_users" ADD COLUMN IF NOT EXISTS "last_login_at" TIMESTAMPTZ`);
    await queryRunner.query(`ALTER TABLE "wecom_users" ADD COLUMN IF NOT EXISTS "login_status" VARCHAR(16) NOT NULL DEFAULT 'unknown'`);
    await queryRunner.query(`ALTER TABLE "wecom_users" ADD COLUMN IF NOT EXISTS "last_sync_at" TIMESTAMPTZ`);
    await queryRunner.query(`ALTER TABLE "wecom_users" ADD COLUMN IF NOT EXISTS "source_revision" BIGINT NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "wecom_users" ADD COLUMN IF NOT EXISTS "source_batch_id" UUID`);
    await queryRunner.query(`ALTER TABLE "wecom_users" ADD COLUMN IF NOT EXISTS "platform_status" VARCHAR(16) NOT NULL DEFAULT 'enabled'`);
    await queryRunner.query(`ALTER TABLE "wecom_users" ADD COLUMN IF NOT EXISTS "platform_status_reason" TEXT`);
    await queryRunner.query(`ALTER TABLE "wecom_users" ADD COLUMN IF NOT EXISTS "platform_status_changed_at" TIMESTAMPTZ`);
    await queryRunner.query(`ALTER TABLE "wecom_users" ADD COLUMN IF NOT EXISTS "department_mode" VARCHAR(16) NOT NULL DEFAULT 'follow_wecom'`);
    await queryRunner.query(`ALTER TABLE "wecom_users" ADD COLUMN IF NOT EXISTS "manual_department_ids" JSONB NOT NULL DEFAULT '[]'::jsonb`);
    await queryRunner.query(`ALTER TABLE "wecom_users" ADD COLUMN IF NOT EXISTS "role_mode" VARCHAR(16) NOT NULL DEFAULT 'auto'`);
    await queryRunner.query(`ALTER TABLE "wecom_users" ADD COLUMN IF NOT EXISTS "manual_roles" JSONB NOT NULL DEFAULT '[]'::jsonb`);
    await queryRunner.query(`ALTER TABLE "wecom_users" ADD COLUMN IF NOT EXISTS "authorization_version" BIGINT NOT NULL DEFAULT 1`);
    await queryRunner.query(`ALTER TABLE "wecom_users" DROP CONSTRAINT IF EXISTS "CK_wecom_users_source_status"`);
    await queryRunner.query(`ALTER TABLE "wecom_users" ADD CONSTRAINT "CK_wecom_users_source_status" CHECK ("source_status" IN ('active', 'inactive', 'unknown'))`);
    await queryRunner.query(`ALTER TABLE "wecom_users" DROP CONSTRAINT IF EXISTS "CK_wecom_users_login_status"`);
    await queryRunner.query(`ALTER TABLE "wecom_users" ADD CONSTRAINT "CK_wecom_users_login_status" CHECK ("login_status" IN ('unknown', 'never', 'logged_in'))`);
    await queryRunner.query(`ALTER TABLE "wecom_users" DROP CONSTRAINT IF EXISTS "CK_wecom_users_platform_status"`);
    await queryRunner.query(`ALTER TABLE "wecom_users" ADD CONSTRAINT "CK_wecom_users_platform_status" CHECK ("platform_status" IN ('enabled', 'disabled'))`);
    await queryRunner.query(`ALTER TABLE "wecom_users" DROP CONSTRAINT IF EXISTS "CK_wecom_users_department_mode"`);
    await queryRunner.query(`ALTER TABLE "wecom_users" ADD CONSTRAINT "CK_wecom_users_department_mode" CHECK ("department_mode" IN ('follow_wecom', 'manual'))`);
    await queryRunner.query(`ALTER TABLE "wecom_users" DROP CONSTRAINT IF EXISTS "CK_wecom_users_role_mode"`);
    await queryRunner.query(`ALTER TABLE "wecom_users" ADD CONSTRAINT "CK_wecom_users_role_mode" CHECK ("role_mode" IN ('auto', 'manual'))`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_wecom_users_platform_status" ON "wecom_users" ("platform_status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_wecom_users_source_status" ON "wecom_users" ("source_status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_wecom_users_last_login_at" ON "wecom_users" ("last_login_at")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_wecom_directory_sync_batches_status_created_at" ON "wecom_directory_sync_batches" ("status", "created_at")`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "uq_wecom_directory_sync_batches_running_corp" ON "wecom_directory_sync_batches" ("corp_id") WHERE "status" = 'running'`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_wecom_user_change_audits_user_created_at" ON "wecom_user_change_audits" ("user_id", "created_at")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_wecom_user_change_audits_user_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_wecom_directory_sync_batches_running_corp"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_wecom_directory_sync_batches_status_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_wecom_users_last_login_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_wecom_users_source_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_wecom_users_platform_status"`);
    await queryRunner.query(`ALTER TABLE "wecom_users" DROP CONSTRAINT IF EXISTS "CK_wecom_users_role_mode"`);
    await queryRunner.query(`ALTER TABLE "wecom_users" DROP CONSTRAINT IF EXISTS "CK_wecom_users_department_mode"`);
    await queryRunner.query(`ALTER TABLE "wecom_users" DROP CONSTRAINT IF EXISTS "CK_wecom_users_platform_status"`);
    await queryRunner.query(`ALTER TABLE "wecom_users" DROP CONSTRAINT IF EXISTS "CK_wecom_users_source_status"`);
    await queryRunner.query(`ALTER TABLE "wecom_users" DROP CONSTRAINT IF EXISTS "CK_wecom_users_login_status"`);
    for (const column of ['authorization_version', 'manual_roles', 'role_mode', 'manual_department_ids', 'department_mode', 'platform_status_changed_at', 'platform_status_reason', 'platform_status', 'source_batch_id', 'source_revision', 'last_sync_at', 'login_status', 'last_login_at', 'source_status_updated_at', 'source_status']) {
      await queryRunner.query(`ALTER TABLE "wecom_users" DROP COLUMN IF EXISTS "${column}"`);
    }
    await queryRunner.query(`DROP TABLE IF EXISTS "wecom_user_change_audits"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "wecom_directory_sync_batches"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "wecom_departments"`);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS "wecom_source_revision_seq"`);
  }
}
