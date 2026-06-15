import { Column, CreateDateColumn, DeleteDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

const timestampColumnType = 'timestamptz';

@Entity({ name: 'ship_monitors' })
export class ShipMonitorEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'vessel_id', type: 'uuid' })
  vesselId!: string;

  @Column({ name: 'monitor_name', type: 'varchar', length: 128 })
  monitorName!: string;

  @Column({ name: 'endpoint_url', type: 'text' })
  endpointUrl!: string;

  @Column({ name: 'access_mode', type: 'varchar', length: 16, default: 'external' })
  accessMode!: 'external' | 'embed';

  @Column({ name: 'sort_order', type: 'integer', default: 0 })
  sortOrder!: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'last_verified_at', type: timestampColumnType, nullable: true })
  lastVerifiedAt!: Date | null;

  @Column({ name: 'created_by', type: 'varchar', length: 64 })
  createdBy!: string;

  @Column({ name: 'updated_by', type: 'varchar', length: 64 })
  updatedBy!: string;

  @CreateDateColumn({ name: 'created_at', type: timestampColumnType })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: timestampColumnType })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: timestampColumnType, nullable: true })
  deletedAt!: Date | null;
}
