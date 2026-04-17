import { Column, CreateDateColumn, DeleteDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { appEnv } from 'src/config/env';
import type {
  ProcurementApprovalChannel,
  ProcurementDepartmentCode,
  ProcurementReportRequestStatus,
  ProcurementReportType,
} from 'src/modules/procurement/procurement.constants';

const timestampColumnType = 'timestamptz';

@Index('idx_procurement_reports_type_period', ['reportType', 'periodYear', 'periodMonth'])
@Index('idx_procurement_reports_department_status', ['departmentCode', 'status'])
@Index('idx_procurement_reports_submitted_at', ['submittedAt'])
@Index('idx_procurement_reports_approval_channel', ['approvalChannel', 'externalStatus'])
@Entity({ name: 'procurement_reports' })
export class ProcurementReportEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'report_no', type: 'varchar', length: 32 })
  reportNo!: string;

  @Column({ name: 'report_type', type: 'varchar', length: 32 })
  reportType!: ProcurementReportType;

  @Column({ name: 'period_year', type: 'int' })
  periodYear!: number;

  @Column({ name: 'period_month', type: 'int', nullable: true })
  periodMonth!: number | null;

  @Column({ name: 'department_code', type: 'varchar', length: 32, nullable: true })
  departmentCode!: ProcurementDepartmentCode | null;

  @Column({ name: 'snapshot_params', type: 'jsonb', default: () => "'{}'::jsonb" })
  snapshotParams!: Record<string, unknown>;

  @Column({ name: 'snapshot_summary', type: 'jsonb', default: () => "'{}'::jsonb" })
  snapshotSummary!: Record<string, unknown>;

  @Column({ type: 'varchar', length: 32, default: 'draft' })
  status!: ProcurementReportRequestStatus;

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

  @Column({ name: 'export_pdf_file_id', type: 'uuid', nullable: true })
  exportPdfFileId!: string | null;

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
