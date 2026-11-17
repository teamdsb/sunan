import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'notification_app_config_audits' })
@Index('idx_notification_app_config_audits_corp_created', ['corpId', 'createdAt'])
export class WecomNotificationConfigAuditEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'corp_id', type: 'varchar', length: 64 }) corpId!: string;
  @Column({ name: 'actor_user_id', type: 'varchar', length: 64 }) actorUserId!: string;
  @Column({ type: 'varchar', length: 16 }) action!: 'save' | 'clear' | 'rotate';
  @Column({ name: 'config_version', type: 'integer' }) configVersion!: number;
  @Column({ name: 'before_snapshot', type: 'jsonb', default: () => "'{}'::jsonb" }) beforeSnapshot!: Record<string, unknown>;
  @Column({ name: 'after_snapshot', type: 'jsonb', default: () => "'{}'::jsonb" }) afterSnapshot!: Record<string, unknown>;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
}
