import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

const timestampColumnType = 'timestamptz';

@Index('uk_wecom_approval_callback_events_event_id', ['eventId'], { unique: true })
@Index('uk_wecom_approval_callback_events_instance_version', ['processInstanceId', 'callbackVersion'], { unique: true })
@Index('idx_wecom_approval_callback_events_created_at', ['createdAt'])
@Entity({ name: 'wecom_approval_callback_events' })
export class WecomApprovalCallbackEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'event_id', type: 'varchar', length: 128 })
  eventId!: string;

  @Column({ name: 'process_instance_id', type: 'varchar', length: 128 })
  processInstanceId!: string;

  @Column({ name: 'callback_version', type: 'int' })
  callbackVersion!: number;

  @Column({ name: 'signature', type: 'varchar', length: 128, nullable: true })
  signature!: string | null;

  @Column({ name: 'request_timestamp', type: 'varchar', length: 32, nullable: true })
  requestTimestamp!: string | null;

  @Column({ name: 'request_nonce', type: 'varchar', length: 128, nullable: true })
  requestNonce!: string | null;

  @Column({ name: 'payload_digest', type: 'text', nullable: true })
  payloadDigest!: string | null;

  @CreateDateColumn({ name: 'created_at', type: timestampColumnType })
  createdAt!: Date;
}
