import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { appEnv } from 'src/config/env';
import type { ProcurementApprovalAction, ProcurementApprovalLevel, ProcurementApprovalSource } from 'src/modules/procurement/procurement.constants';

const timestampColumnType = appEnv.NODE_ENV === 'test' ? 'datetime' : 'timestamptz';

@Index('idx_procurement_order_approvals_order_created', ['orderId', 'approvedAt'])
@Index('idx_procurement_order_approvals_level_action', ['approvalLevel', 'action'])
@Entity({ name: 'procurement_order_approvals' })
export class ProcurementOrderApprovalEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId!: string;

  @Column({ name: 'approval_level', type: 'varchar', length: 32 })
  approvalLevel!: ProcurementApprovalLevel;

  @Column({ type: 'varchar', length: 32 })
  action!: ProcurementApprovalAction;

  @Column({ type: 'text', nullable: true })
  comment!: string | null;

  @Column({ type: 'varchar', length: 32, default: 'internal' })
  source!: ProcurementApprovalSource;

  @Column({ name: 'external_event_id', type: 'varchar', length: 128, nullable: true })
  externalEventId!: string | null;

  @Column({ name: 'approved_by', type: 'varchar', length: 64 })
  approvedBy!: string;

  @CreateDateColumn({ name: 'approved_at', type: timestampColumnType })
  approvedAt!: Date;

  @Column({ name: 'payload_snapshot', type: 'jsonb', default: () => "'{}'::jsonb" })
  payloadSnapshot!: Record<string, unknown>;
}
