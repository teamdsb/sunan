import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Wave41710000006000 implements MigrationInterface {
  name = 'Wave41710000006000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "certificate_reminders" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "certificate_id" UUID NOT NULL,
        "certificate_type_id" UUID NOT NULL,
        "certificate_type_name" VARCHAR(64) NOT NULL,
        "certificate_title" VARCHAR(128) NOT NULL,
        "owner_type" VARCHAR(16) NOT NULL,
        "owner_id" UUID NOT NULL,
        "owner_name" VARCHAR(128) NOT NULL,
        "certificate_expiry_date" DATE NOT NULL,
        "recipient_user_id" VARCHAR(64) NOT NULL,
        "reminder_type" VARCHAR(16) NOT NULL,
        "status" VARCHAR(16) NOT NULL DEFAULT 'pending',
        "scheduled_date" DATE NOT NULL,
        "days_before_expiry" INTEGER NOT NULL,
        "sent_at" TIMESTAMPTZ,
        "acknowledged_at" TIMESTAMPTZ,
        "acknowledged_by" VARCHAR(64),
        "failure_reason" TEXT,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_certificate_reminders_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_certificate_reminders_certificate" FOREIGN KEY ("certificate_id") REFERENCES "certificates"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_certificate_reminders_certificate_id" ON "certificate_reminders" ("certificate_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_certificate_reminders_recipient_user_id_status" ON "certificate_reminders" ("recipient_user_id", "status")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uk_certificate_reminders_certificate_recipient_scheduled_type" ON "certificate_reminders" ("certificate_id", "recipient_user_id", "scheduled_date", "reminder_type")`,
    );
    await queryRunner.query(
      `CREATE TRIGGER set_certificate_reminders_updated_at BEFORE UPDATE ON "certificate_reminders" FOR EACH ROW EXECUTE FUNCTION set_updated_at()`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS set_certificate_reminders_updated_at ON "certificate_reminders"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "uk_certificate_reminders_certificate_recipient_scheduled_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_certificate_reminders_recipient_user_id_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_certificate_reminders_certificate_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "certificate_reminders"`);
  }
}
