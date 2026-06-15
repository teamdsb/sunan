import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type {
  ProcurementDepartmentCode,
  ProcurementDimensionType,
} from 'src/modules/procurement/procurement.constants';

const numericTransformer = {
  to(value: number): number {
    return value;
  },
  from(value: string): number {
    return Number(value);
  },
};

@Index('idx_procurement_budgets_year_enabled', ['budgetYear', 'isEnabled'])
@Index('idx_procurement_budgets_scope', [
  'budgetYear',
  'departmentCode',
  'dimensionType',
])
@Entity({ name: 'procurement_budgets' })
export class ProcurementBudgetEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'budget_year', type: 'int' })
  budgetYear!: number;

  @Column({ name: 'department_code', type: 'varchar', length: 32 })
  departmentCode!: ProcurementDepartmentCode;

  @Column({ name: 'dimension_type', type: 'varchar', length: 32 })
  dimensionType!: ProcurementDimensionType;

  @Column({
    name: 'dimension_key',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  dimensionKey!: string | null;

  @Column({ name: 'dimension_name_snapshot', type: 'varchar', length: 128 })
  dimensionNameSnapshot!: string;

  @Column({
    name: 'budget_amount',
    type: 'numeric',
    precision: 12,
    scale: 2,
    transformer: numericTransformer,
  })
  budgetAmount!: number;

  @Column({ name: 'is_enabled', type: 'boolean', default: true })
  isEnabled!: boolean;

  @Column({ name: 'created_by', type: 'varchar', length: 64 })
  createdBy!: string;

  @Column({ name: 'updated_by', type: 'varchar', length: 64 })
  updatedBy!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}
