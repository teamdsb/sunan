import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'office_categories' })
export class OfficeCategoryEntity {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  code!: string;

  @Column({ type: 'varchar', length: 64 })
  name!: string;

  @Column({ name: 'sort_order', type: 'integer', default: 0 })
  sortOrder!: number;

  @Column({ name: 'is_enabled', type: 'boolean', default: true })
  isEnabled!: boolean;
}
