import type { MigrationInterface, QueryRunner } from 'typeorm';

const supportingIndexes = [
  ['idx_capa_action_evidence_file', 'capa_action_evidence', 'file_id'],
  ['idx_capa_actions_capa', 'capa_actions', 'capa_id'],
  ['idx_certificate_files_file', 'certificate_files', 'file_id'],
  ['idx_enterprise_policy_files_file', 'enterprise_policy_files', 'file_id'],
  ['idx_enterprise_profile_files_file', 'enterprise_profile_files', 'file_id'],
  ['idx_evidence_audits_file', 'evidence_audits', 'file_id'],
  ['idx_evidence_records_file', 'evidence_records', 'file_id'],
  ['idx_export_jobs_result_file', 'export_jobs', 'result_file_id'],
  ['idx_inspection_plans_plan', 'inspection_plans', 'plan_id'],
  ['idx_inspection_plans_template_version', 'inspection_plans', 'template_version_id'],
  ['idx_inspection_result_evidence_file', 'inspection_result_evidence', 'file_id'],
  ['idx_inspection_results_signature_file', 'inspection_results', 'signature_file_id'],
  ['idx_inspection_template_scopes_template', 'inspection_template_scopes', 'template_id'],
  ['idx_inspection_templates_current_version', 'inspection_templates', 'current_version_id'],
  ['idx_inspections_template_version', 'inspections', 'template_version_id'],
  ['idx_issue_transfer_jobs_result', 'issue_transfer_jobs', 'inspection_result_id'],
  ['idx_issue_transfer_jobs_issue', 'issue_transfer_jobs', 'issue_id'],
  ['idx_procurement_reports_export_pdf', 'procurement_reports', 'export_pdf_file_id'],
  ['idx_safety_equipment_category', 'safety_equipment', 'category_id'],
  ['idx_safety_issues_vessel', 'safety_issues', 'vessel_id'],
  ['idx_workbench_delegations_record', 'workbench_delegations', 'business_record_id'],
  ['idx_workbench_delegations_step', 'workbench_delegations', 'step_id'],
  ['idx_workbench_master_refs_record', 'workbench_master_data_references', 'source_record_id'],
  ['idx_workbench_record_attachments_file', 'workbench_record_attachments', 'file_id'],
  ['idx_workbench_record_participants_step', 'workbench_record_participants', 'step_id'],
] as const;

export class Wave7LegacySafetyMigration1710000021000 implements MigrationInterface {
  name = 'Wave7LegacySafetyMigration1710000021000';

  async up(q: QueryRunner): Promise<void> {
    for (const [name, table, column] of supportingIndexes) {
      await q.query(`CREATE INDEX IF NOT EXISTS ${name} ON ${table}(${column})`);
    }

    await q.query(`CREATE TABLE legacy_safety_migration_batches (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), request_id varchar(128) NOT NULL UNIQUE,
      status varchar(24) NOT NULL DEFAULT 'running' CHECK (status IN ('running','completed','completed_with_errors','failed','rolled_back')),
      source_count integer NOT NULL DEFAULT 0, created_count integer NOT NULL DEFAULT 0,
      skipped_count integer NOT NULL DEFAULT 0, failed_count integer NOT NULL DEFAULT 0,
      summary jsonb NOT NULL DEFAULT '{}'::jsonb, failure_message text,
      started_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz,
      created_by varchar(64) NOT NULL
    )`);
    await q.query(`CREATE INDEX idx_legacy_safety_batches_status_started ON legacy_safety_migration_batches(status,started_at)`);

    await q.query(`CREATE TABLE legacy_safety_migration_rows (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), batch_id uuid NOT NULL REFERENCES legacy_safety_migration_batches(id) ON DELETE RESTRICT,
      source_record_id uuid NOT NULL REFERENCES workbench_records(id) ON DELETE RESTRICT,
      source_module varchar(64) NOT NULL, source_status varchar(64) NOT NULL,
      mapped_issue_type varchar(20) NOT NULL, mapped_issue_status varchar(32) NOT NULL,
      mapping_status varchar(24) NOT NULL CHECK (mapping_status IN ('created','skipped_existing','failed','rolled_back')),
      target_issue_id uuid REFERENCES safety_issues(id) ON DELETE SET NULL,
      target_source_id uuid REFERENCES issue_sources(id) ON DELETE SET NULL,
      error_code varchar(64), error_message text,
      source_snapshot jsonb NOT NULL, source_digest varchar(64) NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(), rolled_back_at timestamptz,
      CONSTRAINT uq_legacy_safety_migration_row UNIQUE(batch_id,source_record_id)
    )`);
    await q.query(`CREATE INDEX idx_legacy_safety_rows_batch_status ON legacy_safety_migration_rows(batch_id,mapping_status)`);
    await q.query(`CREATE INDEX idx_legacy_safety_rows_source ON legacy_safety_migration_rows(source_record_id)`);
    await q.query(`CREATE INDEX idx_legacy_safety_rows_issue ON legacy_safety_migration_rows(target_issue_id)`);
    await q.query(`CREATE INDEX idx_legacy_safety_rows_source_link ON legacy_safety_migration_rows(target_source_id)`);
    await q.query(`CREATE OR REPLACE FUNCTION enforce_migrated_safety_source_read_only() RETURNS trigger AS $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM issue_sources
          WHERE source_type='workbench_record' AND source_id=OLD.id
            AND source_snapshot @> '{"mapping":{"legacyReadOnly":true}}'::jsonb
        ) THEN
          RAISE EXCEPTION 'migrated safety source is read-only' USING ERRCODE='55000';
        END IF;
        RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
      END;
    $$ LANGUAGE plpgsql`);
    await q.query(`CREATE TRIGGER guard_migrated_safety_source_read_only BEFORE UPDATE OR DELETE ON workbench_records FOR EACH ROW EXECUTE FUNCTION enforce_migrated_safety_source_read_only()`);
  }

  async down(q: QueryRunner): Promise<void> {
    const rows = await q.query(`SELECT count(*)::int AS count FROM legacy_safety_migration_rows`) as Array<{ count: number }>;
    if (Number(rows[0]?.count ?? 0) > 0) {
      throw new Error('cannot roll back Wave 7 schema while migration evidence exists');
    }
    await q.query('DROP TRIGGER IF EXISTS guard_migrated_safety_source_read_only ON workbench_records');
    await q.query('DROP FUNCTION IF EXISTS enforce_migrated_safety_source_read_only');
    await q.query('DROP TABLE IF EXISTS legacy_safety_migration_rows');
    await q.query('DROP TABLE IF EXISTS legacy_safety_migration_batches');
    for (const [name] of [...supportingIndexes].reverse()) {
      await q.query(`DROP INDEX IF EXISTS ${name}`);
    }
  }
}
