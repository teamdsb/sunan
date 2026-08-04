import { DataSource } from 'typeorm';
import type { DataSourceOptions } from 'typeorm';

import { LegacySafetyMigrator } from 'src/database/legacy-safety-migrator';
import { bootstrapPgTestDatabase, buildPgTypeOrmOptions, shutdownPgTestDatabase } from 'test/pg-test-container';

describe('M8 Wave 7 legacy migration and schema audit', () => {
  let source: DataSource;

  beforeAll(async () => {
    await bootstrapPgTestDatabase();
    source = new DataSource(buildPgTypeOrmOptions() as DataSourceOptions);
    await source.initialize();
  });

  beforeEach(async () => {
    await source.query(`TRUNCATE TABLE legacy_safety_migration_rows,legacy_safety_migration_batches,inspection_capa_action_logs,capa_verifications,capa_action_evidence,capa_actions,capa_root_causes,safety_capas,issue_transfer_jobs,issue_sources,safety_issues,inspection_result_evidence,inspection_results,inspections,inspection_plans,inspection_template_scopes,inspection_template_items,inspection_template_versions,inspection_templates,workbench_records RESTART IDENTITY CASCADE`);
  });

  afterAll(async () => {
    await source?.destroy();
    await shutdownPgTestDatabase();
  });

  async function insertLegacy(moduleCode: string, status: string, suffix: string, payload: Record<string, unknown> = {}) {
    const id = crypto.randomUUID();
    await source.query(`INSERT INTO workbench_records(id,module_code,template_code,record_no,status,title,summary,department_code,owner_user_id,applicant_user_id,assignee_user_id,occurred_at,closed_at,payload) VALUES($1,$2,'legacy-inspection',$3,$4,$5,'legacy source must remain unchanged','shipping','legacy-owner','legacy-owner','legacy-assignee','2026-06-01T00:00:00Z',$6,$7::jsonb)`, [id, moduleCode, `LEG-${suffix}`, status, `Legacy ${suffix}`, status === 'closed' ? '2026-06-10T00:00:00Z' : null, JSON.stringify(payload)]);
    return id;
  }

  it('classifies, migrates, reconciles, replays and rolls back without changing source records', async () => {
    await insertLegacy('goa_safety_hazard', 'assigned', 'hazard', { severity: 'major' });
    await insertLegacy('shipping_self_inspection', 'in_progress', 'self');
    await insertLegacy('shipping_vessel_inspection', 'pending_review', 'vessel');
    await insertLegacy('shipping_maritime_safety_check', 'closed', 'maritime');
    const before = await source.query(`SELECT id,module_code,status,title,summary,payload FROM workbench_records ORDER BY id`);
    const migrator = new LegacySafetyMigrator(source);

    const classified = await migrator.classify();
    expect(classified.reduce((sum, row) => sum + row.count, 0)).toBe(4);

    const [first, replay] = await Promise.all([
      migrator.run('wave7-migration', 'wave7-first'),
      migrator.run('wave7-migration', 'wave7-replay'),
    ]);
    const summaries = [first, replay].sort((left, right) => right.createdCount - left.createdCount);
    expect(summaries[0]).toEqual(expect.objectContaining({ sourceCount: 4, createdCount: 4, skippedCount: 0, failedCount: 0, linkedCount: 4, sourceUnchangedCount: 4 }));
    expect(summaries[1]).toEqual(expect.objectContaining({ sourceCount: 4, createdCount: 0, skippedCount: 4, failedCount: 0, linkedCount: 4, sourceUnchangedCount: 4 }));
    expect(await source.query(`SELECT issue_type,status,count(*)::int FROM safety_issues GROUP BY issue_type,status ORDER BY issue_type,status`)).toEqual([
      { issue_type: 'external', status: 'closed', count: 1 },
      { issue_type: 'general', status: 'action_in_progress', count: 1 },
      { issue_type: 'general', status: 'pending_verification', count: 1 },
      { issue_type: 'hazard', status: 'open', count: 1 },
    ]);
    expect(await source.query(`SELECT bool_and((source_snapshot->'mapping'->>'legacyReadOnly')::boolean) AS value FROM issue_sources`)).toEqual([{ value: true }]);
    expect(await source.query(`SELECT id,module_code,status,title,summary,payload FROM workbench_records ORDER BY id`)).toEqual(before);
    const guardedId = (before[0] as { id: string }).id;
    await expect(source.query(`UPDATE workbench_records SET title='must not change' WHERE id=$1`, [guardedId])).rejects.toThrow('migrated safety source is read-only');

    const rollbackTarget = summaries[0]!.batchId;
    expect(await migrator.rollback(rollbackTarget)).toEqual({ batchId: rollbackTarget, rolledBack: 4, retained: 0 });
    expect(await source.query(`SELECT id FROM safety_issues`)).toHaveLength(0);
    expect(await source.query(`SELECT id,module_code,status,title,summary,payload FROM workbench_records ORDER BY id`)).toEqual(before);
    await expect(source.query(`UPDATE workbench_records SET title=title WHERE id=$1`, [guardedId])).resolves.toBeDefined();
    expect(await migrator.run('wave7-migration', 'wave7-after-rollback')).toEqual(expect.objectContaining({ createdCount: 4, failedCount: 0, sourceUnchangedCount: 4 }));
  });

  it('isolates a bad row, retains diagnostics, and remains recoverable', async () => {
    const badId = await insertLegacy('goa_safety_hazard', 'assigned', 'conflict');
    await insertLegacy('shipping_self_inspection', 'assigned', 'healthy');
    const key = (await import('node:crypto')).createHash('sha256').update(`legacy-workbench:${badId}`).digest('hex');
    await source.query(`INSERT INTO safety_issues(issue_no,title,issue_type,severity,status,responsible_user_id,due_at,idempotency_key,created_by,updated_by) VALUES($1,'conflict','hazard','minor','open','someone',now(),'unrelated','test','test')`, [`M8L-${key.slice(0, 12).toUpperCase()}`]);
    const summary = await new LegacySafetyMigrator(source).run('wave7-migration', 'wave7-partial-failure');
    expect(summary).toEqual(expect.objectContaining({ status: 'completed_with_errors', sourceCount: 2, createdCount: 1, failedCount: 1, linkedCount: 1, sourceUnchangedCount: 1 }));
    expect(await source.query(`SELECT error_code,error_message FROM legacy_safety_migration_rows WHERE mapping_status='failed'`)).toEqual([expect.objectContaining({ error_code: 'migration_error', error_message: expect.stringContaining('duplicate key') })]);
  });

  it('migrates a representative batch within the pre-release budget', async () => {
    const values: unknown[] = [];
    const tuples: string[] = [];
    for (let index = 0; index < 100; index += 1) {
      const offset = values.length;
      values.push(crypto.randomUUID(), `PERF-${index}`, `Performance ${index}`);
      tuples.push(`($${offset + 1},'shipping_self_inspection','legacy-inspection',$${offset + 2},'assigned',$${offset + 3},'performance source','shipping','legacy-owner','legacy-owner',now(),'{}'::jsonb)`);
    }
    await source.query(`INSERT INTO workbench_records(id,module_code,template_code,record_no,status,title,summary,department_code,owner_user_id,applicant_user_id,occurred_at,payload) VALUES ${tuples.join(',')}`, values);
    const started = performance.now();
    const summary = await new LegacySafetyMigrator(source).run('wave7-migration', 'wave7-performance');
    const durationMs = performance.now() - started;
    expect(summary).toEqual(expect.objectContaining({ sourceCount: 100, createdCount: 100, failedCount: 0, linkedCount: 100 }));
    expect(durationMs).toBeLessThan(10_000);
  });

  it('has an index whose leading columns cover every foreign key', async () => {
    const missing = await source.query(`
      WITH fk AS (SELECT c.conrelid,c.conname,c.conkey FROM pg_constraint c WHERE c.contype='f' AND c.connamespace='public'::regnamespace)
      SELECT c.conrelid::regclass::text AS table_name,c.conname
      FROM fk c
      WHERE NOT EXISTS (
        SELECT 1 FROM pg_index i
        WHERE i.indrelid=c.conrelid AND i.indisvalid
          AND (i.indkey::smallint[])[0:cardinality(c.conkey)-1] @> c.conkey
      )
      ORDER BY table_name,conname
    `);
    expect(missing).toEqual([]);
  });

  it('runs every registered migration down, up, and repeated up without drift', async () => {
    const initial = await source.query(`SELECT count(*)::int AS count FROM migrations`);
    expect(initial).toEqual([{ count: 23 }]);
    for (let remaining = 23; remaining > 0; remaining -= 1) {
      await source.undoLastMigration({ transaction: 'each' });
    }
    expect(await source.query(`SELECT to_regclass('public.wecom_users') AS table_name`)).toEqual([{ table_name: null }]);
    const reapplied = await source.runMigrations({ transaction: 'each' });
    expect(reapplied).toHaveLength(23);
    expect(await source.runMigrations({ transaction: 'each' })).toEqual([]);
    expect(await source.query(`SELECT count(*)::int AS count FROM migrations`)).toEqual([{ count: 23 }]);
  });
});
