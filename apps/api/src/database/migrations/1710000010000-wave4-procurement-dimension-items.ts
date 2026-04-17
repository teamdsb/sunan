import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Wave41710000010000 implements MigrationInterface {
  name = 'Wave41710000010000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "procurement_dimension_items" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "department_code" VARCHAR(32) NOT NULL,
        "dimension_type" VARCHAR(32) NOT NULL,
        "dimension_key" VARCHAR(64) NOT NULL,
        "dimension_name" VARCHAR(128) NOT NULL,
        "sort_order" INTEGER NOT NULL DEFAULT 0,
        "is_enabled" BOOLEAN NOT NULL DEFAULT TRUE,
        "created_by" VARCHAR(64) NOT NULL,
        "updated_by" VARCHAR(64) NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "PK_procurement_dimension_items_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_procurement_dimension_items_scope_key" ON "procurement_dimension_items" ("department_code", "dimension_type", "dimension_key") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_procurement_dimension_items_scope" ON "procurement_dimension_items" ("department_code", "dimension_type") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_procurement_dimension_items_enabled" ON "procurement_dimension_items" ("department_code", "dimension_type", "is_enabled") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE TRIGGER set_procurement_dimension_items_updated_at BEFORE UPDATE ON "procurement_dimension_items" FOR EACH ROW EXECUTE FUNCTION set_updated_at()`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS set_procurement_dimension_items_updated_at ON "procurement_dimension_items"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_procurement_dimension_items_enabled"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_procurement_dimension_items_scope"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_procurement_dimension_items_scope_key"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "procurement_dimension_items"`);
  }
}
