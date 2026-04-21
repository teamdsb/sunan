import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

const timestampColumnType = 'timestamptz';

@Index('uk_wecom_approval_template_bindings_scene_version', ['approvalScene', 'version'], { unique: true })
@Index('idx_wecom_approval_template_bindings_module_template', ['moduleCode', 'templateCode'])
@Entity({ name: 'wecom_approval_template_bindings' })
export class WecomApprovalTemplateBindingEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'module_code', type: 'varchar', length: 64 })
  moduleCode!: string;

  @Column({ name: 'template_code', type: 'varchar', length: 128 })
  templateCode!: string;

  @Column({ name: 'wecom_template_id', type: 'varchar', length: 128 })
  wecomTemplateId!: string;

  @Column({ name: 'approval_scene', type: 'varchar', length: 64 })
  approvalScene!: string;

  @Column({ type: 'int', default: 1 })
  version!: number;

  @Column({ name: 'visible_roles', type: 'jsonb', default: () => "'[]'::jsonb" })
  visibleRoles!: string[];

  @Column({ type: 'boolean', default: true })
  enabled!: boolean;

  @CreateDateColumn({ name: 'created_at', type: timestampColumnType })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: timestampColumnType })
  updatedAt!: Date;
}
