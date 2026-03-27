import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Wave31710000004000 implements MigrationInterface {
  name = 'Wave31710000004000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "ship_monitors" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "vessel_id" UUID NOT NULL,
        "monitor_name" VARCHAR(128) NOT NULL,
        "endpoint_url" TEXT NOT NULL,
        "access_mode" VARCHAR(16) NOT NULL DEFAULT 'external',
        "sort_order" INTEGER NOT NULL DEFAULT 0,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "last_verified_at" TIMESTAMPTZ,
        "created_by" VARCHAR(64) NOT NULL,
        "updated_by" VARCHAR(64) NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "PK_ship_monitors_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_ship_monitors_vessel" FOREIGN KEY ("vessel_id") REFERENCES "vessels"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_ship_monitors_vessel_id" ON "ship_monitors" ("vessel_id") WHERE "deleted_at" IS NULL`);
    await queryRunner.query(`CREATE INDEX "idx_ship_monitors_is_active" ON "ship_monitors" ("is_active") WHERE "deleted_at" IS NULL`);
    await queryRunner.query(`CREATE UNIQUE INDEX "uk_ship_monitors_vessel_name" ON "ship_monitors" ("vessel_id", "monitor_name") WHERE "deleted_at" IS NULL`);
    await queryRunner.query(`CREATE TRIGGER set_ship_monitors_updated_at BEFORE UPDATE ON "ship_monitors" FOR EACH ROW EXECUTE FUNCTION set_updated_at()`);

    await queryRunner.query(`
      CREATE TABLE "user_settings" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "user_id" VARCHAR(64) NOT NULL,
        "default_module" VARCHAR(32) NOT NULL DEFAULT 'my',
        "reminder_view_mode" VARCHAR(16) NOT NULL DEFAULT 'dashboard',
        "certificate_group_by" VARCHAR(16) NOT NULL DEFAULT 'owner',
        "enable_push_notifications" BOOLEAN NOT NULL DEFAULT true,
        "theme" VARCHAR(16) NOT NULL DEFAULT 'light',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_user_settings_id" PRIMARY KEY ("id"),
        CONSTRAINT "uk_user_settings_user_id" UNIQUE ("user_id")
      )
    `);
    await queryRunner.query(`CREATE TRIGGER set_user_settings_updated_at BEFORE UPDATE ON "user_settings" FOR EACH ROW EXECUTE FUNCTION set_updated_at()`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS set_user_settings_updated_at ON "user_settings"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_settings"`);

    await queryRunner.query(`DROP TRIGGER IF EXISTS set_ship_monitors_updated_at ON "ship_monitors"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "uk_ship_monitors_vessel_name"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_ship_monitors_is_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_ship_monitors_vessel_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ship_monitors"`);
  }
}

