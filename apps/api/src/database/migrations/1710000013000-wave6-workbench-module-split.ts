import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Wave61710000013000 implements MigrationInterface {
  name = 'Wave61710000013000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      WITH candidates AS (
        SELECT
          id,
          lower(
            concat_ws(
              ' ',
              title,
              summary,
              COALESCE(payload ->> 'operationName', ''),
              COALESCE(payload ->> 'operationType', ''),
              COALESCE(payload ->> 'serviceType', '')
            )
          ) AS search_text
        FROM workbench_records
        WHERE module_code = 'business_operation_flow'
          AND deleted_at IS NULL
      )
      UPDATE workbench_records AS records
      SET
        module_code = CASE
          WHEN candidates.search_text LIKE '%接收工作组%' OR candidates.search_text LIKE '%receiving workgroup%' THEN 'business_receiving_workgroup_flow'
          WHEN candidates.search_text LIKE '%围油栏%' OR candidates.search_text LIKE '%油栏%' OR candidates.search_text LIKE '%oil boom%' THEN 'business_oil_boom_operation'
          WHEN candidates.search_text LIKE '%垃圾%' OR candidates.search_text LIKE '%garbage%' THEN 'business_ship_garbage_operation'
          WHEN candidates.search_text LIKE '%污油水%' OR candidates.search_text LIKE '%含油污水%' OR candidates.search_text LIKE '%oily water%' THEN 'business_ship_oily_water_operation'
          WHEN candidates.search_text LIKE '%生活污水%' OR candidates.search_text LIKE '%domestic sewage%' THEN 'business_domestic_sewage_operation'
          ELSE records.module_code
        END,
        payload = COALESCE(records.payload, '{}'::jsonb) || jsonb_build_object(
          'm6ModuleSplitMigrated', true,
          'm6OriginalModuleCode', 'business_operation_flow'
        )
      FROM candidates
      WHERE records.id = candidates.id
        AND (
          candidates.search_text LIKE '%接收工作组%'
          OR candidates.search_text LIKE '%receiving workgroup%'
          OR candidates.search_text LIKE '%围油栏%'
          OR candidates.search_text LIKE '%油栏%'
          OR candidates.search_text LIKE '%oil boom%'
          OR candidates.search_text LIKE '%垃圾%'
          OR candidates.search_text LIKE '%garbage%'
          OR candidates.search_text LIKE '%污油水%'
          OR candidates.search_text LIKE '%含油污水%'
          OR candidates.search_text LIKE '%oily water%'
          OR candidates.search_text LIKE '%生活污水%'
          OR candidates.search_text LIKE '%domestic sewage%'
        )
    `);

    await queryRunner.query(`
      UPDATE workbench_records
      SET payload = COALESCE(payload, '{}'::jsonb) || jsonb_build_object(
        'legacy', true,
        'm6OriginalModuleCode', 'business_operation_flow'
      )
      WHERE module_code = 'business_operation_flow'
        AND deleted_at IS NULL
        AND COALESCE(payload ->> 'm6ModuleSplitMigrated', 'false') <> 'true'
        AND COALESCE(payload ->> 'legacy', 'false') <> 'true'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE workbench_records
      SET
        module_code = 'business_operation_flow',
        payload = COALESCE(payload, '{}'::jsonb) - 'm6ModuleSplitMigrated' - 'm6OriginalModuleCode'
      WHERE module_code IN (
        'business_receiving_workgroup_flow',
        'business_oil_boom_operation',
        'business_ship_garbage_operation',
        'business_ship_oily_water_operation',
        'business_domestic_sewage_operation'
      )
        AND deleted_at IS NULL
        AND payload ->> 'm6ModuleSplitMigrated' = 'true'
    `);

    await queryRunner.query(`
      UPDATE workbench_records
      SET payload = COALESCE(payload, '{}'::jsonb) - 'legacy' - 'm6OriginalModuleCode'
      WHERE module_code = 'business_operation_flow'
        AND deleted_at IS NULL
        AND payload ->> 'legacy' = 'true'
        AND payload ->> 'm6OriginalModuleCode' = 'business_operation_flow'
    `);
  }
}
