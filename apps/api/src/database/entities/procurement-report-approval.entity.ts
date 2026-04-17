import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { appEnv } from 'src/config/env';
import type {
  ProcurementApprovalAction,
  ProcurementApprovalSource,
  ProcurementReportApprovalLevel,
} from 'src/modules/procurement/procurement.constants';

const timestampColumnType = 'timestamptz';

@Index('idx_procurement_report_approvals_report_created', ['reportId', 'approvedAt'])
@Index('idx_procurement_report_approvals_level_action', ['approvalLevel', 'action'])
@Entity({ name: 'procurement_report_approvals' })
export class ProcurementReportApprovalEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'report_id', type: 'uuid' })
  reportId!: string;

  @Column({ name: 'approval_level', type: 'varchar', length: 32 })
  approvalLevel!: ProcurementReportApprovalLevel;

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
