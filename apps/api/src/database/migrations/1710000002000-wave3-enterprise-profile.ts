import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Wave31710000002000 implements MigrationInterface {
  name = 'Wave31710000002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "enterprise_profiles" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "title" VARCHAR(128) NOT NULL,
        "category" VARCHAR(32) NOT NULL,
        "description" TEXT,
        "status" VARCHAR(16) NOT NULL DEFAULT 'draft',
        "effective_date" DATE,
        "published_at" TIMESTAMPTZ,
        "department_code" VARCHAR(64),
        "created_by" VARCHAR(64) NOT NULL,
        "updated_by" VARCHAR(64) NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "PK_enterprise_profiles_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_enterprise_profiles_status" ON "enterprise_profiles" ("status") WHERE "deleted_at" IS NULL`);
    await queryRunner.query(`CREATE INDEX "idx_enterprise_profiles_category" ON "enterprise_profiles" ("category") WHERE "deleted_at" IS NULL`);
    await queryRunner.query(`CREATE INDEX "idx_enterprise_profiles_department_code" ON "enterprise_profiles" ("department_code") WHERE "deleted_at" IS NULL`);
    await queryRunner.query(`CREATE TRIGGER set_enterprise_profiles_updated_at BEFORE UPDATE ON "enterprise_profiles" FOR EACH ROW EXECUTE FUNCTION set_updated_at()`);

    await queryRunner.query(`
      CREATE TABLE "enterprise_profile_files" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "enterprise_profile_id" UUID NOT NULL,
        "file_id" UUID NOT NULL,
        "sort_order" INTEGER NOT NULL DEFAULT 0,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_enterprise_profile_files_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_enterprise_profile_files_profile" FOREIGN KEY ("enterprise_profile_id") REFERENCES "enterprise_profiles"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_enterprise_profile_files_file" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_enterprise_profile_files_profile_id" ON "enterprise_profile_files" ("enterprise_profile_id")`);
    await queryRunner.query(`CREATE UNIQUE INDEX "uk_enterprise_profile_files_profile_file" ON "enterprise_profile_files" ("enterprise_profile_id", "file_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "uk_enterprise_profile_files_profile_file"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_enterprise_profile_files_profile_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "enterprise_profile_files"`);

    await queryRunner.query(`DROP TRIGGER IF EXISTS set_enterprise_profiles_updated_at ON "enterprise_profiles"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_enterprise_profiles_department_code"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_enterprise_profiles_category"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_enterprise_profiles_status"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "enterprise_profiles"`);
  }
}

