import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { appEnv } from 'src/config/env';

const timestampColumnType = 'timestamptz';

@Index('idx_office_entry_audits_entry_id_created_at', ['entryId', 'createdAt'])
@Entity({ name: 'office_entry_audits' })
export class OfficeEntryAuditEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'entry_id', type: 'uuid' })
  entryId!: string;

  @Column({ type: 'varchar', length: 32 })
  action!: 'create' | 'update' | 'publish' | 'disable' | 'open';

  @Column({ name: 'operator_user_id', type: 'varchar', length: 64 })
  operatorUserId!: string;

  @Column({ name: 'payload_snapshot', type: 'jsonb', default: () => "'{}'::jsonb" })
  payloadSnapshot!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: timestampColumnType })
  createdAt!: Date;
}
