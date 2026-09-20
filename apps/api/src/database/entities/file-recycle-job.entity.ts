import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'file_recycle_jobs' })
export class FileRecycleJobEntity {
  @PrimaryColumn({ name: 'file_id', type: 'uuid' })
  fileId!: string;

  @Column({ name: 'oss_key', type: 'varchar', length: 255 })
  ossKey!: string;

  @Column({ type: 'integer', default: 0 })
  attempts!: number;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError!: string | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
