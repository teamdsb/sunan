import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Index('idx_workbench_record_transfers_record_created', ['businessRecordId', 'createdAt'])
@Entity({ name: 'workbench_record_transfers' })
export class WorkbenchRecordTransferEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'business_record_id', type: 'uuid' }) businessRecordId!: string;
  @Column({ name: 'from_user_id', type: 'varchar', length: 64 }) fromUserId!: string;
  @Column({ name: 'to_user_id', type: 'varchar', length: 64 }) toUserId!: string;
  @Column({ type: 'text' }) reason!: string;
  @Column({ name: 'transferred_by', type: 'varchar', length: 64 }) transferredBy!: string;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
}
