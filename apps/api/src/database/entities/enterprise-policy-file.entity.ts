import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { appEnv } from 'src/config/env';

const timestampColumnType = 'timestamptz';

@Entity({ name: 'enterprise_policy_files' })
export class EnterprisePolicyFileEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'enterprise_policy_id', type: 'uuid' })
  enterprisePolicyId!: string;

  @Column({ name: 'file_id', type: 'uuid' })
  fileId!: string;

  @Column({ name: 'sort_order', type: 'integer', default: 0 })
  sortOrder!: number;

  @CreateDateColumn({ name: 'created_at', type: timestampColumnType })
  createdAt!: Date;
}

