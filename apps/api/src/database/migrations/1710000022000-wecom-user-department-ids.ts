import { MigrationInterface, QueryRunner } from 'typeorm';

export class WecomUserDepartmentIds1710000022000
  implements MigrationInterface
{
  name = 'WecomUserDepartmentIds1710000022000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "wecom_users"
      ADD COLUMN "department_ids" JSONB NOT NULL DEFAULT '[]'::jsonb
    `);

    await queryRunner.query(`
      UPDATE "wecom_users"
      SET "department_ids" = COALESCE("raw_profile"->'department', '[]'::jsonb)
      WHERE jsonb_typeof("raw_profile"->'department') = 'array'
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "wecom_users"
      DROP COLUMN "department_ids"
    `);
  }
}
