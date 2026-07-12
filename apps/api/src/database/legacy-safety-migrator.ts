import { createHash } from 'node:crypto';

import type { DataSource, QueryRunner } from 'typeorm';

export const LEGACY_SAFETY_MODULES = [
  'goa_safety_hazard',
  'shipping_self_inspection',
  'shipping_vessel_inspection',
  'shipping_maritime_safety_check',
] as const;

type SourceRecord = {
  id: string;
  module_code: string;
  record_no: string;
  status: string;
  title: string;
  summary: string;
  department_code: string;
  vessel_id: string | null;
  owner_user_id: string;
  assignee_user_id: string | null;
  occurred_at: Date;
  closed_at: Date | null;
  payload: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
};

type Mapping = {
  issueType: 'hazard' | 'general' | 'external';
  issueStatus: 'open' | 'action_in_progress' | 'pending_verification' | 'closed';
  severity: 'minor' | 'major' | 'critical';
  dueAt: Date;
};

export type LegacyMigrationSummary = {
  batchId: string;
  requestId: string;
  status: string;
  sourceCount: number;
  createdCount: number;
  skippedCount: number;
  failedCount: number;
  sourceUnchangedCount: number;
  linkedCount: number;
};

const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const hashText = (value: string) => createHash('sha256').update(value).digest('hex');
const rowsOf = <T>(value: unknown): T[] => {
  if (!Array.isArray(value)) throw new Error('database query did not return rows');
  return value as T[];
};

export class LegacySafetyMigrator {
  constructor(private readonly dataSource: DataSource) {}

  async classify(): Promise<Array<{ module: string; status: string; count: number; issueType: string; issueStatus: string }>> {
    const rows = rowsOf<{ module: string; status: string; count: number }>(await this.dataSource.query(`
      SELECT module_code AS module,status,count(*)::int AS count
      FROM workbench_records
      WHERE deleted_at IS NULL AND module_code = ANY($1::varchar[])
      GROUP BY module_code,status ORDER BY module_code,status
    `, [[...LEGACY_SAFETY_MODULES]]));
    return rows.map((row) => ({ ...row, issueType: this.map({ module_code: row.module, status: row.status } as SourceRecord).issueType, issueStatus: this.map({ module_code: row.module, status: row.status } as SourceRecord).issueStatus }));
  }

