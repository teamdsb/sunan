import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Preserve the existing voyage approval template while introducing a datetime
 * field schema for deployments that already have the v1 runtime catalog.
 */
export class WorkbenchVoyageSchemaV21710000023000 implements MigrationInterface {
  name = 'WorkbenchVoyageSchemaV21710000023000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "workbench_templates" (
        "module_code",
        "template_code",
        "template_type",
        "schema_version",
        "field_schema",
        "step_schema",
        "print_schema",
        "approval_template_code",
        "enabled"
      )
      SELECT
        source."module_code",
        'shipping_voyage_approval_v2',
        source."template_type",
        2,
        jsonb_set(
          source."field_schema",
          '{sections}',
          (
            SELECT COALESCE(jsonb_agg(
              CASE
                WHEN jsonb_typeof(section.value->'fields') = 'array' THEN jsonb_set(
                  section.value,
                  '{fields}',
                  (
                    SELECT COALESCE(jsonb_agg(
                      CASE
                        WHEN field.value->>'key' = 'departureAt' THEN jsonb_set(field.value, '{inputType}', '"datetime"'::jsonb, true)
                        ELSE field.value
                      END ORDER BY field.ordinality
                    ), '[]'::jsonb)
                    FROM jsonb_array_elements(section.value->'fields') WITH ORDINALITY AS field(value, ordinality)
                  ),
                  true
                )
                ELSE section.value
              END ORDER BY section.ordinality
            ), '[]'::jsonb)
            FROM jsonb_array_elements(source."field_schema"->'sections') WITH ORDINALITY AS section(value, ordinality)
          ),
          true
        ),
        source."step_schema",
        source."print_schema",
        'shipping_voyage_approval_v2',
        source."enabled"
      FROM "workbench_templates" AS source
      WHERE source."module_code" = 'shipping_voyage_approval'
        AND source."template_code" = 'shipping_voyage_approval_v1'
        AND source."schema_version" = 1
      ON CONFLICT ("template_code", "schema_version") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "workbench_templates"
      WHERE "module_code" = 'shipping_voyage_approval'
        AND "template_code" = 'shipping_voyage_approval_v2'
        AND "schema_version" = 2
    `);
  }
}
