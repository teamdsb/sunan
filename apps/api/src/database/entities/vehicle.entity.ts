import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';


const timestampColumnType = 'timestamptz';

@Entity({ name: 'vehicles' })
export class VehicleEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'plate_number', type: 'varchar', length: 32, unique: true })
  plateNumber!: string;

  @Column({ name: 'vehicle_type', type: 'varchar', length: 32, nullable: true })
  vehicleType!: string | null;

  @Column({ type: 'varchar', length: 16, default: 'active' })
  status!: string;

  @Column({ type: 'text', nullable: true })
  remarks!: string | null;

  @CreateDateColumn({ name: 'created_at', type: timestampColumnType })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: timestampColumnType })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: timestampColumnType, nullable: true })
  deletedAt!: Date | null;
}
