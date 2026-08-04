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
