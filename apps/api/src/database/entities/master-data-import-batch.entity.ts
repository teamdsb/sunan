import { Column, CreateDateColumn, DeleteDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'master_data_import_batches' })
@Index('uq_master_data_import_batches_type_hash', ['importType', 'contentHash'], { unique: true, where: 'deleted_at IS NULL' })
export class MasterDataImportBatchEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'import_type', type: 'varchar', length: 32 }) importType!: string;
  @Column({ name: 'content_hash', type: 'varchar', length: 64 }) contentHash!: string;
  @Column({ type: 'varchar', length: 16, default: 'completed' }) status!: 'running' | 'completed' | 'failed';
  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" }) summary!: Record<string, number>;
  @Column({ name: 'created_by', type: 'varchar', length: 64 }) createdBy!: string;
  @Column({ name: 'updated_by', type: 'varchar', length: 64, nullable: true }) updatedBy!: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true }) deletedAt!: Date | null;
}
