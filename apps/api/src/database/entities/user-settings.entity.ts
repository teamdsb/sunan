import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { appEnv } from 'src/config/env';

const timestampColumnType = 'timestamptz';

@Entity({ name: 'user_settings' })
export class UserSettingsEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'varchar', length: 64, unique: true })
  userId!: string;

  @Column({ name: 'default_module', type: 'varchar', length: 32, default: 'my' })
  defaultModule!: 'my';

  @Column({ name: 'reminder_view_mode', type: 'varchar', length: 16, default: 'dashboard' })
  reminderViewMode!: 'dashboard' | 'list';

  @Column({ name: 'certificate_group_by', type: 'varchar', length: 16, default: 'owner' })
  certificateGroupBy!: 'owner' | 'type';

  @Column({ name: 'enable_push_notifications', type: 'boolean', default: true })
  enablePushNotifications!: boolean;

  @Column({ type: 'varchar', length: 16, default: 'light' })
  theme!: 'light';

  @CreateDateColumn({ name: 'created_at', type: timestampColumnType })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: timestampColumnType })
  updatedAt!: Date;
}

