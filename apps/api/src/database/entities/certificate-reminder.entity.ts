import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { appEnv } from 'src/config/env';

const timestampColumnType = appEnv.NODE_ENV === 'test' ? 'datetime' : 'timestamptz';
const dateColumnType = 'date';

@Index('idx_certificate_reminders_certificate_id', ['certificateId'])
@Index('idx_certificate_reminders_recipient_user_id_status', ['recipientUserId', 'status'])
@Index('uk_certificate_reminders_certificate_recipient_scheduled_type', ['certificateId', 'recipientUserId', 'scheduledDate', 'reminderType'], { unique: true })
@Entity({ name: 'certificate_reminders' })
export class CertificateReminderEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'certificate_id', type: 'uuid' })
  certificateId!: string;

  @Column({ name: 'certificate_type_id', type: 'uuid' })
  certificateTypeId!: string;

  @Column({ name: 'certificate_type_name', type: 'varchar', length: 64 })
  certificateTypeName!: string;

  @Column({ name: 'certificate_title', type: 'varchar', length: 128 })
  certificateTitle!: string;

  @Column({ name: 'owner_type', type: 'varchar', length: 16 })
  ownerType!: 'vessel' | 'vehicle' | 'personnel';

  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId!: string;

  @Column({ name: 'owner_name', type: 'varchar', length: 128 })
  ownerName!: string;

  @Column({ name: 'certificate_expiry_date', type: dateColumnType })
  certificateExpiryDate!: string;

  @Column({ name: 'recipient_user_id', type: 'varchar', length: 64 })
  recipientUserId!: string;

  @Column({ name: 'reminder_type', type: 'varchar', length: 16 })
  reminderType!: 'upcoming' | 'overdue';

  @Column({ type: 'varchar', length: 16, default: 'pending' })
  status!: 'pending' | 'dispatching' | 'sent' | 'acknowledged' | 'failed';

  @Column({ name: 'scheduled_date', type: dateColumnType })
  scheduledDate!: string;

  @Column({ name: 'days_before_expiry', type: 'integer' })
  daysBeforeExpiry!: number;

  @Column({ name: 'sent_at', type: timestampColumnType, nullable: true })
  sentAt!: Date | null;

  @Column({ name: 'acknowledged_at', type: timestampColumnType, nullable: true })
  acknowledgedAt!: Date | null;

  @Column({ name: 'acknowledged_by', type: 'varchar', length: 64, nullable: true })
  acknowledgedBy!: string | null;

  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  failureReason!: string | null;

  @CreateDateColumn({ name: 'created_at', type: timestampColumnType })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: timestampColumnType })
  updatedAt!: Date;
}
