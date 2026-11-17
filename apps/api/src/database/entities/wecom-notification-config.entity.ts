import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'notification_app_configs' })
export class WecomNotificationConfigEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'corp_id', type: 'varchar', length: 64 }) corpId!: string;
  @Column({ name: 'agent_id', type: 'varchar', length: 32, nullable: true }) agentId!: string | null;
  @Column({ name: 'secret_ciphertext', type: 'text', nullable: true }) secretCiphertext!: string | null;
  @Column({ name: 'config_version', type: 'integer', default: 0 }) configVersion!: number;
  @Column({ name: 'updated_by', type: 'varchar', length: 64, nullable: true }) updatedBy!: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
}
