import { Column, CreateDateColumn, DeleteDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { appEnv } from 'src/config/env';

const timestampColumnType = 'timestamptz';
const dateColumnType = appEnv.NODE_ENV === 'test' ? 'date' : 'date';

@Entity({ name: 'enterprise_policies' })
export class EnterprisePolicyEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 128 })
  title!: string;

  @Column({ name: 'policy_code', type: 'varchar', length: 64 })
  policyCode!: string;

  @Column({ type: 'varchar', length: 32 })
  version!: string;

  @Column({ type: 'text', nullable: true })
  summary!: string | null;

  @Column({ type: 'varchar', length: 16, default: 'draft' })
  status!: 'draft' | 'published' | 'deprecated';

  @Column({ name: 'effective_date', type: dateColumnType, nullable: true })
  effectiveDate!: string | null;

  @Column({ name: 'published_at', type: timestampColumnType, nullable: true })
  publishedAt!: Date | null;

  @Column({ name: 'department_code', type: 'varchar', length: 64, nullable: true })
  departmentCode!: string | null;

  @Column({ name: 'created_by', type: 'varchar', length: 64 })
  createdBy!: string;

  @Column({ name: 'updated_by', type: 'varchar', length: 64 })
  updatedBy!: string;

  @CreateDateColumn({ name: 'created_at', type: timestampColumnType })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: timestampColumnType })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: timestampColumnType, nullable: true })
  deletedAt!: Date | null;
}

