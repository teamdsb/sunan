import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { ProcurementBudgetAuditAction } from 'src/modules/procurement/procurement.constants';

const nullableNumericTransformer = {
  to(value: number | null): number | null {
    return value;
  },
  from(value: string | null): number | null {
    return value === null ? null : Number(value);
  },
};

@Index('idx_procurement_budget_audits_budget_changed', [
  'budgetId',
  'changedAt',
])
@Entity({ name: 'procurement_budget_audits' })
export class ProcurementBudgetAuditEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'budget_id', type: 'uuid' })
  budgetId!: string;

  @Column({ type: 'varchar', length: 32 })
  action!: ProcurementBudgetAuditAction;

  @Column({
    name: 'before_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: nullableNumericTransformer,
  })
  beforeAmount!: number | null;

  @Column({
    name: 'after_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: nullableNumericTransformer,
  })
  afterAmount!: number | null;

  @Column({ name: 'before_enabled', type: 'boolean', nullable: true })
  beforeEnabled!: boolean | null;

  @Column({ name: 'after_enabled', type: 'boolean', nullable: true })
  afterEnabled!: boolean | null;

  @Column({ name: 'change_reason', type: 'varchar', length: 500 })
  changeReason!: string;

  @Column({
    name: 'payload_snapshot',
    type: 'jsonb',
    default: () => "'{}'::jsonb",
  })
  payloadSnapshot!: Record<string, unknown>;

  @Column({ name: 'changed_by', type: 'varchar', length: 64 })
  changedBy!: string;

  @CreateDateColumn({ name: 'changed_at', type: 'timestamptz' })
  changedAt!: Date;
}
