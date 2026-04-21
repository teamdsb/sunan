import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

const timestampColumnType = 'timestamptz';

@Index('uk_workbench_templates_template_code_version', ['templateCode', 'schemaVersion'], { unique: true })
@Index('idx_workbench_templates_module_code_enabled', ['moduleCode', 'enabled'])
@Entity({ name: 'workbench_templates' })
export class WorkbenchTemplateEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'module_code', type: 'varchar', length: 64 })
  moduleCode!: string;

  @Column({ name: 'template_code', type: 'varchar', length: 128 })
  templateCode!: string;

  @Column({ name: 'template_type', type: 'varchar', length: 64 })
  templateType!: string;

  @Column({ name: 'schema_version', type: 'int', default: 1 })
  schemaVersion!: number;

  @Column({ name: 'field_schema', type: 'jsonb', default: () => "'{}'::jsonb" })
  fieldSchema!: Record<string, unknown>;

  @Column({ name: 'step_schema', type: 'jsonb', default: () => "'[]'::jsonb" })
  stepSchema!: unknown[];

  @Column({ name: 'print_schema', type: 'jsonb', default: () => "'{}'::jsonb" })
  printSchema!: Record<string, unknown>;

  @Column({ name: 'approval_template_code', type: 'varchar', length: 128, nullable: true })
  approvalTemplateCode!: string | null;

  @Column({ type: 'boolean', default: true })
  enabled!: boolean;

  @CreateDateColumn({ name: 'created_at', type: timestampColumnType })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: timestampColumnType })
  updatedAt!: Date;
}
