import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

const timestampColumnType = 'timestamptz';

@Index('idx_workbench_print_snapshots_record_rendered_at', ['businessRecordId', 'renderedAt'])
@Entity({ name: 'workbench_print_snapshots' })
export class WorkbenchPrintSnapshotEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'business_record_id', type: 'uuid' })
  businessRecordId!: string;

  @Column({ name: 'template_version', type: 'varchar', length: 32, default: 'v1' })
  templateVersion!: string;

  @Column({ name: 'snapshot_data', type: 'jsonb', default: () => "'{}'::jsonb" })
  snapshotData!: Record<string, unknown>;

  @Column({ name: 'rendered_file_id', type: 'varchar', length: 128, nullable: true })
  renderedFileId!: string | null;

  @Column({ name: 'rendered_format', type: 'varchar', length: 32, default: 'pdf' })
  renderedFormat!: string;

  @Column({ name: 'rendered_at', type: timestampColumnType })
  renderedAt!: Date;

  @Column({ name: 'rendered_by', type: 'varchar', length: 64 })
  renderedBy!: string;

  @CreateDateColumn({ name: 'created_at', type: timestampColumnType })
  createdAt!: Date;
}
