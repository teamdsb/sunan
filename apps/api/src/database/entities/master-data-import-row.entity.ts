import { Column, CreateDateColumn, DeleteDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'master_data_import_rows' })
@Index('uq_master_data_import_rows_batch_row', ['batchId', 'rowNo'], { unique: true, where: 'deleted_at IS NULL' })
export class MasterDataImportRowEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'batch_id', type: 'uuid' }) batchId!: string;
  @Column({ name: 'row_no', type: 'integer' }) rowNo!: number;
  @Column({ name: 'natural_key', type: 'varchar', length: 256, nullable: true }) naturalKey!: string | null;
  @Column({ type: 'varchar', length: 16 }) outcome!: 'created' | 'updated' | 'skipped' | 'failed';
  @Column({ name: 'error_code', type: 'varchar', length: 64, nullable: true }) errorCode!: string | null;
  @Column({ name: 'error_message', type: 'text', nullable: true }) errorMessage!: string | null;
  @Column({ name: 'before_snapshot', type: 'jsonb', nullable: true }) beforeSnapshot!: Record<string, unknown> | null;
  @Column({ name: 'created_by', type: 'varchar', length: 64 }) createdBy!: string;
  @Column({ name: 'updated_by', type: 'varchar', length: 64, nullable: true }) updatedBy!: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true }) deletedAt!: Date | null;
}
