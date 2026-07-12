import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

const timestampColumnType = 'timestamptz';

@Index('uk_workbench_record_steps_record_step_code', ['businessRecordId', 'stepCode'], { unique: true })
@Index('idx_workbench_record_steps_record_sequence', ['businessRecordId', 'sequenceNo'])
@Index('idx_workbench_record_steps_status', ['status'])
@Entity({ name: 'workbench_record_steps' })
export class WorkbenchRecordStepEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'business_record_id', type: 'uuid' })
  businessRecordId!: string;

  @Column({ name: 'step_code', type: 'varchar', length: 64 })
  stepCode!: string;

  @Column({ name: 'step_name', type: 'varchar', length: 128 })
  stepName!: string;

  @Column({ name: 'step_type', type: 'varchar', length: 32, default: 'normal' })
  stepType!: string;

  @Column({ name: 'sequence_no', type: 'int', default: 0 })
  sequenceNo!: number;

  @Column({ type: 'varchar', length: 32, default: 'pending' })
  status!: string;

  @Column({ name: 'completion_rule', type: 'varchar', length: 16, default: 'all' })
  completionRule!: string;

  @Column({ name: 'quorum_count', type: 'int', nullable: true })
  quorumCount!: number | null;

  @Column({ name: 'check_result', type: 'varchar', length: 64, nullable: true })
  checkResult!: string | null;

  @Column({ name: 'rectification_required', type: 'boolean', default: false })
  rectificationRequired!: boolean;

  @Column({ name: 'rectification_status', type: 'varchar', length: 64, nullable: true })
  rectificationStatus!: string | null;

  @Column({ name: 'completed_by', type: 'varchar', length: 64, nullable: true })
  completedBy!: string | null;

  @Column({ name: 'completed_at', type: timestampColumnType, nullable: true })
  completedAt!: Date | null;

  @Column({ name: 'step_payload', type: 'jsonb', default: () => "'{}'::jsonb" })
  stepPayload!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: timestampColumnType })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: timestampColumnType })
  updatedAt!: Date;
}
