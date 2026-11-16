import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'wecom_departments' })
@Index('uq_wecom_departments_corp_department', ['corpId', 'departmentId'], { unique: true })
export class WecomDepartmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'corp_id', type: 'varchar', length: 64 })
  corpId!: string;

  @Column({ name: 'wecom_department_id', type: 'integer' })
  departmentId!: number;

  @Column({ name: 'parent_id', type: 'integer', nullable: true })
  parentId!: number | null;

  @Column({ type: 'varchar', length: 128 })
  name!: string;

  @Column({ name: 'source_revision', type: 'bigint', default: 0 })
  sourceRevision!: number;

  @Column({ name: 'last_sync_batch_id', type: 'uuid', nullable: true })
  lastSyncBatchId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