  async run(actorUserId: string, requestId: string): Promise<LegacyMigrationSummary> {
    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    let batchId = '';
    try {
      await runner.query(`SELECT pg_advisory_xact_lock(hashtextextended('m8-wave7-legacy-safety',0))`);
      const existing = rowsOf<{ id: string }>(await runner.query(`SELECT id FROM legacy_safety_migration_batches WHERE request_id=$1`, [requestId]));
      if (existing[0]) {
        await runner.commitTransaction();
        return await this.verify(existing[0].id);
      }
      const batch = rowsOf<{ id: string }>(await runner.query(`INSERT INTO legacy_safety_migration_batches(request_id,created_by) VALUES($1,$2) RETURNING id`, [requestId, actorUserId]));
      batchId = batch[0]!.id;
      const sources = await this.sources(runner);
      let createdCount = 0; let skippedCount = 0; let failedCount = 0;
      for (const [index, source] of sources.entries()) {
        const savepoint = `legacy_row_${index}`;
        await runner.query(`SAVEPOINT ${savepoint}`);
        try {
          const mapping = this.map(source);
          const snapshot = this.snapshot(source, mapping);
          const sourceDigest = digest(snapshot);
          const idempotencyKey = hashText(`legacy-workbench:${source.id}`);
          const issueNo = `M8L-${idempotencyKey.slice(0, 12).toUpperCase()}`;
          const vesselId = await this.resolveVessel(runner, source.vessel_id);
          const inserted = rowsOf<{ id: string }>(await runner.query(`
            INSERT INTO safety_issues(issue_no,title,issue_type,severity,status,vessel_id,responsibility_scope,responsible_user_id,due_at,idempotency_key,closed_at,closed_by,created_by,updated_by)
            VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$13)
            ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL AND deleted_at IS NULL DO NOTHING
            RETURNING id
          `, [issueNo, source.title, mapping.issueType, mapping.severity, mapping.issueStatus, vesselId, vesselId ? 'vessel' : 'department', source.assignee_user_id ?? source.owner_user_id, mapping.dueAt, idempotencyKey, mapping.issueStatus === 'closed' ? source.closed_at ?? source.updated_at : null, mapping.issueStatus === 'closed' ? actorUserId : null, actorUserId]));
          const created = Boolean(inserted[0]);
          const issueId = inserted[0]?.id ?? rowsOf<{ id: string }>(await runner.query(`SELECT id FROM safety_issues WHERE idempotency_key=$1 AND deleted_at IS NULL`, [idempotencyKey]))[0]!.id;
          const insertedLinks = rowsOf<{ id: string }>(await runner.query(`
            INSERT INTO issue_sources(issue_id,source_type,source_id,source_item_key,source_snapshot,created_by)
            VALUES($1,'workbench_record',$2,'',$3::jsonb,$4)
            ON CONFLICT (issue_id,source_type,source_id,source_item_key) DO NOTHING
            RETURNING id
          `, [issueId, source.id, JSON.stringify(snapshot), actorUserId]));
          const linkId = insertedLinks[0]?.id ?? rowsOf<{ id: string }>(await runner.query(`SELECT id FROM issue_sources WHERE issue_id=$1 AND source_type='workbench_record' AND source_id=$2 AND source_item_key=''`, [issueId, source.id]))[0]!.id;
          await runner.query(`
            INSERT INTO legacy_safety_migration_rows(batch_id,source_record_id,source_module,source_status,mapped_issue_type,mapped_issue_status,mapping_status,target_issue_id,target_source_id,source_snapshot,source_digest)
            VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11)
          `, [batchId, source.id, source.module_code, source.status, mapping.issueType, mapping.issueStatus, created ? 'created' : 'skipped_existing', issueId, linkId, JSON.stringify(snapshot), sourceDigest]);
          if (created) createdCount += 1; else skippedCount += 1;
          await runner.query(`RELEASE SAVEPOINT ${savepoint}`);
        } catch (error) {
          await runner.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
          const mapping = this.map(source); const snapshot = this.snapshot(source, mapping);
          await runner.query(`
            INSERT INTO legacy_safety_migration_rows(batch_id,source_record_id,source_module,source_status,mapped_issue_type,mapped_issue_status,mapping_status,error_code,error_message,source_snapshot,source_digest)
            VALUES($1,$2,$3,$4,$5,$6,'failed','migration_error',$7,$8::jsonb,$9)
          `, [batchId, source.id, source.module_code, source.status, mapping.issueType, mapping.issueStatus, error instanceof Error ? error.message : 'migration failed', JSON.stringify(snapshot), digest(snapshot)]);
          failedCount += 1;
        }
      }
      const status = failedCount === 0 ? 'completed' : 'completed_with_errors';
      await runner.query(`UPDATE legacy_safety_migration_batches SET status=$2,source_count=$3,created_count=$4,skipped_count=$5,failed_count=$6,summary=$7::jsonb,completed_at=now() WHERE id=$1`, [batchId, status, sources.length, createdCount, skippedCount, failedCount, JSON.stringify({ modules: [...LEGACY_SAFETY_MODULES] })]);
      await runner.commitTransaction();
      return await this.verify(batchId);
    } catch (error) {
      await runner.rollbackTransaction();
      if (batchId) await this.dataSource.query(`INSERT INTO legacy_safety_migration_batches(id,request_id,status,failure_message,completed_at,created_by) VALUES($1,$2,'failed',$3,now(),$4) ON CONFLICT (request_id) DO UPDATE SET status='failed',failure_message=EXCLUDED.failure_message,completed_at=now()`, [batchId, requestId, error instanceof Error ? error.message : 'migration failed', actorUserId]);
      throw error;
    } finally {
      await runner.release();
    }
  }

