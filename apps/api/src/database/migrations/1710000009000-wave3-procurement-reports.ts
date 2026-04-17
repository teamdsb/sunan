import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Wave31710000009000 implements MigrationInterface {
  name = 'Wave31710000009000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "procurement_reports" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "report_no" VARCHAR(32) NOT NULL,
        "report_type" VARCHAR(32) NOT NULL,
        "period_year" INTEGER NOT NULL,
        "period_month" INTEGER,
        "department_code" VARCHAR(32),
        "snapshot_params" JSONB NOT NULL DEFAULT '{}'::jsonb,
        "snapshot_summary" JSONB NOT NULL DEFAULT '{}'::jsonb,
        "status" VARCHAR(32) NOT NULL DEFAULT 'draft',
        "approval_channel" VARCHAR(32) NOT NULL DEFAULT 'internal',
        "external_process_instance_id" VARCHAR(128),
        "external_status" VARCHAR(64),
        "external_synced_at" TIMESTAMPTZ,
        "submitted_at" TIMESTAMPTZ,
        "final_approved_at" TIMESTAMPTZ,
        "export_pdf_file_id" UUID,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ,
        "created_by" VARCHAR(64) NOT NULL,
        "updated_by" VARCHAR(64) NOT NULL,
        CONSTRAINT "PK_procurement_reports_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_procurement_reports_export_pdf_file_id" FOREIGN KEY ("export_pdf_file_id") REFERENCES "files"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "procurement_report_approvals" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "report_id" UUID NOT NULL,
        "approval_level" VARCHAR(32) NOT NULL,
        "action" VARCHAR(32) NOT NULL,
        "comment" TEXT,
        "source" VARCHAR(32) NOT NULL DEFAULT 'internal',
        "external_event_id" VARCHAR(128),
        "approved_by" VARCHAR(64) NOT NULL,
        "approved_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "payload_snapshot" JSONB NOT NULL DEFAULT '{}'::jsonb,
        CONSTRAINT "PK_procurement_report_approvals_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_procurement_report_approvals_report_id" FOREIGN KEY ("report_id") REFERENCES "procurement_reports"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE UNIQUE INDEX "uq_procurement_reports_report_no" ON "procurement_reports" ("report_no") WHERE "deleted_at" IS NULL`);
    await queryRunner.query(`CREATE INDEX "idx_procurement_reports_type_period" ON "procurement_reports" ("report_type", "period_year", "period_month") WHERE "deleted_at" IS NULL`);
    await queryRunner.query(`CREATE INDEX "idx_procurement_reports_department_status" ON "procurement_reports" ("department_code", "status") WHERE "deleted_at" IS NULL`);
    await queryRunner.query(`CREATE INDEX "idx_procurement_reports_submitted_at" ON "procurement_reports" ("submitted_at") WHERE "deleted_at" IS NULL`);
    await queryRunner.query(`CREATE INDEX "idx_procurement_reports_approval_channel" ON "procurement_reports" ("approval_channel", "external_status") WHERE "deleted_at" IS NULL`);
    await queryRunner.query(`CREATE INDEX "idx_procurement_report_approvals_report_created" ON "procurement_report_approvals" ("report_id", "approved_at")`);
    await queryRunner.query(`CREATE INDEX "idx_procurement_report_approvals_level_action" ON "procurement_report_approvals" ("approval_level", "action")`);
    await queryRunner.query(`CREATE TRIGGER set_procurement_reports_updated_at BEFORE UPDATE ON "procurement_reports" FOR EACH ROW EXECUTE FUNCTION set_updated_at()`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS set_procurement_reports_updated_at ON "procurement_reports"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_procurement_report_approvals_level_action"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_procurement_report_approvals_report_created"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_procurement_reports_approval_channel"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_procurement_reports_submitted_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_procurement_reports_department_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_procurement_reports_type_period"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_procurement_reports_report_no"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "procurement_report_approvals"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "procurement_reports"`);
  }
}
