import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Wave21710000007000 implements MigrationInterface {
  name = 'Wave21710000007000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "office_categories" (
        "code" VARCHAR(64) NOT NULL,
        "name" VARCHAR(64) NOT NULL,
        "sort_order" INTEGER NOT NULL DEFAULT 0,
        "is_enabled" BOOLEAN NOT NULL DEFAULT true,
        CONSTRAINT "PK_office_categories_code" PRIMARY KEY ("code")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "office_entries" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "category_code" VARCHAR(64) NOT NULL,
        "title" VARCHAR(128) NOT NULL,
        "summary" TEXT NOT NULL,
        "icon_type" VARCHAR(64) NOT NULL,
        "target_type" VARCHAR(32) NOT NULL,
        "target_value" TEXT NOT NULL,
        "open_mode" VARCHAR(32) NOT NULL DEFAULT 'current_webview',
        "visibility_roles" JSONB NOT NULL DEFAULT '[]'::jsonb,
        "manager_roles" JSONB NOT NULL DEFAULT '[]'::jsonb,
        "sort_order" INTEGER NOT NULL DEFAULT 0,
        "status" VARCHAR(32) NOT NULL DEFAULT 'draft',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" VARCHAR(64) NOT NULL,
        "updated_by" VARCHAR(64) NOT NULL,
        CONSTRAINT "PK_office_entries_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_office_entries_category_code" FOREIGN KEY ("category_code") REFERENCES "office_categories"("code") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "office_entry_audits" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "entry_id" UUID NOT NULL,
        "action" VARCHAR(32) NOT NULL,
        "operator_user_id" VARCHAR(64) NOT NULL,
        "payload_snapshot" JSONB NOT NULL DEFAULT '{}'::jsonb,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_office_entry_audits_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_office_entry_audits_entry_id" FOREIGN KEY ("entry_id") REFERENCES "office_entries"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE INDEX "idx_office_entries_category_status_sort" ON "office_entries" ("category_code", "status", "sort_order")`);
    await queryRunner.query(`CREATE INDEX "idx_office_entries_deleted_at" ON "office_entries" ("deleted_at")`);
    await queryRunner.query(`CREATE INDEX "idx_office_entry_audits_entry_id_created_at" ON "office_entry_audits" ("entry_id", "created_at")`);
    await queryRunner.query(`CREATE TRIGGER set_office_entries_updated_at BEFORE UPDATE ON "office_entries" FOR EACH ROW EXECUTE FUNCTION set_updated_at()`);

    await queryRunner.query(`
      INSERT INTO "office_categories" ("code", "name", "sort_order", "is_enabled") VALUES
      ('maritime', '海事', 10, true),
      ('customs', '海关', 20, true),
      ('border_inspection', '边检', 30, true),
      ('vessel_inspection', '船检', 40, true),
      ('environment', '环保', 50, true),
      ('other', '其他', 60, true),
      ('petrochemical_park', '石化园区', 70, true)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS set_office_entries_updated_at ON "office_entries"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_office_entry_audits_entry_id_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_office_entries_deleted_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_office_entries_category_status_sort"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "office_entry_audits"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "office_entries"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "office_categories"`);
  }
}
