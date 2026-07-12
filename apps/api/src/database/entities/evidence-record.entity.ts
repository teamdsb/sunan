import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Index('idx_evidence_records_business_status', ['businessType', 'businessId', 'status'])
@Entity({ name: 'evidence_records' })
export class EvidenceRecordEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'business_type', type: 'varchar', length: 64 }) businessType!: string;
  @Column({ name: 'business_id', type: 'uuid' }) businessId!: string;
  @Column({ name: 'evidence_type', type: 'varchar', length: 32 }) evidenceType!: string;
  @Column({ type: 'varchar', length: 32, default: 'active' }) status!: string;
  @Column({ name: 'file_id', type: 'uuid', nullable: true }) fileId!: string | null;
  @Column({ name: 'summary_hash', type: 'varchar', length: 64, nullable: true }) summaryHash!: string | null;
  @Column({ type: 'double precision', nullable: true }) latitude!: number | null;
  @Column({ type: 'double precision', nullable: true }) longitude!: number | null;
  @Column({ name: 'accuracy_meters', type: 'double precision', nullable: true }) accuracyMeters!: number | null;
  @Column({ name: 'capture_status', type: 'varchar', length: 32 }) captureStatus!: string;
  @Column({ name: 'failure_reason', type: 'varchar', length: 500, nullable: true }) failureReason!: string | null;
  @Column({ name: 'address_text', type: 'varchar', length: 500, nullable: true }) addressText!: string | null;
  @Column({ name: 'captured_by', type: 'varchar', length: 64 }) capturedBy!: string;
  @CreateDateColumn({ name: 'captured_at', type: 'timestamptz' }) capturedAt!: Date;
}
