import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

const timestampColumnType = 'timestamptz';

@Index('uk_wecom_approval_instance_syncs_process_instance_id', ['processInstanceId'], { unique: true })
@Index('idx_wecom_approval_instance_syncs_business_record_id', ['businessRecordId'])
@Index('idx_wecom_approval_instance_syncs_sync_status', ['approvalSyncStatus'])
@Index('idx_wecom_approval_instance_syncs_external_status', ['externalStatus'])
@Index('idx_wecom_approval_instance_syncs_last_reconciled_at', ['lastReconciledAt'])
@Entity({ name: 'wecom_approval_instance_syncs' })
export class WecomApprovalInstanceSyncEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'business_record_id', type: 'uuid' })
  businessRecordId!: string;

  @Column({ name: 'module_code', type: 'varchar', length: 64 })
  moduleCode!: string;

  @Column({ name: 'approval_channel', type: 'varchar', length: 32, default: 'wecom_native' })
  approvalChannel!: string;

  @Column({ name: 'process_instance_id', type: 'varchar', length: 128 })
  processInstanceId!: string;

  @Column({ name: 'wecom_template_id', type: 'varchar', length: 128, nullable: true })
  wecomTemplateId!: string | null;

  @Column({ name: 'external_status', type: 'varchar', length: 64 })
  externalStatus!: string;

  @Column({ name: 'internal_mirror_status', type: 'varchar', length: 64 })
  internalMirrorStatus!: string;

  @Column({ name: 'approval_sync_status', type: 'varchar', length: 32, default: 'pending' })
  approvalSyncStatus!: string;

  @Column({ name: 'started_by', type: 'varchar', length: 64 })
  startedBy!: string;

  @Column({ name: 'started_at', type: timestampColumnType })
  startedAt!: Date;

  @Column({ name: 'last_callback_at', type: timestampColumnType, nullable: true })
  lastCallbackAt!: Date | null;

  @Column({ name: 'last_reconciled_at', type: timestampColumnType, nullable: true })
  lastReconciledAt!: Date | null;

  @Column({ name: 'callback_version', type: 'int', default: 0 })
  callbackVersion!: number;

  @Column({ name: 'retry_count', type: 'int', default: 0 })
  retryCount!: number;

  @Column({ name: 'last_retry_at', type: timestampColumnType, nullable: true })
  lastRetryAt!: Date | null;

  @Column({ name: 'sync_error_code', type: 'varchar', length: 128, nullable: true })
  syncErrorCode!: string | null;

  @Column({ name: 'sync_error_message', type: 'text', nullable: true })
  syncErrorMessage!: string | null;

  @Column({ name: 'raw_payload_digest', type: 'text', nullable: true })
  rawPayloadDigest!: string | null;

  @CreateDateColumn({ name: 'created_at', type: timestampColumnType })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: timestampColumnType })
  updatedAt!: Date;
}
