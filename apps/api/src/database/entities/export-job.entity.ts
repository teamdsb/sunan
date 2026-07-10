import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
@Index('idx_export_jobs_status_requested', ['status', 'requestedAt'])
@Entity({ name: 'export_jobs' })
export class ExportJobEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'source_type', type: 'varchar', length: 64 }) sourceType!: string;
  @Column({ name: 'source_id', type: 'varchar', length: 128 }) sourceId!: string;
  @Column({ name: 'query_snapshot', type: 'jsonb', default: () => "'{}'::jsonb" }) querySnapshot!: Record<string, unknown>;
  @Column({ name: 'export_format', type: 'varchar', length: 16 }) exportFormat!: string;
  @Column({ type: 'varchar', length: 16, default: 'queued' }) status!: string;
  @Column({ name: 'result_file_id', type: 'uuid', nullable: true }) resultFileId!: string | null;
  @Column({ name: 'failure_message', type: 'text', nullable: true }) failureMessage!: string | null;
  @Column({ name: 'retry_count', type: 'integer', default: 0 }) retryCount!: number;
  @Column({ name: 'requested_by', type: 'varchar', length: 64 }) requestedBy!: string;
  @CreateDateColumn({ name: 'requested_at', type: 'timestamptz' }) requestedAt!: Date;
  @Column({ name: 'started_at', type: 'timestamptz', nullable: true }) startedAt!: Date | null;
  @Column({ name: 'finished_at', type: 'timestamptz', nullable: true }) finishedAt!: Date | null;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
}
