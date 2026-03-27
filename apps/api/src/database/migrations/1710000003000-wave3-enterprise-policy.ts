import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Wave31710000003000 implements MigrationInterface {
  name = 'Wave31710000003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "enterprise_policies" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "title" VARCHAR(128) NOT NULL,
        "policy_code" VARCHAR(64) NOT NULL,
        "version" VARCHAR(32) NOT NULL,
        "summary" TEXT,
        "status" VARCHAR(16) NOT NULL DEFAULT 'draft',
        "effective_date" DATE,
        "published_at" TIMESTAMPTZ,
        "department_code" VARCHAR(64),
        "created_by" VARCHAR(64) NOT NULL,
        "updated_by" VARCHAR(64) NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "PK_enterprise_policies_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "uk_enterprise_policies_code_version" ON "enterprise_policies" ("policy_code", "version") WHERE "deleted_at" IS NULL`);
    await queryRunner.query(`CREATE INDEX "idx_enterprise_policies_status" ON "enterprise_policies" ("status") WHERE "deleted_at" IS NULL`);
    await queryRunner.query(`CREATE INDEX "idx_enterprise_policies_effective_date" ON "enterprise_policies" ("effective_date") WHERE "deleted_at" IS NULL`);
    await queryRunner.query(`CREATE INDEX "idx_enterprise_policies_department_code" ON "enterprise_policies" ("department_code") WHERE "deleted_at" IS NULL`);
    await queryRunner.query(`CREATE TRIGGER set_enterprise_policies_updated_at BEFORE UPDATE ON "enterprise_policies" FOR EACH ROW EXECUTE FUNCTION set_updated_at()`);

    await queryRunner.query(`
      CREATE TABLE "enterprise_policy_files" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "enterprise_policy_id" UUID NOT NULL,
        "file_id" UUID NOT NULL,
        "sort_order" INTEGER NOT NULL DEFAULT 0,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_enterprise_policy_files_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_enterprise_policy_files_policy" FOREIGN KEY ("enterprise_policy_id") REFERENCES "enterprise_policies"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_enterprise_policy_files_file" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_enterprise_policy_files_policy_id" ON "enterprise_policy_files" ("enterprise_policy_id")`);
    await queryRunner.query(`CREATE UNIQUE INDEX "uk_enterprise_policy_files_policy_file" ON "enterprise_policy_files" ("enterprise_policy_id", "file_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "uk_enterprise_policy_files_policy_file"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_enterprise_policy_files_policy_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "enterprise_policy_files"`);

    await queryRunner.query(`DROP TRIGGER IF EXISTS set_enterprise_policies_updated_at ON "enterprise_policies"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_enterprise_policies_department_code"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_enterprise_policies_effective_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_enterprise_policies_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "uk_enterprise_policies_code_version"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "enterprise_policies"`);
  }
}

