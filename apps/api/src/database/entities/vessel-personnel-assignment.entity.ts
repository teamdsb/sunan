import { Column, CreateDateColumn, DeleteDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'vessel_personnel_assignments' })
@Index('idx_vessel_personnel_assignments_personnel_effective', ['personnelId', 'effectiveFrom'], { where: 'deleted_at IS NULL' })
@Index('idx_vessel_personnel_assignments_vessel_status', ['vesselId', 'status'], { where: 'deleted_at IS NULL' })
export class VesselPersonnelAssignmentEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'vessel_id', type: 'uuid' }) vesselId!: string;
  @Column({ name: 'personnel_id', type: 'uuid' }) personnelId!: string;
  @Column({ name: 'role_code', type: 'varchar', length: 64 }) roleCode!: string;
  @Column({ name: 'effective_from', type: 'date' }) effectiveFrom!: string;
  @Column({ name: 'effective_to', type: 'date', nullable: true }) effectiveTo!: string | null;
  @Column({ type: 'varchar', length: 16, default: 'active' }) status!: 'active' | 'ended';
  @Column({ name: 'vessel_name_snapshot', type: 'varchar', length: 128 }) vesselNameSnapshot!: string;
  @Column({ name: 'personnel_name_snapshot', type: 'varchar', length: 128 }) personnelNameSnapshot!: string;
  @Column({ name: 'created_by', type: 'varchar', length: 64 }) createdBy!: string;
  @Column({ name: 'updated_by', type: 'varchar', length: 64, nullable: true }) updatedBy!: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true }) deletedAt!: Date | null;
}
