import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'wecom_directory_sync_batches' })
@Index('idx_wecom_directory_sync_batches_status_created_at', ['status', 'createdAt'])
export class WecomSyncBatchEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'corp_id', type: 'varchar', length: 64 })
  corpId!: string;

  @Column({ name: 'triggered_by', type: 'varchar', length: 64 })
  triggeredBy!: string;

  @Column({ name: 'source_revision', type: 'bigint' })
  sourceRevision!: number;

  @Column({ type: 'varchar', length: 16, default: 'running' })
  status!: 'running' | 'succeeded' | 'partial' | 'failed';

  @Column({ name: 'coverage_status', type: 'varchar', length: 24, default: 'unverified' })
  coverageStatus!: 'unverified' | 'partial' | 'complete';

  @Column({ name: 'coverage_note', type: 'text', nullable: true })
  coverageNote!: string | null;

  @Column({ name: 'started_at', type: 'timestamptz' })
  startedAt!: Date;

  @Column({ name: 'finished_at', type: 'timestamptz', nullable: true })
  finishedAt!: Date | null;

  @Column({ name: 'read_count', type: 'integer', default: 0 })
  readCount!: number;

  @Column({ name: 'created_count', type: 'integer', default: 0 })
  createdCount!: number;

  @Column({ name: 'updated_count', type: 'integer', default: 0 })
  updatedCount!: number;

  @Column({ name: 'failed_count', type: 'integer', default: 0 })
  failedCount!: number;

  @Column({ name: 'error_summary', type: 'jsonb', default: () => "'[]'::jsonb" })
  errorSummary!: Array<{ scope: string; message: string }>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
