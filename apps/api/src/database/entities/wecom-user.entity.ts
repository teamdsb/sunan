import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'wecom_users' })
export class WecomUserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'varchar', length: 64, unique: true })
  userId!: string;

  @Column({ name: 'corp_id', type: 'varchar', length: 64 })
  corpId!: string;

  @Column({ type: 'varchar', length: 64 })
  name!: string;

  @Column({ name: 'avatar_url', type: 'text', nullable: true })
  avatarUrl!: string | null;

  @Column({
    name: 'department_ids',
    type: 'jsonb',
    default: () => "'[]'::jsonb",
  })
  departmentIds!: number[];

  @Column({
    name: 'department_codes',
    type: 'jsonb',
    default: () => "'[]'::jsonb",
  })
  departmentCodes!: string[];

  @Column({
    name: 'department_names',
    type: 'jsonb',
    default: () => "'[]'::jsonb",
  })
  departmentNames!: string[];

  @Column({ type: 'varchar', length: 64, nullable: true })
  position!: string | null;

  @Column({ name: 'is_system_admin', type: 'boolean', default: false })
  isSystemAdmin!: boolean;

  @Column({ name: 'source_status', type: 'varchar', length: 16, default: 'unknown' })
  sourceStatus!: 'active' | 'inactive' | 'unknown';

  @Column({ name: 'source_status_updated_at', type: 'timestamptz', nullable: true })
  sourceStatusUpdatedAt!: Date | null;

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt!: Date | null;

  @Column({ name: 'login_status', type: 'varchar', length: 16, default: 'unknown' })
  loginStatus!: 'unknown' | 'never' | 'logged_in';

  @Column({ name: 'last_sync_at', type: 'timestamptz', nullable: true })
  lastSyncAt!: Date | null;

  @Column({ name: 'source_revision', type: 'bigint', default: 0 })
  sourceRevision!: number;

  @Column({ name: 'source_batch_id', type: 'uuid', nullable: true })
  sourceBatchId!: string | null;

  @Column({ name: 'platform_status', type: 'varchar', length: 16, default: 'enabled' })
  platformStatus!: 'enabled' | 'disabled';

  @Column({ name: 'platform_status_reason', type: 'text', nullable: true })
  platformStatusReason!: string | null;

  @Column({ name: 'platform_status_changed_at', type: 'timestamptz', nullable: true })
  platformStatusChangedAt!: Date | null;

  @Column({ name: 'department_mode', type: 'varchar', length: 16, default: 'follow_wecom' })
  departmentMode!: 'follow_wecom' | 'manual';

  @Column({ name: 'manual_department_ids', type: 'jsonb', default: () => "'[]'::jsonb" })
  manualDepartmentIds!: number[];

  @Column({ name: 'role_mode', type: 'varchar', length: 16, default: 'auto' })
  roleMode!: 'auto' | 'manual';

  @Column({ name: 'manual_roles', type: 'jsonb', default: () => "'[]'::jsonb" })
  manualRoles!: string[];

  @Column({ name: 'authorization_version', type: 'bigint', default: 1 })
  authorizationVersion!: number;

  @Column({
    name: 'raw_profile',
    type: 'jsonb',
    default: () => "'{}'::jsonb",
  })
  rawProfile!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
