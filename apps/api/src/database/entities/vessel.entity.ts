import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { appEnv } from 'src/config/env';

const timestampColumnType = 'timestamptz';

@Entity({ name: 'vessels' })
export class VesselEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 32, unique: true })
  code!: string;

  @Column({ type: 'varchar', length: 64, unique: true })
  name!: string;

  @Column({ type: 'varchar', length: 32 })
  category!: string;

  @Column({ type: 'varchar', length: 16, default: 'active' })
  status!: string;

  @Column({ type: 'varchar', length: 16, nullable: true })
  mmsi!: string | null;

  @Column({ type: 'text', nullable: true })
  remarks!: string | null;

  @CreateDateColumn({ name: 'created_at', type: timestampColumnType })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: timestampColumnType })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: timestampColumnType, nullable: true })
  deletedAt!: Date | null;
}
