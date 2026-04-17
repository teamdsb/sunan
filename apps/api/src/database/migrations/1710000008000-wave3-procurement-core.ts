import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Wave31710000008000 implements MigrationInterface {
  name = 'Wave31710000008000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "procurement_orders" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "order_no" VARCHAR(32) NOT NULL,
        "department_code" VARCHAR(32) NOT NULL,
        "dimension_type" VARCHAR(32) NOT NULL DEFAULT 'none',
        "dimension_key" VARCHAR(64),
        "title" VARCHAR(128) NOT NULL,
        "summary" TEXT NOT NULL,
        "amount" NUMERIC(12,2) NOT NULL,
        "expense_date" DATE,
        "status" VARCHAR(32) NOT NULL DEFAULT 'draft',
        "approval_channel" VARCHAR(32) NOT NULL DEFAULT 'internal',
        "external_process_instance_id" VARCHAR(128),
        "external_status" VARCHAR(64),
        "external_synced_at" TIMESTAMPTZ,
        "submitted_at" TIMESTAMPTZ,
        "final_approved_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" VARCHAR(64) NOT NULL,
        "updated_by" VARCHAR(64) NOT NULL,
        CONSTRAINT "PK_procurement_orders_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "procurement_order_approvals" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "order_id" UUID NOT NULL,
        "approval_level" VARCHAR(32) NOT NULL,
        "action" VARCHAR(32) NOT NULL,
        "comment" TEXT,
        "source" VARCHAR(32) NOT NULL DEFAULT 'internal',
        "external_event_id" VARCHAR(128),
        "approved_by" VARCHAR(64) NOT NULL,
        "approved_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "payload_snapshot" JSONB NOT NULL DEFAULT '{}'::jsonb,
        CONSTRAINT "PK_procurement_order_approvals_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_procurement_order_approvals_order_id" FOREIGN KEY ("order_id") REFERENCES "procurement_orders"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "procurement_order_files" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "order_id" UUID NOT NULL,
        "file_id" UUID NOT NULL,
        "relation_type" VARCHAR(32) NOT NULL DEFAULT 'attachment',
        "created_by" VARCHAR(64) NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_procurement_order_files_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_procurement_order_files_order_id" FOREIGN KEY ("order_id") REFERENCES "procurement_orders"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_procurement_order_files_file_id" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`CREATE UNIQUE INDEX "uq_procurement_orders_order_no" ON "procurement_orders" ("order_no") WHERE "deleted_at" IS NULL`);
    await queryRunner.query(`CREATE INDEX "idx_procurement_orders_department_status" ON "procurement_orders" ("department_code", "status") WHERE "deleted_at" IS NULL`);
    await queryRunner.query(`CREATE INDEX "idx_procurement_orders_submitted_at" ON "procurement_orders" ("submitted_at") WHERE "deleted_at" IS NULL`);
    await queryRunner.query(`CREATE INDEX "idx_procurement_orders_dimension" ON "procurement_orders" ("department_code", "dimension_type", "dimension_key") WHERE "deleted_at" IS NULL`);
    await queryRunner.query(`CREATE INDEX "idx_procurement_orders_approval_channel" ON "procurement_orders" ("approval_channel", "external_status") WHERE "deleted_at" IS NULL`);
    await queryRunner.query(`CREATE INDEX "idx_procurement_order_approvals_order_created" ON "procurement_order_approvals" ("order_id", "approved_at")`);
    await queryRunner.query(`CREATE INDEX "idx_procurement_order_approvals_level_action" ON "procurement_order_approvals" ("approval_level", "action")`);
    await queryRunner.query(`CREATE UNIQUE INDEX "uq_procurement_order_files_order_file" ON "procurement_order_files" ("order_id", "file_id")`);
    await queryRunner.query(`CREATE INDEX "idx_procurement_order_files_order_id" ON "procurement_order_files" ("order_id")`);
    await queryRunner.query(`CREATE INDEX "idx_procurement_order_files_file_id" ON "procurement_order_files" ("file_id")`);
    await queryRunner.query(`CREATE TRIGGER set_procurement_orders_updated_at BEFORE UPDATE ON "procurement_orders" FOR EACH ROW EXECUTE FUNCTION set_updated_at()`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS set_procurement_orders_updated_at ON "procurement_orders"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_procurement_order_files_file_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_procurement_order_files_order_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_procurement_order_files_order_file"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_procurement_order_approvals_level_action"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_procurement_order_approvals_order_created"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_procurement_orders_approval_channel"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_procurement_orders_dimension"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_procurement_orders_submitted_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_procurement_orders_department_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_procurement_orders_order_no"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "procurement_order_files"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "procurement_order_approvals"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "procurement_orders"`);
  }
}
