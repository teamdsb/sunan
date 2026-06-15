import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

const timestampColumnType = 'timestamptz';

@Index('uq_procurement_order_files_order_file', ['orderId', 'fileId'], { unique: true })
@Index('idx_procurement_order_files_order_id', ['orderId'])
@Index('idx_procurement_order_files_file_id', ['fileId'])
@Entity({ name: 'procurement_order_files' })
export class ProcurementOrderFileEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId!: string;

  @Column({ name: 'file_id', type: 'uuid' })
  fileId!: string;

  @Column({ name: 'relation_type', type: 'varchar', length: 32, default: 'attachment' })
  relationType!: 'attachment';

  @Column({ name: 'created_by', type: 'varchar', length: 64 })
  createdBy!: string;

  @CreateDateColumn({ name: 'created_at', type: timestampColumnType })
  createdAt!: Date;
}
