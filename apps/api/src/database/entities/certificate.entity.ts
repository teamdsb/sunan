import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'certificates' })
export class CertificateEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'certificate_type_id', type: 'uuid' })
  certificateTypeId!: string;

  @Column({ name: 'owner_type', type: 'varchar', length: 16 })
  ownerType!: 'vessel' | 'vehicle' | 'personnel' | 'equipment';

  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId!: string;

  @Column({
    name: 'certificate_no',
    type: 'varchar',
    length: 128,
    nullable: true,
  })
  certificateNo!: string | null;

  @Column({ type: 'varchar', length: 128 })
  title!: string;

  @Column({ name: 'issue_date', type: 'date', nullable: true })
  issueDate!: string | null;

  @Column({ name: 'expiry_date', type: 'date' })
  expiryDate!: string;

  @Column({ name: 'advance_days', type: 'integer' })
  advanceDays!: number;

  @Column({ type: 'varchar', length: 128, nullable: true })
  issuer!: string | null;

  @Column({ type: 'varchar', length: 16, default: 'active' })
  status!: 'active' | 'expired' | 'archived';

  @Column({ name: 'latest_scan_at', type: 'timestamptz', nullable: true })
  latestScanAt!: Date | null;

  @Column({ type: 'text', nullable: true })
  remarks!: string | null;

  @Column({ name: 'created_by', type: 'varchar', length: 64 })
  createdBy!: string;

  @Column({ name: 'updated_by', type: 'varchar', length: 64 })
  updatedBy!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}
