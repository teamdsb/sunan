import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'notification_delivery_attempts' })
@Index('uq_notification_delivery_attempts_dedupe', ['dedupeKey'], { unique: true })
@Index('idx_notification_delivery_attempts_status_updated', ['status', 'updatedAt'])
export class WecomMessageDeliveryEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'source_type', type: 'varchar', length: 32 }) sourceType!: string;
  @Column({ name: 'source_id', type: 'varchar', length: 128 }) sourceId!: string;
  @Column({ name: 'recipient_user_id', type: 'varchar', length: 64 }) recipientUserId!: string;
  @Column({ name: 'dedupe_key', type: 'varchar', length: 320 }) dedupeKey!: string;
  @Column({ name: 'payload_snapshot', type: 'jsonb', default: () => "'{}'::jsonb" }) payloadSnapshot!: Record<string, unknown>;
  @Column({ name: 'agent_id', type: 'varchar', length: 32, nullable: true }) agentId!: string | null;
  @Column({ name: 'config_source', type: 'varchar', length: 16 }) configSource!: 'env_main' | 'admin_override' | 'test_draft' | 'unresolved';
  @Column({ name: 'config_version', type: 'integer', nullable: true }) configVersion!: number | null;
  @Column({ type: 'varchar', length: 16, default: 'sending' }) status!: 'sending' | 'sent' | 'failed' | 'uncertain' | 'skipped';
  @Column({ name: 'attempt_count', type: 'integer', default: 0 }) attemptCount!: number;
  @Column({ name: 'attempt_history', type: 'jsonb', default: () => "'[]'::jsonb" }) attemptHistory!: Array<Record<string, unknown>>;
  @Column({ name: 'wecom_errcode', type: 'integer', nullable: true }) wecomErrcode!: number | null;
  @Column({ name: 'failure_reason', type: 'text', nullable: true }) failureReason!: string | null;
  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true }) sentAt!: Date | null;
  @Column({ name: 'reconciled_by', type: 'varchar', length: 64, nullable: true }) reconciledBy!: string | null;
  @Column({ name: 'reconciled_at', type: 'timestamptz', nullable: true }) reconciledAt!: Date | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
}
