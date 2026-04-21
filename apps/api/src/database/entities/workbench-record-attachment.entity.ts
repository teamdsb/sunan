import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

const timestampColumnType = 'timestamptz';

@Index('idx_workbench_record_attachments_record_category', ['businessRecordId', 'category'])
@Index('idx_workbench_record_attachments_step_id', ['stepId'])
@Entity({ name: 'workbench_record_attachments' })
export class WorkbenchRecordAttachmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'business_record_id', type: 'uuid' })
  businessRecordId!: string;

  @Column({ name: 'step_id', type: 'uuid', nullable: true })
  stepId!: string | null;

  @Column({ type: 'varchar', length: 64 })
  category!: string;

  @Column({ name: 'file_id', type: 'uuid' })
  fileId!: string;

  @Column({ name: 'file_name', type: 'varchar', length: 256 })
  fileName!: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 128, default: 'application/octet-stream' })
  mimeType!: string;

  @Column({ name: 'storage_path', type: 'varchar', length: 512, nullable: true })
  storagePath!: string | null;

  @Column({ name: 'uploaded_by', type: 'varchar', length: 64 })
  uploadedBy!: string;

  @Column({ name: 'uploaded_at', type: timestampColumnType })
  uploadedAt!: Date;

  @Column({ type: 'text', nullable: true })
  remark!: string | null;

  @CreateDateColumn({ name: 'created_at', type: timestampColumnType })
  createdAt!: Date;
}
