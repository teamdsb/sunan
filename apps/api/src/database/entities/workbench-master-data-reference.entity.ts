import { Column, CreateDateColumn, DeleteDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'workbench_master_data_references' })
@Index('uq_workbench_master_data_reference_source', ['sourceDomain', 'sourceRecordId', 'fieldKey', 'objectType'], { unique: true, where: 'deleted_at IS NULL' })
@Index('idx_workbench_master_data_reference_object', ['objectType', 'objectId'], { where: 'deleted_at IS NULL' })
export class WorkbenchMasterDataReferenceEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'source_domain', type: 'varchar', length: 64 }) sourceDomain!: string;
  @Column({ name: 'source_record_id', type: 'uuid' }) sourceRecordId!: string;
  @Column({ name: 'field_key', type: 'varchar', length: 128 }) fieldKey!: string;
  @Column({ name: 'object_type', type: 'varchar', length: 32 }) objectType!: 'vessel' | 'personnel' | 'equipment';
  @Column({ name: 'raw_value', type: 'text' }) rawValue!: string;
  @Column({ name: 'object_id', type: 'uuid', nullable: true }) objectId!: string | null;
  @Column({ name: 'display_snapshot', type: 'varchar', length: 256, nullable: true }) displaySnapshot!: string | null;
  @Column({ name: 'mapping_status', type: 'varchar', length: 32 }) mappingStatus!: 'matched' | 'ambiguous' | 'unmatched' | 'manual_override';
  @Column({ name: 'created_by', type: 'varchar', length: 64 }) createdBy!: string;
  @Column({ name: 'updated_by', type: 'varchar', length: 64, nullable: true }) updatedBy!: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true }) deletedAt!: Date | null;
}
