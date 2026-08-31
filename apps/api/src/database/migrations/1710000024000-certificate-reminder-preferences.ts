import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CertificateReminderPreferences1710000024000 implements MigrationInterface {
  name = 'CertificateReminderPreferences1710000024000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "certificates" ADD COLUMN IF NOT EXISTS "reminder_enabled" BOOLEAN NOT NULL DEFAULT TRUE`);
    await queryRunner.query(`ALTER TABLE "certificates" ADD COLUMN IF NOT EXISTS "reminder_recipient_user_id" VARCHAR(64)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_certificates_reminder_recipient" ON "certificates" ("reminder_recipient_user_id") WHERE "deleted_at" IS NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_certificates_reminder_recipient"`);
    await queryRunner.query(`ALTER TABLE "certificates" DROP COLUMN IF EXISTS "reminder_recipient_user_id"`);
    await queryRunner.query(`ALTER TABLE "certificates" DROP COLUMN IF EXISTS "reminder_enabled"`);
  }
}
