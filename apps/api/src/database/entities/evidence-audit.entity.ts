import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Index('idx_evidence_audits_object_created', ['objectType', 'objectId', 'createdAt'])
@Entity({ name: 'evidence_audits' })
export class EvidenceAuditEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'object_type', type: 'varchar', length: 64 })
  objectType!: string;

  @Column({ name: 'object_id', type: 'uuid' })
  objectId!: string;

  @Column({ name: 'file_id', type: 'uuid', nullable: true })
  fileId!: string | null;

  @Column({ type: 'varchar', length: 64 })
  action!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  reason!: string | null;

  @Column({ name: 'operator_user_id', type: 'varchar', length: 64 })
  operatorUserId!: string;

  @Column({ name: 'request_id', type: 'varchar', length: 128, nullable: true })
  requestId!: string | null;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  metadata!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
