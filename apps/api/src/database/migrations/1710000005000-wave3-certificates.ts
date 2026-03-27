import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Wave31710000005000 implements MigrationInterface {
  name = 'Wave31710000005000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "certificates" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "certificate_type_id" UUID NOT NULL,
        "owner_type" VARCHAR(16) NOT NULL,
        "owner_id" UUID NOT NULL,
        "certificate_no" VARCHAR(128),
        "title" VARCHAR(128) NOT NULL,
        "issue_date" DATE,
        "expiry_date" DATE NOT NULL,
        "advance_days" INTEGER NOT NULL,
        "issuer" VARCHAR(128),
        "status" VARCHAR(16) NOT NULL DEFAULT 'active',
        "latest_scan_at" TIMESTAMPTZ,
        "remarks" TEXT,
        "created_by" VARCHAR(64) NOT NULL,
        "updated_by" VARCHAR(64) NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "PK_certificates_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_certificates_certificate_type" FOREIGN KEY ("certificate_type_id") REFERENCES "certificate_types"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_certificates_owner" ON "certificates" ("owner_type", "owner_id") WHERE "deleted_at" IS NULL`);
    await queryRunner.query(`CREATE INDEX "idx_certificates_expiry" ON "certificates" ("expiry_date") WHERE "deleted_at" IS NULL`);
    await queryRunner.query(`CREATE INDEX "idx_certificates_type_status" ON "certificates" ("certificate_type_id", "status") WHERE "deleted_at" IS NULL`);
    await queryRunner.query(`CREATE TRIGGER set_certificates_updated_at BEFORE UPDATE ON "certificates" FOR EACH ROW EXECUTE FUNCTION set_updated_at()`);

    await queryRunner.query(`
      CREATE TABLE "certificate_files" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "certificate_id" UUID NOT NULL,
        "file_id" UUID NOT NULL,
        "file_role" VARCHAR(32) NOT NULL DEFAULT 'primary',
        "sort_order" INTEGER NOT NULL DEFAULT 0,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_certificate_files_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_certificate_files_certificate" FOREIGN KEY ("certificate_id") REFERENCES "certificates"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_certificate_files_file" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "uk_certificate_files_certificate_file" ON "certificate_files" ("certificate_id", "file_id")`);
    await queryRunner.query(`CREATE INDEX "idx_certificate_files_certificate" ON "certificate_files" ("certificate_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_certificate_files_certificate"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "uk_certificate_files_certificate_file"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "certificate_files"`);

    await queryRunner.query(`DROP TRIGGER IF EXISTS set_certificates_updated_at ON "certificates"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_certificates_type_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_certificates_expiry"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_certificates_owner"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "certificates"`);
  }
}

