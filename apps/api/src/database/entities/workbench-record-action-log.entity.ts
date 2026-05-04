import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

const timestampColumnType = 'timestamptz';

@Index('idx_workbench_record_action_logs_record_created_at', ['businessRecordId', 'createdAt'])
@Index('idx_workbench_record_action_logs_action_type', ['actionType'])
@Index('idx_workbench_record_action_logs_source', ['source'])
@Entity({ name: 'workbench_record_action_logs' })
export class WorkbenchRecordActionLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'business_record_id', type: 'uuid' })
  businessRecordId!: string;

  @Column({ name: 'action_type', type: 'varchar', length: 64 })
  actionType!: string;

  @Column({ type: 'varchar', length: 32, default: 'manual' })
  source!: string;

  @Column({ name: 'operator_user_id', type: 'varchar', length: 64, nullable: true })
  operatorUserId!: string | null;

  @Column({ name: 'from_status', type: 'varchar', length: 64, nullable: true })
  fromStatus!: string | null;

  @Column({ name: 'to_status', type: 'varchar', length: 64, nullable: true })
  toStatus!: string | null;

  @Column({ type: 'text', nullable: true })
  comment!: string | null;

  @Column({ name: 'payload_digest', type: 'text', nullable: true })
  payloadDigest!: string | null;

  @CreateDateColumn({ name: 'created_at', type: timestampColumnType })
  createdAt!: Date;
}
