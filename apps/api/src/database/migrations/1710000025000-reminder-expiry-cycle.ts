import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReminderExpiryCycle1710000025000 implements MigrationInterface {
  name = 'ReminderExpiryCycle1710000025000';
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(
      'DROP INDEX "uk_certificate_reminders_certificate_recipient_scheduled_type"',
    );
    await runner.query(
      'CREATE UNIQUE INDEX "uk_certificate_reminders_certificate_recipient_scheduled_type" ON "certificate_reminders" ("certificate_id", "recipient_user_id", "scheduled_date", "reminder_type", "certificate_expiry_date")',
    );
  }
  async down(runner: QueryRunner): Promise<void> {
    const duplicates: unknown[] = (await runner.query(
      'SELECT 1 FROM certificate_reminders GROUP BY certificate_id, recipient_user_id, scheduled_date, reminder_type HAVING COUNT(*) > 1 LIMIT 1',
    )) as unknown[];
    if (duplicates.length)
      throw new Error(
        '已有同日不同到期周期的提醒，不能无损恢复旧索引；请保留当前迁移',
      );
    await runner.query(
      'DROP INDEX "uk_certificate_reminders_certificate_recipient_scheduled_type"',
    );
    await runner.query(
      'CREATE UNIQUE INDEX "uk_certificate_reminders_certificate_recipient_scheduled_type" ON "certificate_reminders" ("certificate_id", "recipient_user_id", "scheduled_date", "reminder_type")',
    );
  }
}
