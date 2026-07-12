import { Column, CreateDateColumn, DeleteDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'safety_equipment' })
@Index('uq_safety_equipment_code', ['code'], { unique: true, where: 'deleted_at IS NULL' })
@Index('idx_safety_equipment_vessel_status', ['vesselId', 'status'], { where: 'deleted_at IS NULL' })
export class SafetyEquipmentEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'varchar', length: 64 }) code!: string;
  @Column({ type: 'varchar', length: 128 }) name!: string;
  @Column({ name: 'category_id', type: 'uuid' }) categoryId!: string;
  @Column({ name: 'vessel_id', type: 'uuid' }) vesselId!: string;
  @Column({ name: 'serial_no', type: 'varchar', length: 128, nullable: true }) serialNo!: string | null;
  @Column({ type: 'varchar', length: 16, default: 'active' }) status!: 'active' | 'inactive' | 'retired';
  @Column({ type: 'text', nullable: true }) remarks!: string | null;
  @Column({ name: 'created_by', type: 'varchar', length: 64 }) createdBy!: string;
  @Column({ name: 'updated_by', type: 'varchar', length: 64, nullable: true }) updatedBy!: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true }) deletedAt!: Date | null;
}
