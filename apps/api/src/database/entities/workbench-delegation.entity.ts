import { Column, CreateDateColumn, DeleteDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Index('idx_workbench_delegations_delegator_validity', ['delegatorUserId', 'effectiveFrom', 'effectiveTo'])
@Index('idx_workbench_delegations_delegatee_validity', ['delegateeUserId', 'effectiveFrom', 'effectiveTo'])
@Entity({ name: 'workbench_delegations' })
export class WorkbenchDelegationEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'business_record_id', type: 'uuid', nullable: true }) businessRecordId!: string | null;
  @Column({ name: 'step_id', type: 'uuid', nullable: true }) stepId!: string | null;
  @Column({ name: 'delegator_user_id', type: 'varchar', length: 64 }) delegatorUserId!: string;
  @Column({ name: 'delegatee_user_id', type: 'varchar', length: 64 }) delegateeUserId!: string;
  @Column({ name: 'effective_from', type: 'timestamptz' }) effectiveFrom!: Date;
  @Column({ name: 'effective_to', type: 'timestamptz' }) effectiveTo!: Date;
  @Column({ type: 'varchar', length: 32, default: 'active' }) status!: string;
  @Column({ type: 'text', nullable: true }) reason!: string | null;
  @Column({ name: 'created_by', type: 'varchar', length: 64 }) createdBy!: string;
  @Column({ name: 'updated_by', type: 'varchar', length: 64, nullable: true }) updatedBy!: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true }) deletedAt!: Date | null;
}
