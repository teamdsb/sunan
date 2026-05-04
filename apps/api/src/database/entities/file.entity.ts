import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { appEnv } from 'src/config/env';

const timestampColumnType = 'timestamptz';

@Entity({ name: 'files' })
export class FileEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'oss_key', type: 'varchar', length: 255, unique: true })
  ossKey!: string;

  @Column({ name: 'file_name', type: 'varchar', length: 255 })
  fileName!: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 128 })
  mimeType!: string;

  @Column({ name: 'file_size', type: 'integer' })
  fileSize!: number;

  @Column({ type: 'varchar', length: 64 })
  category!: string;

  @Column({ name: 'uploaded_by', type: 'varchar', length: 64, nullable: true })
  uploadedBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: timestampColumnType })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: timestampColumnType })
  updatedAt!: Date;
}
