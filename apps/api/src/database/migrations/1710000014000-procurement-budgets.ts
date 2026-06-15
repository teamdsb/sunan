import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ProcurementBudgets1710000014000 implements MigrationInterface {
  name = 'ProcurementBudgets1710000014000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "procurement_budgets" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "budget_year" INTEGER NOT NULL,
        "department_code" VARCHAR(32) NOT NULL,
        "dimension_type" VARCHAR(32) NOT NULL,
        "dimension_key" VARCHAR(64),
        "dimension_name_snapshot" VARCHAR(128) NOT NULL,
        "budget_amount" NUMERIC(12,2) NOT NULL,
        "is_enabled" BOOLEAN NOT NULL DEFAULT TRUE,
        "created_by" VARCHAR(64) NOT NULL,
        "updated_by" VARCHAR(64) NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "PK_procurement_budgets_id" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_procurement_budgets_amount_positive" CHECK ("budget_amount" > 0),
        CONSTRAINT "CHK_procurement_budgets_year" CHECK ("budget_year" BETWEEN 2000 AND 2100)
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_procurement_budgets_scope" ON "procurement_budgets" ("budget_year", "department_code", "dimension_type", COALESCE("dimension_key", '')) WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_procurement_budgets_year_enabled" ON "procurement_budgets" ("budget_year", "is_enabled") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_procurement_budgets_scope" ON "procurement_budgets" ("budget_year", "department_code", "dimension_type") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE TRIGGER set_procurement_budgets_updated_at BEFORE UPDATE ON "procurement_budgets" FOR EACH ROW EXECUTE FUNCTION set_updated_at()`,
    );

    await queryRunner.query(`
      CREATE TABLE "procurement_budget_audits" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "budget_id" UUID NOT NULL,
        "action" VARCHAR(32) NOT NULL,
        "before_amount" NUMERIC(12,2),
        "after_amount" NUMERIC(12,2),
        "before_enabled" BOOLEAN,
        "after_enabled" BOOLEAN,
        "change_reason" VARCHAR(500) NOT NULL,
        "payload_snapshot" JSONB NOT NULL DEFAULT '{}'::jsonb,
        "changed_by" VARCHAR(64) NOT NULL,
        "changed_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_procurement_budget_audits_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_procurement_budget_audits_budget" FOREIGN KEY ("budget_id") REFERENCES "procurement_budgets"("id") ON DELETE RESTRICT,
        CONSTRAINT "CHK_procurement_budget_audits_action" CHECK ("action" IN ('create', 'update', 'enable', 'disable'))
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_procurement_budget_audits_budget_changed" ON "procurement_budget_audits" ("budget_id", "changed_at" DESC)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_procurement_budget_audits_budget_changed"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "procurement_budget_audits"`);
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS set_procurement_budgets_updated_at ON "procurement_budgets"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_procurement_budgets_scope"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_procurement_budgets_year_enabled"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "uq_procurement_budgets_scope"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "procurement_budgets"`);
  }
}
