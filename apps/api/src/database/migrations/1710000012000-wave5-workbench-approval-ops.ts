import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Wave51710000012000 implements MigrationInterface {
  name = 'Wave51710000012000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "wecom_approval_callback_events" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "event_id" VARCHAR(128) NOT NULL,
        "process_instance_id" VARCHAR(128) NOT NULL,
        "callback_version" INTEGER NOT NULL,
        "signature" VARCHAR(128),
        "request_timestamp" VARCHAR(32),
        "request_nonce" VARCHAR(128),
        "payload_digest" TEXT,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_wecom_approval_callback_events_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX "uk_wecom_approval_callback_events_event_id" ON "wecom_approval_callback_events" ("event_id")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uk_wecom_approval_callback_events_instance_version" ON "wecom_approval_callback_events" ("process_instance_id", "callback_version")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_wecom_approval_callback_events_created_at" ON "wecom_approval_callback_events" ("created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_wecom_approval_callback_events_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "uk_wecom_approval_callback_events_instance_version"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "uk_wecom_approval_callback_events_event_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "wecom_approval_callback_events"`);
  }
}
