import { MigrationInterface, QueryRunner } from 'typeorm';

export class Wave5PlanTask1710000019000 implements MigrationInterface {
  name = 'Wave5PlanTask1710000019000';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE safety_plans (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title varchar(200) NOT NULL, description text,
      plan_type varchar(16) NOT NULL CHECK (plan_type IN ('annual','monthly','periodic','one_time')),
      status varchar(16) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','paused','retired')),
      owner_user_id varchar(64) NOT NULL, time_zone varchar(64) NOT NULL DEFAULT 'Asia/Shanghai' CHECK (time_zone='Asia/Shanghai'),
      vessel_id uuid REFERENCES vessels(id) ON DELETE RESTRICT, scope_snapshot jsonb NOT NULL DEFAULT '{}',
      created_by varchar(64) NOT NULL, updated_by varchar(64), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
    )`);
    await q.query(`CREATE INDEX idx_safety_plans_owner_status ON safety_plans(owner_user_id,status) WHERE deleted_at IS NULL`);
    await q.query(`CREATE INDEX idx_safety_plans_vessel_status ON safety_plans(vessel_id,status) WHERE deleted_at IS NULL`);

    await q.query(`CREATE TABLE safety_plan_items (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), plan_id uuid NOT NULL REFERENCES safety_plans(id) ON DELETE RESTRICT,
      title varchar(200) NOT NULL, description text, responsible_user_id varchar(64) NOT NULL,
      participant_snapshot jsonb NOT NULL DEFAULT '[]', completion_rule varchar(16) NOT NULL DEFAULT 'all' CHECK (completion_rule IN ('all','any','quorum')),
      quorum_count integer, recurrence jsonb NOT NULL, due_offset_minutes integer NOT NULL CHECK (due_offset_minutes >= 0),
      rule_version integer NOT NULL DEFAULT 1 CHECK (rule_version > 0), enabled boolean NOT NULL DEFAULT true,
      created_by varchar(64) NOT NULL, updated_by varchar(64), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz,
      CONSTRAINT ck_safety_plan_items_quorum CHECK ((completion_rule='quorum' AND quorum_count > 0) OR (completion_rule<>'quorum' AND quorum_count IS NULL))
    )`);
    await q.query(`CREATE UNIQUE INDEX uq_safety_plan_items_plan_title ON safety_plan_items(plan_id,title) WHERE deleted_at IS NULL`);
    await q.query(`CREATE INDEX idx_safety_plan_items_plan_enabled ON safety_plan_items(plan_id,enabled) WHERE deleted_at IS NULL`);

    await q.query(`CREATE TABLE safety_tasks (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), plan_id uuid NOT NULL REFERENCES safety_plans(id) ON DELETE RESTRICT,
      plan_item_id uuid NOT NULL REFERENCES safety_plan_items(id) ON DELETE RESTRICT, generation_key varchar(128) NOT NULL,
      title varchar(200) NOT NULL, status varchar(16) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','blocked','completed','cancelled')),
      responsible_user_id varchar(64) NOT NULL, scheduled_at timestamptz NOT NULL, due_at timestamptz NOT NULL, completed_at timestamptz,
      vessel_id uuid REFERENCES vessels(id) ON DELETE RESTRICT, scope_snapshot jsonb NOT NULL DEFAULT '{}', rule_version integer NOT NULL,
      created_by varchar(64) NOT NULL, updated_by varchar(64), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz,
      CONSTRAINT ck_safety_tasks_due CHECK (due_at >= scheduled_at)
    )`);
    await q.query(`CREATE UNIQUE INDEX uq_safety_tasks_generation_key ON safety_tasks(generation_key) WHERE deleted_at IS NULL`);
    await q.query(`CREATE INDEX idx_safety_tasks_responsible_due ON safety_tasks(responsible_user_id,status,due_at) WHERE deleted_at IS NULL`);
    await q.query(`CREATE INDEX idx_safety_tasks_plan_scheduled ON safety_tasks(plan_id,scheduled_at) WHERE deleted_at IS NULL`);
    await q.query(`CREATE INDEX idx_safety_tasks_item_scheduled ON safety_tasks(plan_item_id,scheduled_at) WHERE deleted_at IS NULL`);
    await q.query(`CREATE INDEX idx_safety_tasks_vessel_due ON safety_tasks(vessel_id,due_at) WHERE deleted_at IS NULL`);

    await q.query(`CREATE TABLE safety_task_participants (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), task_id uuid NOT NULL REFERENCES safety_tasks(id) ON DELETE RESTRICT,
      user_id varchar(64) NOT NULL, role varchar(16) NOT NULL CHECK (role IN ('executor','collaborator','reviewer','observer','delegate')),
      status varchar(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active','transferred','withdrawn')),
      effective_from timestamptz, effective_until timestamptz, transferred_to_user_id varchar(64), completed_at timestamptz,
      created_by varchar(64) NOT NULL, updated_by varchar(64), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz,
      CONSTRAINT ck_safety_task_participants_period CHECK (effective_until IS NULL OR effective_from IS NULL OR effective_until > effective_from)
    )`);
    await q.query(`CREATE UNIQUE INDEX uq_safety_task_participants_active ON safety_task_participants(task_id,user_id,role) WHERE status='active' AND deleted_at IS NULL`);
    await q.query(`CREATE INDEX idx_safety_task_participants_user_status ON safety_task_participants(user_id,status)`);
    await q.query(`CREATE INDEX idx_safety_task_participants_task ON safety_task_participants(task_id)`);

    await q.query(`CREATE TABLE safety_task_action_logs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), task_id uuid NOT NULL REFERENCES safety_tasks(id) ON DELETE RESTRICT,
      action_type varchar(32) NOT NULL, operator_user_id varchar(64) NOT NULL, reason text, from_status varchar(16), to_status varchar(16),
      request_id varchar(128), before_snapshot jsonb NOT NULL DEFAULT '{}', after_snapshot jsonb NOT NULL DEFAULT '{}', metadata jsonb NOT NULL DEFAULT '{}',
      created_by varchar(64) NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
    )`);
    await q.query(`CREATE UNIQUE INDEX uq_safety_task_action_request ON safety_task_action_logs(operator_user_id,request_id) WHERE request_id IS NOT NULL`);
    await q.query(`CREATE INDEX idx_safety_task_action_logs_task_created ON safety_task_action_logs(task_id,created_at)`);

    await q.query(`CREATE TABLE safety_task_transfers (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), task_id uuid NOT NULL REFERENCES safety_tasks(id) ON DELETE RESTRICT,
      from_user_id varchar(64) NOT NULL, to_user_id varchar(64) NOT NULL, reason text NOT NULL, transferred_by varchar(64) NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(), CONSTRAINT ck_safety_task_transfer_users CHECK (from_user_id <> to_user_id)
    )`);
    await q.query(`CREATE INDEX idx_safety_task_transfers_task_created ON safety_task_transfers(task_id,created_at)`);

    await q.query(`CREATE TABLE safety_task_delegations (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), task_id uuid NOT NULL REFERENCES safety_tasks(id) ON DELETE RESTRICT,
      delegator_user_id varchar(64) NOT NULL, delegate_user_id varchar(64) NOT NULL, effective_from timestamptz NOT NULL, effective_until timestamptz NOT NULL,
      reason text NOT NULL, status varchar(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active','withdrawn','expired')),
      created_by varchar(64) NOT NULL, updated_by varchar(64), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz,
      CONSTRAINT ck_safety_task_delegation_users CHECK (delegator_user_id <> delegate_user_id),
      CONSTRAINT ck_safety_task_delegation_period CHECK (effective_until > effective_from)
    )`);
    await q.query(`CREATE INDEX idx_safety_task_delegations_delegate_period ON safety_task_delegations(delegate_user_id,status,effective_until)`);
    await q.query(`CREATE INDEX idx_safety_task_delegations_task ON safety_task_delegations(task_id)`);

    await q.query(`CREATE TABLE safety_task_generation_runs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), plan_id uuid NOT NULL REFERENCES safety_plans(id) ON DELETE RESTRICT,
      trigger_source varchar(16) NOT NULL, mode varchar(16) NOT NULL CHECK (mode IN ('generate','reconcile')),
      status varchar(16) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','succeeded','failed')),
      window_start timestamptz NOT NULL, window_end timestamptz NOT NULL, created_count integer NOT NULL DEFAULT 0,
      skipped_count integer NOT NULL DEFAULT 0, failed_count integer NOT NULL DEFAULT 0,
      requested_by varchar(64) NOT NULL, request_id varchar(128) NOT NULL, requested_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz, failure_message text,
      CONSTRAINT ck_safety_task_generation_window CHECK (window_end > window_start),
      CONSTRAINT uq_safety_task_generation_request UNIQUE (requested_by,request_id)
    )`);
    await q.query(`CREATE INDEX idx_safety_task_generation_runs_plan_requested ON safety_task_generation_runs(plan_id,requested_at)`);

    await q.query(`CREATE TABLE safety_task_generation_entries (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), run_id uuid NOT NULL REFERENCES safety_task_generation_runs(id) ON DELETE RESTRICT,
      plan_item_id uuid NOT NULL REFERENCES safety_plan_items(id) ON DELETE RESTRICT, generation_key varchar(128) NOT NULL,
      occurrence_at timestamptz NOT NULL, status varchar(16) NOT NULL CHECK (status IN ('queued','running','succeeded','failed','skipped')),
      task_id uuid REFERENCES safety_tasks(id) ON DELETE RESTRICT, attempt_count integer NOT NULL DEFAULT 0,
      failure_code varchar(64), failure_message text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT uq_safety_task_generation_entry UNIQUE (run_id,generation_key)
    )`);
    await q.query(`CREATE INDEX idx_safety_task_generation_entries_run ON safety_task_generation_entries(run_id,status)`);
    await q.query(`CREATE INDEX idx_safety_task_generation_entries_item_occurrence ON safety_task_generation_entries(plan_item_id,occurrence_at)`);
    await q.query(`CREATE INDEX idx_safety_task_generation_entries_task ON safety_task_generation_entries(task_id)`);

    await q.query(`CREATE TABLE safety_task_notification_deliveries (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), task_id uuid NOT NULL REFERENCES safety_tasks(id) ON DELETE RESTRICT,
      recipient_user_id varchar(64) NOT NULL, message_type varchar(16) NOT NULL CHECK (message_type IN ('assignment','reminder','escalation','transfer')),
      dedupe_key varchar(255) NOT NULL, payload_snapshot jsonb NOT NULL DEFAULT '{}',
      status varchar(16) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','dispatching','sent','failed','skipped')),
      attempt_count integer NOT NULL DEFAULT 0, attempt_history jsonb NOT NULL DEFAULT '[]', wecom_errcode integer, failure_reason text, next_retry_at timestamptz, sent_at timestamptz,
      created_by varchar(64) NOT NULL, updated_by varchar(64), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
    )`);
    await q.query(`CREATE UNIQUE INDEX uq_safety_task_notification_dedupe ON safety_task_notification_deliveries(dedupe_key) WHERE deleted_at IS NULL`);
    await q.query(`CREATE INDEX idx_safety_task_delivery_worker ON safety_task_notification_deliveries(status,next_retry_at) WHERE deleted_at IS NULL`);
    await q.query(`CREATE INDEX idx_safety_task_delivery_task_created ON safety_task_notification_deliveries(task_id,created_at) WHERE deleted_at IS NULL`);
  }

  async down(q: QueryRunner): Promise<void> {
    for (const table of [
      'safety_task_notification_deliveries',
      'safety_task_generation_entries',
      'safety_task_generation_runs',
      'safety_task_delegations',
      'safety_task_transfers',
      'safety_task_action_logs',
      'safety_task_participants',
      'safety_tasks',
      'safety_plan_items',
      'safety_plans',
    ]) {
      await q.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
    }
  }
}
