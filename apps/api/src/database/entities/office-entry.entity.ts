import { Column, CreateDateColumn, DeleteDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { appEnv } from 'src/config/env';

const timestampColumnType = 'timestamptz';

@Index('idx_office_entries_category_status_sort', ['categoryCode', 'status', 'sortOrder'])
@Entity({ name: 'office_entries' })
export class OfficeEntryEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'category_code', type: 'varchar', length: 64 })
  categoryCode!: string;

  @Column({ type: 'varchar', length: 128 })
  title!: string;

  @Column({ type: 'text' })
  summary!: string;

  @Column({ name: 'icon_type', type: 'varchar', length: 64 })
  iconType!: string;

  @Column({ name: 'target_type', type: 'varchar', length: 32 })
  targetType!: 'external_url' | 'internal_route';

  @Column({ name: 'target_value', type: 'text' })
  targetValue!: string;

  @Column({ name: 'open_mode', type: 'varchar', length: 32, default: 'current_webview' })
  openMode!: 'current_webview' | 'new_window';

  @Column({ name: 'visibility_roles', type: 'jsonb', default: () => "'[]'::jsonb" })
  visibilityRoles!: string[];

  @Column({ name: 'manager_roles', type: 'jsonb', default: () => "'[]'::jsonb" })
  managerRoles!: string[];

  @Column({ name: 'sort_order', type: 'integer', default: 0 })
  sortOrder!: number;

  @Column({ type: 'varchar', length: 32, default: 'draft' })
  status!: 'draft' | 'published' | 'disabled';

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