  async verify(batchId: string): Promise<LegacyMigrationSummary> {
    const batches = rowsOf<Record<string, string | number>>(await this.dataSource.query(`SELECT id,request_id,status,source_count,created_count,skipped_count,failed_count FROM legacy_safety_migration_batches WHERE id=$1`, [batchId]));
    const batch = batches[0]; if (!batch) throw new Error(`migration batch ${batchId} not found`);
    const counts = rowsOf<{ linked_count: number }>(await this.dataSource.query(`
      SELECT count(*) FILTER (WHERE i.id IS NOT NULL AND s.id IS NOT NULL)::int AS linked_count
      FROM legacy_safety_migration_rows r
      JOIN workbench_records w ON w.id=r.source_record_id
      LEFT JOIN safety_issues i ON i.id=r.target_issue_id AND i.deleted_at IS NULL
      LEFT JOIN issue_sources s ON s.id=r.target_source_id
      WHERE r.batch_id=$1 AND r.mapping_status <> 'failed'
    `, [batchId]));
    const snapshots = rowsOf<SourceRecord & { source_digest: string; source_snapshot: { mapping?: Partial<Mapping> & { dueAt?: string } } }>(await this.dataSource.query(`
      SELECT w.id,w.module_code,w.record_no,w.status,w.title,w.summary,w.department_code,w.vessel_id,w.owner_user_id,w.assignee_user_id,w.occurred_at,w.closed_at,w.payload,w.created_at,w.updated_at,r.source_digest,r.source_snapshot
      FROM legacy_safety_migration_rows r JOIN workbench_records w ON w.id=r.source_record_id
      WHERE r.batch_id=$1 AND r.mapping_status <> 'failed'
    `, [batchId]));
    const sourceUnchangedCount = snapshots.filter((row) => {
      const current = this.map(row);
      const stored = row.source_snapshot.mapping;
      const mapping: Mapping = { issueType: stored?.issueType ?? current.issueType, issueStatus: stored?.issueStatus ?? current.issueStatus, severity: stored?.severity ?? current.severity, dueAt: stored?.dueAt ? new Date(stored.dueAt) : current.dueAt };
      return digest(this.snapshot(row, mapping)) === row.source_digest;
    }).length;
    return { batchId: String(batch.id), requestId: String(batch.request_id), status: String(batch.status), sourceCount: Number(batch.source_count), createdCount: Number(batch.created_count), skippedCount: Number(batch.skipped_count), failedCount: Number(batch.failed_count), sourceUnchangedCount, linkedCount: Number(counts[0]?.linked_count ?? 0) };
  }

  async rollback(batchId: string): Promise<{ batchId: string; rolledBack: number; retained: number }> {
    return await this.dataSource.transaction(async (manager) => {
      await manager.query(`SELECT pg_advisory_xact_lock(hashtextextended('m8-wave7-legacy-safety',0))`);
      const rows = rowsOf<{ id: string; target_issue_id: string; target_source_id: string }>(await manager.query(`SELECT id,target_issue_id,target_source_id FROM legacy_safety_migration_rows WHERE batch_id=$1 AND mapping_status='created' FOR UPDATE`, [batchId]));
      let rolledBack = 0; let retained = 0;
      for (const row of rows) {
        const dependent = rowsOf<{ value: boolean }>(await manager.query(`SELECT (EXISTS(SELECT 1 FROM safety_capas WHERE issue_id=$1 AND deleted_at IS NULL) OR EXISTS(SELECT 1 FROM inspection_capa_action_logs WHERE object_type='issue' AND object_id=$1) OR (SELECT count(*) FROM issue_sources WHERE issue_id=$1) > 1) AS value`, [row.target_issue_id]));
        if (dependent[0]?.value) { retained += 1; continue; }
        await manager.query(`DELETE FROM issue_sources WHERE id=$1`, [row.target_source_id]);
        await manager.query(`DELETE FROM safety_issues WHERE id=$1`, [row.target_issue_id]);
        await manager.query(`UPDATE legacy_safety_migration_rows SET mapping_status='rolled_back',rolled_back_at=now(),target_issue_id=NULL,target_source_id=NULL WHERE id=$1`, [row.id]);
        rolledBack += 1;
      }
      if (retained === 0) await manager.query(`UPDATE legacy_safety_migration_batches SET status='rolled_back',completed_at=now() WHERE id=$1`, [batchId]);
      return { batchId, rolledBack, retained };
    });
  }

