import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Wave21710000001000 implements MigrationInterface {
  name = 'Wave21710000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "files" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "oss_key" VARCHAR(255) NOT NULL,
        "file_name" VARCHAR(255) NOT NULL,
        "mime_type" VARCHAR(128) NOT NULL,
        "file_size" INTEGER NOT NULL,
        "category" VARCHAR(64) NOT NULL,
        "uploaded_by" VARCHAR(64),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_files_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_files_oss_key" UNIQUE ("oss_key")
      )
    `);
    await queryRunner.query(`
      CREATE TRIGGER set_files_updated_at
      BEFORE UPDATE ON "files"
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at()
    `);

    await queryRunner.query(`
      CREATE TABLE "vessels" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "code" VARCHAR(32) NOT NULL,
        "name" VARCHAR(64) NOT NULL,
        "category" VARCHAR(32) NOT NULL,
        "status" VARCHAR(16) NOT NULL DEFAULT 'active',
        "mmsi" VARCHAR(16),
        "remarks" TEXT,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "PK_vessels_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uk_vessels_code" ON "vessels" ("code") WHERE "deleted_at" IS NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uk_vessels_name" ON "vessels" ("name") WHERE "deleted_at" IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_vessels_category_status" ON "vessels" ("category", "status") WHERE "deleted_at" IS NULL
    `);
    await queryRunner.query(`
      CREATE TRIGGER set_vessels_updated_at
      BEFORE UPDATE ON "vessels"
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at()
    `);

    await queryRunner.query(`
      CREATE TABLE "vehicles" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "plate_number" VARCHAR(32) NOT NULL,
        "vehicle_type" VARCHAR(32),
        "status" VARCHAR(16) NOT NULL DEFAULT 'active',
        "remarks" TEXT,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "PK_vehicles_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uk_vehicles_plate_number" ON "vehicles" ("plate_number") WHERE "deleted_at" IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_vehicles_status" ON "vehicles" ("status") WHERE "deleted_at" IS NULL
    `);
    await queryRunner.query(`
      CREATE TRIGGER set_vehicles_updated_at
      BEFORE UPDATE ON "vehicles"
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at()
    `);

    await queryRunner.query(`
      CREATE TABLE "personnel" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "wecom_user_id" VARCHAR(64),
        "name" VARCHAR(64) NOT NULL,
        "department_code" VARCHAR(64) NOT NULL,
        "position" VARCHAR(64),
        "mobile" VARCHAR(32),
        "employment_status" VARCHAR(16) NOT NULL DEFAULT 'active',
        "is_sync_from_wecom" BOOLEAN NOT NULL DEFAULT true,
        "remarks" TEXT,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "PK_personnel_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uk_personnel_wecom_user_id" ON "personnel" ("wecom_user_id") WHERE "deleted_at" IS NULL AND "wecom_user_id" IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_personnel_department_code" ON "personnel" ("department_code") WHERE "deleted_at" IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_personnel_employment_status" ON "personnel" ("employment_status") WHERE "deleted_at" IS NULL
    `);
    await queryRunner.query(`
      CREATE TRIGGER set_personnel_updated_at
      BEFORE UPDATE ON "personnel"
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at()
    `);

    await queryRunner.query(`
      CREATE TABLE "certificate_types" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "code" VARCHAR(64) NOT NULL,
        "name" VARCHAR(64) NOT NULL,
        "owner_scope" VARCHAR(32) NOT NULL,
        "reminder_category" VARCHAR(32) NOT NULL,
        "default_advance_days" INTEGER NOT NULL,
        "requires_attachment" BOOLEAN NOT NULL DEFAULT true,
        "sort_order" INTEGER NOT NULL DEFAULT 0,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_certificate_types_id" PRIMARY KEY ("id"),
        CONSTRAINT "uq_certificate_types_code" UNIQUE ("code"),
        CONSTRAINT "uq_certificate_types_name" UNIQUE ("name")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_certificate_types_owner_scope" ON "certificate_types" ("owner_scope")
    `);
    await queryRunner.query(`
      CREATE TRIGGER set_certificate_types_updated_at
      BEFORE UPDATE ON "certificate_types"
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at()
    `);

    await queryRunner.query(`
      INSERT INTO "vessels" ("code", "name", "category")
      VALUES
        ('SN012', '苏南012', 'main_vessel'),
        ('SN022', '苏南022', 'main_vessel'),
        ('SNF002', '苏南辅2', 'auxiliary_vessel'),
        ('SNF003', '苏南辅3', 'auxiliary_vessel'),
        ('SNF005', '苏南辅5', 'auxiliary_vessel'),
        ('SNF006', '苏南辅6', 'auxiliary_vessel'),
        ('SNF007', '苏南辅7', 'auxiliary_vessel'),
        ('SNF008', '苏南辅8', 'auxiliary_vessel'),
        ('SNF009', '苏南辅9', 'auxiliary_vessel'),
        ('SNF010', '苏南辅10', 'auxiliary_vessel'),
        ('SNF016', '苏南辅16', 'auxiliary_vessel')
      ON CONFLICT DO NOTHING
    `);
    await queryRunner.query(`
      INSERT INTO "vehicles" ("plate_number", "vehicle_type", "status")
      VALUES ('桂N06207', '业务车辆', 'active')
      ON CONFLICT DO NOTHING
    `);
    await queryRunner.query(`
      INSERT INTO "certificate_types" (
        "code", "name", "owner_scope", "reminder_category", "default_advance_days", "sort_order"
      )
      VALUES
        ('nationality_cert', '国籍证书', 'vessel', 'certificate', 30, 10),
        ('ownership_cert', '所有权证书', 'vessel', 'certificate', 30, 20),
        ('inspection_cert', '船检证书', 'vessel', 'certificate', 30, 30),
        ('min_crew_cert', '最低配员证', 'vessel', 'certificate', 30, 40),
        ('radio_license', '电台执照', 'vessel', 'certificate', 30, 50),
        ('equipment_report', '设施设备检测报告', 'vessel', 'certificate', 30, 60),
        ('chart_update', '海图更新', 'vessel', 'certificate', 30, 70),
        ('annual_inspection', '年度检验', 'mixed', 'certificate', 30, 80),
        ('insurance', '保险', 'mixed', 'certificate', 30, 90),
        ('personnel_cert', '人员证书', 'personnel', 'certificate', 30, 100),
        ('personnel_contract', '人员合同', 'personnel', 'contract', 90, 110),
        ('service_contract', '服务合同', 'mixed', 'contract', 90, 120)
      ON CONFLICT DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS set_certificate_types_updated_at ON "certificate_types"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_certificate_types_owner_scope"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "certificate_types"`);

    await queryRunner.query(`DROP TRIGGER IF EXISTS set_personnel_updated_at ON "personnel"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_personnel_employment_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_personnel_department_code"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "uk_personnel_wecom_user_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "personnel"`);

    await queryRunner.query(`DROP TRIGGER IF EXISTS set_vehicles_updated_at ON "vehicles"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_vehicles_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "uk_vehicles_plate_number"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "vehicles"`);

    await queryRunner.query(`DROP TRIGGER IF EXISTS set_vessels_updated_at ON "vessels"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_vessels_category_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "uk_vessels_name"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "uk_vessels_code"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "vessels"`);

    await queryRunner.query(`DROP TRIGGER IF EXISTS set_files_updated_at ON "files"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "files"`);
  }
}
