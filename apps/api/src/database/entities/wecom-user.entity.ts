import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { appEnv } from 'src/config/env';

const jsonColumnType = appEnv.NODE_ENV === 'test' ? 'simple-json' : 'jsonb';
const emptyArrayDefault =
  appEnv.NODE_ENV === 'test' ? '[]' : () => "'[]'::jsonb";
const emptyObjectDefault =
  appEnv.NODE_ENV === 'test' ? '{}' : () => "'{}'::jsonb";
const timestampColumnType = appEnv.NODE_ENV === 'test' ? 'datetime' : 'timestamptz';

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
    name: 'department_codes',
    type: jsonColumnType,
    default: emptyArrayDefault,
  })
  departmentCodes!: string[];

  @Column({
    name: 'department_names',
    type: jsonColumnType,
    default: emptyArrayDefault,
  })
  departmentNames!: string[];

  @Column({ type: 'varchar', length: 64, nullable: true })
  position!: string | null;

  @Column({ name: 'is_system_admin', type: 'boolean', default: false })
  isSystemAdmin!: boolean;

  @Column({
    name: 'raw_profile',
    type: jsonColumnType,
    default: emptyObjectDefault,
  })
  rawProfile!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: timestampColumnType })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: timestampColumnType })
  updatedAt!: Date;
}