  private async sources(runner: QueryRunner): Promise<SourceRecord[]> {
    return rowsOf<SourceRecord>(await runner.query(`SELECT id,module_code,record_no,status,title,summary,department_code,vessel_id,owner_user_id,assignee_user_id,occurred_at,closed_at,payload,created_at,updated_at FROM workbench_records WHERE deleted_at IS NULL AND module_code = ANY($1::varchar[]) ORDER BY module_code,created_at,id`, [[...LEGACY_SAFETY_MODULES]]));
  }

  private map(source: Pick<SourceRecord, 'module_code' | 'status'> & Partial<SourceRecord>): Mapping {
    const issueType = source.module_code === 'goa_safety_hazard' ? 'hazard' : source.module_code === 'shipping_maritime_safety_check' ? 'external' : 'general';
    const issueStatus = ['closed','approved','terminated','voided','rejected','cancelled','canceled'].includes(source.status) ? 'closed' : ['pending_review','approval_pending'].includes(source.status) ? 'pending_verification' : ['in_progress','rework_required'].includes(source.status) ? 'action_in_progress' : 'open';
    const rawSeverity = source.payload?.severity ?? source.payload?.level;
    const severityValue = typeof rawSeverity === 'string' ? rawSeverity.toLowerCase() : '';
    const severity = ['critical','重大','p0'].includes(severityValue) ? 'critical' : ['major','较大','p1'].includes(severityValue) ? 'major' : 'minor';
    const dueValue = source.payload?.dueAt ?? source.payload?.deadline ?? source.payload?.rectificationDueAt;
    const parsedDue = typeof dueValue === 'string' ? new Date(dueValue) : null;
    const base = source.occurred_at ? new Date(source.occurred_at) : new Date(0);
    const dueAt = parsedDue && !Number.isNaN(parsedDue.valueOf()) ? parsedDue : new Date(base.valueOf() + 30 * 24 * 60 * 60 * 1000);
    return { issueType, issueStatus, severity, dueAt };
  }

  private snapshot(source: SourceRecord, mapping: Mapping) {
    return { id: source.id, moduleCode: source.module_code, recordNo: source.record_no, status: source.status, title: source.title, summary: source.summary, departmentCode: source.department_code, vesselId: source.vessel_id, ownerUserId: source.owner_user_id, assigneeUserId: source.assignee_user_id, occurredAt: source.occurred_at, closedAt: source.closed_at, payload: source.payload, createdAt: source.created_at, updatedAt: source.updated_at, mapping: { ...mapping, dueAt: mapping.dueAt.toISOString(), legacyReadOnly: true } };
  }

  private async resolveVessel(runner: QueryRunner, value: string | null): Promise<string | null> {
    if (!value) return null;
    const rows = rowsOf<{ id: string }>(await runner.query(`SELECT id FROM vessels WHERE deleted_at IS NULL AND (id::text=$1 OR code=$1 OR name=$1) ORDER BY CASE WHEN id::text=$1 THEN 0 WHEN code=$1 THEN 1 ELSE 2 END LIMIT 1`, [value]));
    return rows[0]?.id ?? null;
  }
}
