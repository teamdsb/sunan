import { Column, CreateDateColumn, DeleteDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { appEnv } from 'src/config/env';
import type { ProcurementDepartmentCode, ProcurementDimensionType } from 'src/modules/procurement/procurement.constants';

const timestampColumnType = 'timestamptz';

@Index('idx_procurement_dimension_items_scope', ['departmentCode', 'dimensionType'])
@Index('idx_procurement_dimension_items_enabled', ['departmentCode', 'dimensionType', 'isEnabled'])
@Index('uq_procurement_dimension_items_scope_key', ['departmentCode', 'dimensionType', 'dimensionKey'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
@Entity({ name: 'procurement_dimension_items' })
export class ProcurementDimensionItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'department_code', type: 'varchar', length: 32 })
  departmentCode!: Extract<ProcurementDepartmentCode, 'shipping_dept' | 'logistics_dept'>;

  @Column({ name: 'dimension_type', type: 'varchar', length: 32 })
  dimensionType!: Extract<ProcurementDimensionType, 'vessel' | 'logistics_category'>;

  @Column({ name: 'dimension_key', type: 'varchar', length: 64 })
  dimensionKey!: string;

  @Column({ name: 'dimension_name', type: 'varchar', length: 128 })
  dimensionName!: string;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ name: 'is_enabled', type: 'boolean', default: true })
  isEnabled!: boolean;

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
