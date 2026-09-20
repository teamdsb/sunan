import { MigrationInterface, QueryRunner } from 'typeorm';

export class FileOrphanRetention1710000026000 implements MigrationInterface {
  name = 'FileOrphanRetention1710000026000';

  async up(runner: QueryRunner): Promise<void> {
    await runner.query('ALTER TABLE "files" ADD COLUMN IF NOT EXISTS "orphaned_at" timestamptz NULL');
    await runner.query('CREATE INDEX IF NOT EXISTS "idx_files_orphaned_at" ON "files" ("orphaned_at") WHERE "orphaned_at" IS NOT NULL');
    await runner.query(`CREATE TABLE file_recycle_jobs (
      file_id uuid PRIMARY KEY, oss_key varchar(255) NOT NULL UNIQUE, attempts integer NOT NULL DEFAULT 0,
      last_error text, completed_at timestamptz, created_at timestamptz NOT NULL DEFAULT NOW()
    )`);
    await runner.query('CREATE INDEX idx_file_recycle_pending ON file_recycle_jobs (created_at) WHERE completed_at IS NULL');
    await runner.query(`CREATE FUNCTION guard_recycled_file_key() RETURNS trigger AS $$
      BEGIN
        IF EXISTS (SELECT 1 FROM file_recycle_jobs WHERE oss_key = NEW.oss_key) THEN
          RAISE EXCEPTION 'file has entered permanent recycling' USING ERRCODE = '23514';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql`);
    // Check after unique-key waits so a concurrently committed recycle job is visible.
    await runner.query(`CREATE TRIGGER guard_recycled_file_key AFTER INSERT OR UPDATE OF oss_key ON files
      FOR EACH ROW EXECUTE FUNCTION guard_recycled_file_key()`);
    // Snapshot the removed attachment in the audit without keeping the blob alive forever.
    await runner.query(`UPDATE files f SET orphaned_at = COALESCE(f.orphaned_at, NOW())
      WHERE EXISTS (SELECT 1 FROM evidence_audits a WHERE a.file_id = f.id
        AND a.object_type = 'procurement_order' AND a.action = 'unlink_attachment')`);
    await runner.query(`UPDATE evidence_audits a SET
      metadata = a.metadata || jsonb_build_object('fileId', f.id, 'fileName', f.file_name,
        'fileSize', f.file_size, 'mimeType', f.mime_type, 'ossKey', f.oss_key), file_id = NULL
      FROM files f WHERE a.file_id = f.id AND a.object_type = 'procurement_order' AND a.action = 'unlink_attachment'`);
    // Legacy snapshots store varchar IDs; validate new references and lock the file like a foreign key.
    await runner.query(`CREATE FUNCTION guard_print_snapshot_file() RETURNS trigger AS $$
      BEGIN
        IF NEW.rendered_file_id IS NOT NULL THEN
          PERFORM id FROM files WHERE id::text = NEW.rendered_file_id FOR KEY SHARE;
          IF NOT FOUND THEN RAISE EXCEPTION 'print snapshot file does not exist' USING ERRCODE = '23503'; END IF;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql`);
    await runner.query(`CREATE TRIGGER guard_print_snapshot_file
      BEFORE INSERT OR UPDATE OF rendered_file_id ON workbench_print_snapshots
      FOR EACH ROW EXECUTE FUNCTION guard_print_snapshot_file()`);
  }

  async down(runner: QueryRunner): Promise<void> {
    const [queue] = await runner.query('SELECT COUNT(*)::int AS count FROM file_recycle_jobs WHERE completed_at IS NULL') as Array<{ count: number }>;
    if (queue?.count) throw new Error('Drain file_recycle_jobs before reverting file retention');
    await runner.query('DROP TRIGGER IF EXISTS guard_recycled_file_key ON files');
    await runner.query('DROP FUNCTION IF EXISTS guard_recycled_file_key()');
    await runner.query('DROP TABLE file_recycle_jobs');
    await runner.query('DROP TRIGGER IF EXISTS guard_print_snapshot_file ON workbench_print_snapshots');
    await runner.query('DROP FUNCTION IF EXISTS guard_print_snapshot_file()');
    await runner.query('DROP INDEX IF EXISTS "idx_files_orphaned_at"');
    await runner.query('ALTER TABLE "files" DROP COLUMN IF EXISTS "orphaned_at"');
  }
}
