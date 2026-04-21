import { Column, CreateDateColumn, DeleteDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

const timestampColumnType = 'timestamptz';

@Index('uk_workbench_records_record_no', ['recordNo'], { unique: true })
@Index('idx_workbench_records_module_status_occurred_at', ['moduleCode', 'status', 'occurredAt'])
@Index('idx_workbench_records_vessel_occurred_at', ['vesselId', 'occurredAt'])
@Index('idx_workbench_records_external_process_instance_id', ['externalProcessInstanceId'])
@Index('idx_workbench_records_owner_user_id', ['ownerUserId'])
@Entity({ name: 'workbench_records' })
export class WorkbenchRecordEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'module_code', type: 'varchar', length: 64 })
  moduleCode!: string;

  @Column({ name: 'template_code', type: 'varchar', length: 128 })
  templateCode!: string;

  @Column({ name: 'record_no', type: 'varchar', length: 32 })
  recordNo!: string;

  @Column({ name: 'record_source', type: 'varchar', length: 32, default: 'manual' })
  recordSource!: string;

  @Column({ type: 'varchar', length: 64 })
  status!: string;

  @Column({ name: 'approval_channel', type: 'varchar', length: 32, default: 'internal' })
  approvalChannel!: string;

  @Column({ name: 'external_process_instance_id', type: 'varchar', length: 128, nullable: true })
  externalProcessInstanceId!: string | null;

  @Column({ name: 'external_status', type: 'varchar', length: 64, nullable: true })
  externalStatus!: string | null;

  @Column({ type: 'varchar', length: 256 })
  title!: string;

  @Column({ type: 'text' })
  summary!: string;

  @Column({ name: 'department_code', type: 'varchar', length: 64 })
  departmentCode!: string;

  @Column({ name: 'vessel_id', type: 'varchar', length: 64, nullable: true })
  vesselId!: string | null;

  @Column({ name: 'owner_user_id', type: 'varchar', length: 64 })
  ownerUserId!: string;

  @Column({ name: 'applicant_user_id', type: 'varchar', length: 64 })
  applicantUserId!: string;

  @Column({ name: 'assignee_user_id', type: 'varchar', length: 64, nullable: true })
  assigneeUserId!: string | null;

  @Column({ name: 'reviewer_user_id', type: 'varchar', length: 64, nullable: true })
  reviewerUserId!: string | null;

  @Column({ name: 'occurred_at', type: timestampColumnType })
  occurredAt!: Date;

  @Column({ name: 'submitted_at', type: timestampColumnType, nullable: true })
  submittedAt!: Date | null;

  @Column({ name: 'closed_at', type: timestampColumnType, nullable: true })
  closedAt!: Date | null;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  payload!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: timestampColumnType })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: timestampColumnType })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: timestampColumnType, nullable: true })
  deletedAt!: Date | null;
}
