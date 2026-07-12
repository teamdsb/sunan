import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Wave3EvidenceAudits1710000016000 implements MigrationInterface {
  name = 'Wave3EvidenceAudits1710000016000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "evidence_audits" (
      "id" UUID NOT NULL DEFAULT gen_random_uuid(), "object_type" VARCHAR(64) NOT NULL, "object_id" UUID NOT NULL,
      "file_id" UUID, "action" VARCHAR(64) NOT NULL, "reason" VARCHAR(500), "operator_user_id" VARCHAR(64) NOT NULL,
      "request_id" VARCHAR(128), "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb, "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT "PK_evidence_audits_id" PRIMARY KEY ("id"),
      CONSTRAINT "FK_evidence_audits_file" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE RESTRICT
    )`);
    await queryRunner.query(`CREATE INDEX "idx_evidence_audits_object_created" ON "evidence_audits" ("object_type", "object_id", "created_at" DESC)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_evidence_audits_object_created"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "evidence_audits"`);
  }
}
