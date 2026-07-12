import { Column, CreateDateColumn, DeleteDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Index('idx_workbench_record_participants_record_step', ['businessRecordId', 'stepId'])
@Index('idx_workbench_record_participants_user_status', ['userId', 'status'])
@Index('uq_workbench_record_participants_active', ['businessRecordId', 'stepId', 'userId', 'role'], { unique: true, where: 'deleted_at IS NULL' })
@Entity({ name: 'workbench_record_participants' })
export class WorkbenchRecordParticipantEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'business_record_id', type: 'uuid' }) businessRecordId!: string;
  @Column({ name: 'step_id', type: 'uuid', nullable: true }) stepId!: string | null;
  @Column({ name: 'user_id', type: 'varchar', length: 64 }) userId!: string;
  @Column({ type: 'varchar', length: 32 }) role!: string;
  @Column({ type: 'varchar', length: 32, default: 'active' }) status!: string;
  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true }) completedAt!: Date | null;
  @Column({ name: 'created_by', type: 'varchar', length: 64 }) createdBy!: string;
  @Column({ name: 'updated_by', type: 'varchar', length: 64, nullable: true }) updatedBy!: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true }) deletedAt!: Date | null;
}
