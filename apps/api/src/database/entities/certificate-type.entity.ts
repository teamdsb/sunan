import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';


const timestampColumnType = 'timestamptz';

@Entity({ name: 'certificate_types' })
export class CertificateTypeEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 64, unique: true })
  code!: string;

  @Column({ type: 'varchar', length: 64, unique: true })
  name!: string;

  @Column({ name: 'owner_scope', type: 'varchar', length: 32 })
  ownerScope!: string;

  @Column({ name: 'reminder_category', type: 'varchar', length: 32 })
  reminderCategory!: string;

  @Column({ name: 'default_advance_days', type: 'integer' })
  defaultAdvanceDays!: number;

  @Column({ name: 'requires_attachment', type: 'boolean', default: true })
  requiresAttachment!: boolean;

  @Column({ name: 'sort_order', type: 'integer', default: 0 })
  sortOrder!: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: timestampColumnType })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: timestampColumnType })
  updatedAt!: Date;
}
