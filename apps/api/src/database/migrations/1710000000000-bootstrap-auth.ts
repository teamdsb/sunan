import type { MigrationInterface, QueryRunner } from 'typeorm';

export class BootstrapAuth1710000000000 implements MigrationInterface {
  name = 'BootstrapAuth1710000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION set_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);
    await queryRunner.query(`
      CREATE TABLE "wecom_users" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "user_id" VARCHAR(64) NOT NULL,
        "corp_id" VARCHAR(64) NOT NULL,
        "name" VARCHAR(64) NOT NULL,
        "avatar_url" TEXT,
        "department_codes" JSONB NOT NULL DEFAULT '[]'::jsonb,
        "department_names" JSONB NOT NULL DEFAULT '[]'::jsonb,
        "position" VARCHAR(64),
        "is_system_admin" BOOLEAN NOT NULL DEFAULT false,
        "raw_profile" JSONB NOT NULL DEFAULT '{}'::jsonb,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_wecom_users_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_wecom_users_user_id" UNIQUE ("user_id")
      )
    `);
    await queryRunner.query(`
      CREATE TRIGGER set_wecom_users_updated_at
      BEFORE UPDATE ON "wecom_users"
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS set_wecom_users_updated_at ON "wecom_users"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "wecom_users"`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS set_updated_at`);
  }
}
