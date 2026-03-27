import { IsBoolean, IsEnum, IsOptional } from 'class-validator';

export class SettingsUpdateDto {
  @IsOptional()
  @IsEnum(['dashboard', 'list'])
  reminderViewMode?: 'dashboard' | 'list';

  @IsOptional()
  @IsEnum(['owner', 'type'])
  certificateGroupBy?: 'owner' | 'type';

  @IsOptional()
  @IsBoolean()
  enablePushNotifications?: boolean;
}

