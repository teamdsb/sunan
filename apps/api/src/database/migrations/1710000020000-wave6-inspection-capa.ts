import { MigrationInterface, QueryRunner } from 'typeorm';

export class Wave6InspectionCapa1710000020000 implements MigrationInterface {
  name = 'Wave6InspectionCapa1710000020000';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE inspection_templates (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code varchar(64) NOT NULL, name varchar(200) NOT NULL, source_type varchar(16) NOT NULL CHECK (source_type IN ('regulation','company','vessel')), current_version_id uuid,
      created_by varchar(64) NOT NULL, updated_by varchar(64), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
    )`);
    await q.query(`CREATE UNIQUE INDEX uq_inspection_templates_code ON inspection_templates(code) WHERE deleted_at IS NULL`);
    await q.query(`CREATE TABLE inspection_template_versions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), template_id uuid NOT NULL REFERENCES inspection_templates(id) ON DELETE RESTRICT, version_no integer NOT NULL CHECK (version_no > 0), status varchar(16) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','retired')), import_source varchar(500), published_at timestamptz, published_by varchar(64),
      created_by varchar(64) NOT NULL, updated_by varchar(64), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz,
      CONSTRAINT uq_inspection_template_versions_number UNIQUE(template_id,version_no)
    )`);
    await q.query(`CREATE UNIQUE INDEX uq_inspection_template_versions_draft ON inspection_template_versions(template_id) WHERE status='draft' AND deleted_at IS NULL`);
    await q.query(`ALTER TABLE inspection_templates ADD CONSTRAINT fk_inspection_templates_current_version FOREIGN KEY(current_version_id) REFERENCES inspection_template_versions(id) ON DELETE RESTRICT`);
    await q.query(`CREATE TABLE inspection_template_items (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), version_id uuid NOT NULL REFERENCES inspection_template_versions(id) ON DELETE RESTRICT, item_code varchar(64) NOT NULL, title varchar(200) NOT NULL, clause_ref varchar(200), result_required boolean NOT NULL DEFAULT true, evidence_required_on_failure boolean NOT NULL DEFAULT true, sequence_no integer NOT NULL CHECK (sequence_no > 0),
      created_by varchar(64) NOT NULL, updated_by varchar(64), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
    )`);
    await q.query(`CREATE UNIQUE INDEX uq_inspection_template_items_code ON inspection_template_items(version_id,item_code) WHERE deleted_at IS NULL`);
    await q.query(`CREATE UNIQUE INDEX uq_inspection_template_items_sequence ON inspection_template_items(version_id,sequence_no) WHERE deleted_at IS NULL`);
    await q.query(`CREATE TABLE inspection_template_scopes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), template_id uuid NOT NULL REFERENCES inspection_templates(id) ON DELETE RESTRICT, vessel_id uuid REFERENCES vessels(id) ON DELETE RESTRICT, department_code varchar(64),
      created_by varchar(64) NOT NULL, updated_by varchar(64), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz,
      CONSTRAINT ck_inspection_template_scope_nonempty CHECK (vessel_id IS NOT NULL OR department_code IS NOT NULL)
    )`);
    await q.query(`CREATE INDEX idx_inspection_template_scopes_vessel ON inspection_template_scopes(vessel_id)`);
    await q.query(`CREATE TABLE inspection_plans (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title varchar(200) NOT NULL, plan_id uuid NOT NULL REFERENCES safety_plans(id) ON DELETE RESTRICT, plan_item_id uuid NOT NULL REFERENCES safety_plan_items(id) ON DELETE RESTRICT, template_version_id uuid NOT NULL REFERENCES inspection_template_versions(id) ON DELETE RESTRICT,
      created_by varchar(64) NOT NULL, updated_by varchar(64), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
    )`);
    await q.query(`CREATE UNIQUE INDEX uq_inspection_plans_plan_item ON inspection_plans(plan_item_id) WHERE deleted_at IS NULL`);
    await q.query(`CREATE TABLE inspections (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), task_id uuid NOT NULL REFERENCES safety_tasks(id) ON DELETE RESTRICT, inspection_plan_id uuid NOT NULL REFERENCES inspection_plans(id) ON DELETE RESTRICT, template_version_id uuid NOT NULL REFERENCES inspection_template_versions(id) ON DELETE RESTRICT, template_snapshot jsonb NOT NULL, status varchar(16) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','submitted','completed','cancelled')), summary_snapshot jsonb, completed_at timestamptz,
      created_by varchar(64) NOT NULL, updated_by varchar(64), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
    )`);
    await q.query(`CREATE UNIQUE INDEX uq_inspections_task ON inspections(task_id) WHERE deleted_at IS NULL`);
    await q.query(`CREATE INDEX idx_inspections_plan_status ON inspections(inspection_plan_id,status)`);
    await q.query(`CREATE TABLE inspection_results (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), inspection_id uuid NOT NULL REFERENCES inspections(id) ON DELETE RESTRICT, template_item_snapshot_key varchar(128) NOT NULL, inspector_user_id varchar(64) NOT NULL, conclusion varchar(20) NOT NULL CHECK (conclusion IN ('conforming','nonconforming','not_applicable')), remark text, status varchar(16) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted')), signature_file_id uuid REFERENCES files(id) ON DELETE RESTRICT, signed_at timestamptz,
      created_by varchar(64) NOT NULL, updated_by varchar(64), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
    )`);
    await q.query(`CREATE UNIQUE INDEX uq_inspection_results_slot ON inspection_results(inspection_id,template_item_snapshot_key,inspector_user_id) WHERE deleted_at IS NULL`);
    await q.query(`CREATE INDEX idx_inspection_results_failure ON inspection_results(inspection_id,conclusion)`);
    await q.query(`CREATE TABLE inspection_result_evidence (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), result_id uuid NOT NULL REFERENCES inspection_results(id) ON DELETE RESTRICT, file_id uuid NOT NULL REFERENCES files(id) ON DELETE RESTRICT, category varchar(32) NOT NULL DEFAULT 'evidence',
      created_by varchar(64) NOT NULL, updated_by varchar(64), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
    )`);
    await q.query(`CREATE UNIQUE INDEX uq_inspection_result_evidence ON inspection_result_evidence(result_id,file_id) WHERE deleted_at IS NULL`);
    await q.query(`CREATE TABLE safety_issues (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), issue_no varchar(32) NOT NULL, title varchar(200) NOT NULL, issue_type varchar(20) NOT NULL CHECK (issue_type IN ('hazard','nonconformity','general','external')), severity varchar(16) NOT NULL CHECK (severity IN ('minor','major','critical')), status varchar(32) NOT NULL DEFAULT 'open' CHECK (status IN ('open','analyzing','action_in_progress','pending_verification','closed')), vessel_id uuid REFERENCES vessels(id) ON DELETE RESTRICT, responsibility_scope varchar(16), responsible_user_id varchar(64) NOT NULL, due_at timestamptz NOT NULL, idempotency_key varchar(128), closed_at timestamptz, closed_by varchar(64),
      created_by varchar(64) NOT NULL, updated_by varchar(64), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
    )`);
    await q.query(`CREATE UNIQUE INDEX uq_safety_issues_no ON safety_issues(issue_no)`);
    await q.query(`CREATE UNIQUE INDEX uq_safety_issues_idempotency ON safety_issues(idempotency_key) WHERE idempotency_key IS NOT NULL AND deleted_at IS NULL`);
    await q.query(`CREATE INDEX idx_safety_issues_status_due ON safety_issues(status,due_at)`);
    await q.query(`CREATE TABLE issue_sources (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), issue_id uuid NOT NULL REFERENCES safety_issues(id) ON DELETE RESTRICT, source_type varchar(32) NOT NULL, source_id uuid NOT NULL, source_item_key varchar(128) NOT NULL DEFAULT '', source_snapshot jsonb NOT NULL DEFAULT '{}', created_by varchar(64) NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT uq_issue_sources_relation UNIQUE(issue_id,source_type,source_id,source_item_key)
    )`);
    await q.query(`CREATE INDEX idx_issue_sources_source ON issue_sources(source_type,source_id)`);
    await q.query(`CREATE TABLE issue_transfer_jobs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), dedupe_key varchar(128) NOT NULL UNIQUE, inspection_result_id uuid NOT NULL REFERENCES inspection_results(id) ON DELETE RESTRICT, status varchar(16) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','succeeded','failed','skipped')), attempt_count integer NOT NULL DEFAULT 0, failure_code varchar(64), failure_message text, next_retry_at timestamptz, issue_id uuid REFERENCES safety_issues(id) ON DELETE RESTRICT, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
    )`);
    await q.query(`CREATE INDEX idx_issue_transfer_jobs_worker ON issue_transfer_jobs(status,next_retry_at)`);
    await q.query(`CREATE TABLE safety_capas (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), issue_id uuid NOT NULL REFERENCES safety_issues(id) ON DELETE RESTRICT, status varchar(24) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','in_progress','pending_verification','verified','closed')), verifier_user_id varchar(64) NOT NULL, effectiveness_required boolean NOT NULL DEFAULT true, closed_at timestamptz, closed_by varchar(64),
      created_by varchar(64) NOT NULL, updated_by varchar(64), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
    )`);
    await q.query(`CREATE UNIQUE INDEX uq_safety_capas_issue ON safety_capas(issue_id) WHERE deleted_at IS NULL`);
    await q.query(`CREATE TABLE capa_root_causes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), capa_id uuid NOT NULL REFERENCES safety_capas(id) ON DELETE RESTRICT, method varchar(16) NOT NULL CHECK (method IN ('five_whys','fishbone','category','other')), conclusion text NOT NULL, analysis jsonb NOT NULL DEFAULT '{}',
      created_by varchar(64) NOT NULL, updated_by varchar(64), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
    )`);
    await q.query(`CREATE UNIQUE INDEX uq_capa_root_causes_capa ON capa_root_causes(capa_id) WHERE deleted_at IS NULL`);
    await q.query(`CREATE TABLE capa_actions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), capa_id uuid NOT NULL REFERENCES safety_capas(id) ON DELETE RESTRICT, action_type varchar(16) NOT NULL CHECK (action_type IN ('corrective','preventive')), title varchar(500) NOT NULL, responsible_user_id varchar(64) NOT NULL, due_at timestamptz NOT NULL, status varchar(16) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','assigned','in_progress','submitted','returned','accepted','cancelled')), completion_statement text, submitted_at timestamptz,
      created_by varchar(64) NOT NULL, updated_by varchar(64), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
    )`);
    await q.query(`CREATE INDEX idx_capa_actions_responsible_due ON capa_actions(responsible_user_id,status,due_at)`);
    await q.query(`CREATE TABLE capa_action_evidence (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), capa_action_id uuid NOT NULL REFERENCES capa_actions(id) ON DELETE RESTRICT, file_id uuid NOT NULL REFERENCES files(id) ON DELETE RESTRICT, status varchar(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active','superseded','withdrawn')), withdraw_reason text,
      created_by varchar(64) NOT NULL, updated_by varchar(64), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
    )`);
    await q.query(`CREATE UNIQUE INDEX uq_capa_action_evidence ON capa_action_evidence(capa_action_id,file_id) WHERE deleted_at IS NULL`);
    await q.query(`CREATE TABLE capa_verifications (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), capa_id uuid NOT NULL REFERENCES safety_capas(id) ON DELETE RESTRICT, verifier_user_id varchar(64) NOT NULL, result varchar(16) NOT NULL CHECK (result IN ('passed','failed')), conclusion text NOT NULL, effectiveness_evaluation text, rework_reason text, created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT ck_capa_verifications_failed_reason CHECK ((result='failed' AND rework_reason IS NOT NULL AND length(trim(rework_reason)) > 0) OR result='passed')
    )`);
    await q.query(`CREATE INDEX idx_capa_verifications_capa_created ON capa_verifications(capa_id,created_at)`);
    await q.query(`CREATE TABLE inspection_capa_action_logs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), object_type varchar(32) NOT NULL, object_id uuid NOT NULL, action_type varchar(32) NOT NULL, request_id varchar(128), operator_user_id varchar(64) NOT NULL, reason text, before_snapshot jsonb NOT NULL DEFAULT '{}', after_snapshot jsonb NOT NULL DEFAULT '{}', metadata jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
    )`);
    await q.query(`CREATE UNIQUE INDEX uq_inspection_capa_action_request ON inspection_capa_action_logs(object_type,operator_user_id,request_id) WHERE request_id IS NOT NULL`);
  }

  async down(q: QueryRunner): Promise<void> {
    for (const table of ['inspection_capa_action_logs','capa_verifications','capa_action_evidence','capa_actions','capa_root_causes','safety_capas','issue_transfer_jobs','issue_sources','safety_issues','inspection_result_evidence','inspection_results','inspections','inspection_plans','inspection_template_scopes','inspection_template_items','inspection_template_versions','inspection_templates']) await q.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
  }
}
