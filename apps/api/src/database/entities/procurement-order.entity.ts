import { Column, CreateDateColumn, DeleteDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import type { ProcurementApprovalChannel, ProcurementDepartmentCode, ProcurementDimensionType, ProcurementOrderStatus } from 'src/modules/procurement/procurement.constants';

const timestampColumnType = 'timestamptz';

const numericTransformer = {
  to(value: number): number {
    return value;
  },
  from(value: string): number {
    return Number(value);
  },
};

@Index('idx_procurement_orders_department_status', ['departmentCode', 'status'])
@Index('idx_procurement_orders_submitted_at', ['submittedAt'])
@Index('idx_procurement_orders_dimension', ['departmentCode', 'dimensionType', 'dimensionKey'])
@Index('idx_procurement_orders_approval_channel', ['approvalChannel', 'externalStatus'])
@Entity({ name: 'procurement_orders' })
export class ProcurementOrderEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'order_no', type: 'varchar', length: 32 })
  orderNo!: string;

  @Column({ name: 'department_code', type: 'varchar', length: 32 })
  departmentCode!: ProcurementDepartmentCode;

  @Column({ name: 'dimension_type', type: 'varchar', length: 32, default: 'none' })
  dimensionType!: ProcurementDimensionType;

  @Column({ name: 'dimension_key', type: 'varchar', length: 64, nullable: true })
  dimensionKey!: string | null;

  @Column({ type: 'varchar', length: 128 })
  title!: string;

  @Column({ type: 'text' })
  summary!: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: numericTransformer })
  amount!: number;

  @Column({ name: 'expense_date', type: 'date', nullable: true })
  expenseDate!: string | null;

  @Column({ type: 'varchar', length: 32, default: 'draft' })
  status!: ProcurementOrderStatus;

  @Column({ name: 'approval_channel', type: 'varchar', length: 32, default: 'internal' })
  approvalChannel!: ProcurementApprovalChannel;

  @Column({ name: 'external_process_instance_id', type: 'varchar', length: 128, nullable: true })
  externalProcessInstanceId!: string | null;

  @Column({ name: 'external_status', type: 'varchar', length: 64, nullable: true })
  externalStatus!: string | null;

  @Column({ name: 'external_synced_at', type: timestampColumnType, nullable: true })
  externalSyncedAt!: Date | null;

  @Column({ name: 'submitted_at', type: timestampColumnType, nullable: true })
  submittedAt!: Date | null;

  @Column({ name: 'final_approved_at', type: timestampColumnType, nullable: true })
  finalApprovedAt!: Date | null;

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
