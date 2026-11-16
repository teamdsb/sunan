import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'wecom_user_change_audits' })
@Index('idx_wecom_user_change_audits_user_created_at', ['userId', 'createdAt'])
export class WecomUserAuditEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'varchar', length: 64 })
  userId!: string;

  @Column({ name: 'corp_id', type: 'varchar', length: 64 })
  corpId!: string;

  @Column({ name: 'actor_user_id', type: 'varchar', length: 64 })
  actorUserId!: string;

  @Column({ type: 'varchar', length: 16 })
  source!: 'admin' | 'oauth' | 'sync';

  @Column({ name: 'action', type: 'varchar', length: 32 })
  action!: string;

  @Column({ type: 'text', nullable: true })
  reason!: string | null;

  @Column({ name: 'before_snapshot', type: 'jsonb', default: () => "'{}'::jsonb" })
  beforeSnapshot!: Record<string, unknown>;

  @Column({ name: 'after_snapshot', type: 'jsonb', default: () => "'{}'::jsonb" })
  afterSnapshot!: Record<string, unknown>;

  @Column({ name: 'authorization_version', type: 'bigint', nullable: true })
  authorizationVersion!: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
