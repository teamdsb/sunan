import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { appEnv } from 'src/config/env';

const timestampColumnType = appEnv.NODE_ENV === 'test' ? 'datetime' : 'timestamptz';

@Entity({ name: 'certificate_files' })
export class CertificateFileEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'certificate_id', type: 'uuid' })
  certificateId!: string;

  @Column({ name: 'file_id', type: 'uuid' })
  fileId!: string;

  @Column({ name: 'file_role', type: 'varchar', length: 32, default: 'primary' })
  fileRole!: string;

  @Column({ name: 'sort_order', type: 'integer', default: 0 })
  sortOrder!: number;

  @CreateDateColumn({ name: 'created_at', type: timestampColumnType })
  createdAt!: Date;
}

