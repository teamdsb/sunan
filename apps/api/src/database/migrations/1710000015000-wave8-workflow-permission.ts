import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Wave8WorkflowPermission1710000015000 implements MigrationInterface {
  name = 'Wave8WorkflowPermission1710000015000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "workbench_record_steps" ADD COLUMN "completion_rule" VARCHAR(16) NOT NULL DEFAULT 'all'`);
    await queryRunner.query(`ALTER TABLE "workbench_record_steps" ADD COLUMN "quorum_count" INTEGER`);
    await queryRunner.query(`CREATE TABLE "workbench_record_participants" ("id" UUID NOT NULL DEFAULT gen_random_uuid(), "business_record_id" UUID NOT NULL, "step_id" UUID, "user_id" VARCHAR(64) NOT NULL, "role" VARCHAR(32) NOT NULL, "status" VARCHAR(32) NOT NULL DEFAULT 'active', "completed_at" TIMESTAMPTZ, "created_by" VARCHAR(64) NOT NULL, "updated_by" VARCHAR(64), "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(), "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(), "deleted_at" TIMESTAMPTZ, CONSTRAINT "PK_workbench_record_participants_id" PRIMARY KEY ("id"), CONSTRAINT "FK_workbench_record_participants_record" FOREIGN KEY ("business_record_id") REFERENCES "workbench_records"("id") ON DELETE RESTRICT, CONSTRAINT "FK_workbench_record_participants_step" FOREIGN KEY ("step_id") REFERENCES "workbench_record_steps"("id") ON DELETE RESTRICT)`);
    await queryRunner.query(`CREATE INDEX "idx_workbench_record_participants_record_step" ON "workbench_record_participants" ("business_record_id", "step_id")`);
    await queryRunner.query(`CREATE INDEX "idx_workbench_record_participants_user_status" ON "workbench_record_participants" ("user_id", "status") WHERE "deleted_at" IS NULL`);
    await queryRunner.query(`CREATE UNIQUE INDEX "uq_workbench_record_participants_active" ON "workbench_record_participants" ("business_record_id", "step_id", "user_id", "role") WHERE "deleted_at" IS NULL`);
    await queryRunner.query(`CREATE TABLE "workbench_delegations" ("id" UUID NOT NULL DEFAULT gen_random_uuid(), "business_record_id" UUID, "step_id" UUID, "delegator_user_id" VARCHAR(64) NOT NULL, "delegatee_user_id" VARCHAR(64) NOT NULL, "effective_from" TIMESTAMPTZ NOT NULL, "effective_to" TIMESTAMPTZ NOT NULL, "status" VARCHAR(32) NOT NULL DEFAULT 'active', "reason" TEXT, "created_by" VARCHAR(64) NOT NULL, "updated_by" VARCHAR(64), "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(), "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(), "deleted_at" TIMESTAMPTZ, CONSTRAINT "PK_workbench_delegations_id" PRIMARY KEY ("id"), CONSTRAINT "CK_workbench_delegations_distinct_users" CHECK ("delegator_user_id" <> "delegatee_user_id"), CONSTRAINT "CK_workbench_delegations_validity" CHECK ("effective_to" > "effective_from"), CONSTRAINT "FK_workbench_delegations_record" FOREIGN KEY ("business_record_id") REFERENCES "workbench_records"("id") ON DELETE RESTRICT, CONSTRAINT "FK_workbench_delegations_step" FOREIGN KEY ("step_id") REFERENCES "workbench_record_steps"("id") ON DELETE RESTRICT)`);
    await queryRunner.query(`CREATE INDEX "idx_workbench_delegations_delegator_validity" ON "workbench_delegations" ("delegator_user_id", "effective_from", "effective_to") WHERE "deleted_at" IS NULL`);
    await queryRunner.query(`CREATE INDEX "idx_workbench_delegations_delegatee_validity" ON "workbench_delegations" ("delegatee_user_id", "effective_from", "effective_to") WHERE "deleted_at" IS NULL`);
    await queryRunner.query(`CREATE TABLE "workbench_record_transfers" ("id" UUID NOT NULL DEFAULT gen_random_uuid(), "business_record_id" UUID NOT NULL, "from_user_id" VARCHAR(64) NOT NULL, "to_user_id" VARCHAR(64) NOT NULL, "reason" TEXT NOT NULL, "transferred_by" VARCHAR(64) NOT NULL, "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(), CONSTRAINT "PK_workbench_record_transfers_id" PRIMARY KEY ("id"), CONSTRAINT "CK_workbench_record_transfers_distinct_users" CHECK ("from_user_id" <> "to_user_id"), CONSTRAINT "FK_workbench_record_transfers_record" FOREIGN KEY ("business_record_id") REFERENCES "workbench_records"("id") ON DELETE RESTRICT)`);
    await queryRunner.query(`CREATE INDEX "idx_workbench_record_transfers_record_created" ON "workbench_record_transfers" ("business_record_id", "created_at")`);
    await queryRunner.query(`ALTER TABLE "workbench_record_action_logs" ADD COLUMN "request_id" VARCHAR(128)`);
    await queryRunner.query(`ALTER TABLE "workbench_record_action_logs" ADD COLUMN "action_scope" VARCHAR(32) NOT NULL DEFAULT 'record'`);
    await queryRunner.query(`ALTER TABLE "workbench_record_action_logs" ADD COLUMN "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "workbench_record_action_logs" DROP COLUMN "metadata"`);
    await queryRunner.query(`ALTER TABLE "workbench_record_action_logs" DROP COLUMN "action_scope"`);
    await queryRunner.query(`ALTER TABLE "workbench_record_action_logs" DROP COLUMN "request_id"`);
    await queryRunner.query(`DROP TABLE "workbench_record_transfers"`);
    await queryRunner.query(`DROP TABLE "workbench_delegations"`);
    await queryRunner.query(`DROP TABLE "workbench_record_participants"`);
    await queryRunner.query(`ALTER TABLE "workbench_record_steps" DROP COLUMN "quorum_count"`);
    await queryRunner.query(`ALTER TABLE "workbench_record_steps" DROP COLUMN "completion_rule"`);
  }
}
