import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { appEnv } from 'src/config/env';

const timestampColumnType = appEnv.NODE_ENV === 'test' ? 'datetime' : 'timestamptz';

@Entity({ name: 'enterprise_profile_files' })
export class EnterpriseProfileFileEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'enterprise_profile_id', type: 'uuid' })
  enterpriseProfileId!: string;

  @Column({ name: 'file_id', type: 'uuid' })
  fileId!: string;

  @Column({ name: 'sort_order', type: 'integer', default: 0 })
  sortOrder!: number;

  @CreateDateColumn({ name: 'created_at', type: timestampColumnType })
  createdAt!: Date;
}

