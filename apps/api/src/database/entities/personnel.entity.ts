import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { appEnv } from 'src/config/env';

const timestampColumnType = 'timestamptz';

@Entity({ name: 'personnel' })
export class PersonnelEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'wecom_user_id', type: 'varchar', length: 64, unique: true, nullable: true })
  wecomUserId!: string | null;

  @Column({ type: 'varchar', length: 64 })
  name!: string;

  @Column({ name: 'department_code', type: 'varchar', length: 64 })
  departmentCode!: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  position!: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  mobile!: string | null;

  @Column({ name: 'employment_status', type: 'varchar', length: 16, default: 'active' })
  employmentStatus!: string;

  @Column({ name: 'is_sync_from_wecom', type: 'boolean', default: true })
  isSyncFromWecom!: boolean;

  @Column({ type: 'text', nullable: true })
  remarks!: string | null;

  @CreateDateColumn({ name: 'created_at', type: timestampColumnType })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: timestampColumnType })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: timestampColumnType, nullable: true })
  deletedAt!: Date | null;
}
