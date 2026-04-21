import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

const timestampColumnType = 'timestamptz';

@Index('uk_workbench_modules_module_code', ['moduleCode'], { unique: true })
@Index('idx_workbench_modules_department_sort', ['departmentCode', 'sortOrder'])
@Entity({ name: 'workbench_modules' })
export class WorkbenchModuleEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'module_code', type: 'varchar', length: 64 })
  moduleCode!: string;

  @Column({ name: 'module_name', type: 'varchar', length: 128 })
  moduleName!: string;

  @Column({ name: 'department_code', type: 'varchar', length: 64 })
  departmentCode!: string;

  @Column({ name: 'template_type', type: 'varchar', length: 64 })
  templateType!: string;

  @Column({ name: 'requires_approval', type: 'boolean', default: false })
  requiresApproval!: boolean;

  @Column({ name: 'supports_print', type: 'boolean', default: false })
  supportsPrint!: boolean;

  @Column({ name: 'supports_statistics', type: 'boolean', default: false })
  supportsStatistics!: boolean;

  @Column({ name: 'mobile_first', type: 'boolean', default: true })
  mobileFirst!: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ type: 'boolean', default: true })
  enabled!: boolean;

  @CreateDateColumn({ name: 'created_at', type: timestampColumnType })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: timestampColumnType })
  updatedAt!: Date;
}
