import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Wave51710000011000 implements MigrationInterface {
  name = 'Wave51710000011000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "workbench_modules" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "module_code" VARCHAR(64) NOT NULL,
        "module_name" VARCHAR(128) NOT NULL,
        "department_code" VARCHAR(64) NOT NULL,
        "template_type" VARCHAR(64) NOT NULL,
        "requires_approval" BOOLEAN NOT NULL DEFAULT FALSE,
        "supports_print" BOOLEAN NOT NULL DEFAULT FALSE,
        "supports_statistics" BOOLEAN NOT NULL DEFAULT FALSE,
        "mobile_first" BOOLEAN NOT NULL DEFAULT TRUE,
        "sort_order" INTEGER NOT NULL DEFAULT 0,
        "enabled" BOOLEAN NOT NULL DEFAULT TRUE,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_workbench_modules_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "uk_workbench_modules_module_code" ON "workbench_modules" ("module_code")`);
    await queryRunner.query(`CREATE INDEX "idx_workbench_modules_department_sort" ON "workbench_modules" ("department_code", "sort_order")`);
    await queryRunner.query(
      `CREATE TRIGGER set_workbench_modules_updated_at BEFORE UPDATE ON "workbench_modules" FOR EACH ROW EXECUTE FUNCTION set_updated_at()`,
    );

    await queryRunner.query(`
      CREATE TABLE "workbench_templates" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "module_code" VARCHAR(64) NOT NULL,
        "template_code" VARCHAR(128) NOT NULL,
        "template_type" VARCHAR(64) NOT NULL,
        "schema_version" INTEGER NOT NULL DEFAULT 1,
        "field_schema" JSONB NOT NULL DEFAULT '{}'::jsonb,
        "step_schema" JSONB NOT NULL DEFAULT '[]'::jsonb,
        "print_schema" JSONB NOT NULL DEFAULT '{}'::jsonb,
        "approval_template_code" VARCHAR(128),
        "enabled" BOOLEAN NOT NULL DEFAULT TRUE,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_workbench_templates_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uk_workbench_templates_template_code_version" ON "workbench_templates" ("template_code", "schema_version")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_workbench_templates_module_code_enabled" ON "workbench_templates" ("module_code", "enabled")`,
    );
    await queryRunner.query(
      `CREATE TRIGGER set_workbench_templates_updated_at BEFORE UPDATE ON "workbench_templates" FOR EACH ROW EXECUTE FUNCTION set_updated_at()`,
    );

    await queryRunner.query(`
      CREATE TABLE "workbench_records" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "module_code" VARCHAR(64) NOT NULL,
        "template_code" VARCHAR(128) NOT NULL,
        "record_no" VARCHAR(32) NOT NULL,
        "record_source" VARCHAR(32) NOT NULL DEFAULT 'manual',
        "status" VARCHAR(64) NOT NULL,
        "approval_channel" VARCHAR(32) NOT NULL DEFAULT 'internal',
        "external_process_instance_id" VARCHAR(128),
        "external_status" VARCHAR(64),
        "title" VARCHAR(256) NOT NULL,
        "summary" TEXT NOT NULL,
        "department_code" VARCHAR(64) NOT NULL,
        "vessel_id" VARCHAR(64),
        "owner_user_id" VARCHAR(64) NOT NULL,
        "applicant_user_id" VARCHAR(64) NOT NULL,
        "assignee_user_id" VARCHAR(64),
        "reviewer_user_id" VARCHAR(64),
        "occurred_at" TIMESTAMPTZ NOT NULL,
        "submitted_at" TIMESTAMPTZ,
        "closed_at" TIMESTAMPTZ,
        "payload" JSONB NOT NULL DEFAULT '{}'::jsonb,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "PK_workbench_records_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "uk_workbench_records_record_no" ON "workbench_records" ("record_no")`);
    await queryRunner.query(
      `CREATE INDEX "idx_workbench_records_module_status_occurred_at" ON "workbench_records" ("module_code", "status", "occurred_at") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_workbench_records_vessel_occurred_at" ON "workbench_records" ("vessel_id", "occurred_at") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_workbench_records_external_process_instance_id" ON "workbench_records" ("external_process_instance_id") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_workbench_records_owner_user_id" ON "workbench_records" ("owner_user_id") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE TRIGGER set_workbench_records_updated_at BEFORE UPDATE ON "workbench_records" FOR EACH ROW EXECUTE FUNCTION set_updated_at()`,
    );

    await queryRunner.query(`
      CREATE TABLE "workbench_record_steps" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "business_record_id" UUID NOT NULL,
        "step_code" VARCHAR(64) NOT NULL,
        "step_name" VARCHAR(128) NOT NULL,
        "step_type" VARCHAR(32) NOT NULL DEFAULT 'normal',
        "sequence_no" INTEGER NOT NULL DEFAULT 0,
        "status" VARCHAR(32) NOT NULL DEFAULT 'pending',
        "check_result" VARCHAR(64),
        "rectification_required" BOOLEAN NOT NULL DEFAULT FALSE,
        "rectification_status" VARCHAR(64),
        "completed_by" VARCHAR(64),
        "completed_at" TIMESTAMPTZ,
        "step_payload" JSONB NOT NULL DEFAULT '{}'::jsonb,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_workbench_record_steps_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_workbench_record_steps_record" FOREIGN KEY ("business_record_id") REFERENCES "workbench_records"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uk_workbench_record_steps_record_step_code" ON "workbench_record_steps" ("business_record_id", "step_code")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_workbench_record_steps_record_sequence" ON "workbench_record_steps" ("business_record_id", "sequence_no")`,
    );
    await queryRunner.query(`CREATE INDEX "idx_workbench_record_steps_status" ON "workbench_record_steps" ("status")`);
    await queryRunner.query(
      `CREATE TRIGGER set_workbench_record_steps_updated_at BEFORE UPDATE ON "workbench_record_steps" FOR EACH ROW EXECUTE FUNCTION set_updated_at()`,
    );

    await queryRunner.query(`
      CREATE TABLE "workbench_record_attachments" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "business_record_id" UUID NOT NULL,
        "step_id" UUID,
        "category" VARCHAR(64) NOT NULL,
        "file_id" UUID NOT NULL,
        "file_name" VARCHAR(256) NOT NULL,
        "mime_type" VARCHAR(128) NOT NULL DEFAULT 'application/octet-stream',
        "storage_path" VARCHAR(512),
        "uploaded_by" VARCHAR(64) NOT NULL,
        "uploaded_at" TIMESTAMPTZ NOT NULL,
        "remark" TEXT,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_workbench_record_attachments_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_workbench_record_attachments_record" FOREIGN KEY ("business_record_id") REFERENCES "workbench_records"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_workbench_record_attachments_step" FOREIGN KEY ("step_id") REFERENCES "workbench_record_steps"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_workbench_record_attachments_file" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_workbench_record_attachments_record_category" ON "workbench_record_attachments" ("business_record_id", "category")`,
    );
    await queryRunner.query(`CREATE INDEX "idx_workbench_record_attachments_step_id" ON "workbench_record_attachments" ("step_id")`);

    await queryRunner.query(`
      CREATE TABLE "workbench_record_action_logs" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "business_record_id" UUID NOT NULL,
        "action_type" VARCHAR(64) NOT NULL,
        "source" VARCHAR(32) NOT NULL DEFAULT 'manual',
        "operator_user_id" VARCHAR(64),
        "from_status" VARCHAR(64),
        "to_status" VARCHAR(64),
        "comment" TEXT,
        "payload_digest" TEXT,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_workbench_record_action_logs_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_workbench_record_action_logs_record" FOREIGN KEY ("business_record_id") REFERENCES "workbench_records"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_workbench_record_action_logs_record_created_at" ON "workbench_record_action_logs" ("business_record_id", "created_at")`,
    );
    await queryRunner.query(`CREATE INDEX "idx_workbench_record_action_logs_action_type" ON "workbench_record_action_logs" ("action_type")`);
    await queryRunner.query(`CREATE INDEX "idx_workbench_record_action_logs_source" ON "workbench_record_action_logs" ("source")`);

    await queryRunner.query(`
      CREATE TABLE "workbench_print_snapshots" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "business_record_id" UUID NOT NULL,
        "template_version" VARCHAR(32) NOT NULL DEFAULT 'v1',
        "snapshot_data" JSONB NOT NULL DEFAULT '{}'::jsonb,
        "rendered_file_id" VARCHAR(128),
        "rendered_format" VARCHAR(32) NOT NULL DEFAULT 'pdf',
        "rendered_at" TIMESTAMPTZ NOT NULL,
        "rendered_by" VARCHAR(64) NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_workbench_print_snapshots_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_workbench_print_snapshots_record" FOREIGN KEY ("business_record_id") REFERENCES "workbench_records"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_workbench_print_snapshots_record_rendered_at" ON "workbench_print_snapshots" ("business_record_id", "rendered_at")`,
    );

    await queryRunner.query(`
      CREATE TABLE "wecom_approval_template_bindings" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "module_code" VARCHAR(64) NOT NULL,
        "template_code" VARCHAR(128) NOT NULL,
        "wecom_template_id" VARCHAR(128) NOT NULL,
        "approval_scene" VARCHAR(64) NOT NULL,
        "version" INTEGER NOT NULL DEFAULT 1,
        "visible_roles" JSONB NOT NULL DEFAULT '[]'::jsonb,
        "enabled" BOOLEAN NOT NULL DEFAULT TRUE,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_wecom_approval_template_bindings_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uk_wecom_approval_template_bindings_scene_version" ON "wecom_approval_template_bindings" ("approval_scene", "version")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_wecom_approval_template_bindings_module_template" ON "wecom_approval_template_bindings" ("module_code", "template_code")`,
    );
    await queryRunner.query(
      `CREATE TRIGGER set_wecom_approval_template_bindings_updated_at BEFORE UPDATE ON "wecom_approval_template_bindings" FOR EACH ROW EXECUTE FUNCTION set_updated_at()`,
    );

    await queryRunner.query(`
      CREATE TABLE "wecom_approval_instance_syncs" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "business_record_id" UUID NOT NULL,
        "module_code" VARCHAR(64) NOT NULL,
        "approval_channel" VARCHAR(32) NOT NULL DEFAULT 'wecom_native',
        "process_instance_id" VARCHAR(128) NOT NULL,
        "wecom_template_id" VARCHAR(128),
        "external_status" VARCHAR(64) NOT NULL,
        "internal_mirror_status" VARCHAR(64) NOT NULL,
        "approval_sync_status" VARCHAR(32) NOT NULL DEFAULT 'pending',
        "started_by" VARCHAR(64) NOT NULL,
        "started_at" TIMESTAMPTZ NOT NULL,
        "last_callback_at" TIMESTAMPTZ,
        "last_reconciled_at" TIMESTAMPTZ,
        "callback_version" INTEGER NOT NULL DEFAULT 0,
        "retry_count" INTEGER NOT NULL DEFAULT 0,
        "last_retry_at" TIMESTAMPTZ,
        "sync_error_code" VARCHAR(128),
        "sync_error_message" TEXT,
        "raw_payload_digest" TEXT,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_wecom_approval_instance_syncs_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_wecom_approval_instance_syncs_record" FOREIGN KEY ("business_record_id") REFERENCES "workbench_records"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uk_wecom_approval_instance_syncs_process_instance_id" ON "wecom_approval_instance_syncs" ("process_instance_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_wecom_approval_instance_syncs_business_record_id" ON "wecom_approval_instance_syncs" ("business_record_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_wecom_approval_instance_syncs_sync_status" ON "wecom_approval_instance_syncs" ("approval_sync_status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_wecom_approval_instance_syncs_external_status" ON "wecom_approval_instance_syncs" ("external_status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_wecom_approval_instance_syncs_last_reconciled_at" ON "wecom_approval_instance_syncs" ("last_reconciled_at")`,
    );
    await queryRunner.query(
      `CREATE TRIGGER set_wecom_approval_instance_syncs_updated_at BEFORE UPDATE ON "wecom_approval_instance_syncs" FOR EACH ROW EXECUTE FUNCTION set_updated_at()`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS set_wecom_approval_instance_syncs_updated_at ON "wecom_approval_instance_syncs"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_wecom_approval_instance_syncs_last_reconciled_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_wecom_approval_instance_syncs_external_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_wecom_approval_instance_syncs_sync_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_wecom_approval_instance_syncs_business_record_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "uk_wecom_approval_instance_syncs_process_instance_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "wecom_approval_instance_syncs"`);

    await queryRunner.query(`DROP TRIGGER IF EXISTS set_wecom_approval_template_bindings_updated_at ON "wecom_approval_template_bindings"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_wecom_approval_template_bindings_module_template"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "uk_wecom_approval_template_bindings_scene_version"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "wecom_approval_template_bindings"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_workbench_print_snapshots_record_rendered_at"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "workbench_print_snapshots"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_workbench_record_action_logs_source"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_workbench_record_action_logs_action_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_workbench_record_action_logs_record_created_at"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "workbench_record_action_logs"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_workbench_record_attachments_step_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_workbench_record_attachments_record_category"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "workbench_record_attachments"`);

    await queryRunner.query(`DROP TRIGGER IF EXISTS set_workbench_record_steps_updated_at ON "workbench_record_steps"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_workbench_record_steps_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_workbench_record_steps_record_sequence"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "uk_workbench_record_steps_record_step_code"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "workbench_record_steps"`);

    await queryRunner.query(`DROP TRIGGER IF EXISTS set_workbench_records_updated_at ON "workbench_records"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_workbench_records_owner_user_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_workbench_records_external_process_instance_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_workbench_records_vessel_occurred_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_workbench_records_module_status_occurred_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "uk_workbench_records_record_no"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "workbench_records"`);

    await queryRunner.query(`DROP TRIGGER IF EXISTS set_workbench_templates_updated_at ON "workbench_templates"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_workbench_templates_module_code_enabled"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "uk_workbench_templates_template_code_version"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "workbench_templates"`);

    await queryRunner.query(`DROP TRIGGER IF EXISTS set_workbench_modules_updated_at ON "workbench_modules"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_workbench_modules_department_sort"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "uk_workbench_modules_module_code"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "workbench_modules"`);
  }
}
