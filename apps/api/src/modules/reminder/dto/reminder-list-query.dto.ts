import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ReminderListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;

  @IsOptional()
  @IsEnum(['pending', 'dispatching', 'sent', 'acknowledged', 'failed'])
  status?: 'pending' | 'dispatching' | 'sent' | 'acknowledged' | 'failed';

  @IsOptional()
  @IsEnum(['upcoming', 'overdue'])
  reminderType?: 'upcoming' | 'overdue';

  @IsOptional()
  @IsEnum(['vessel', 'vehicle', 'personnel'])
  ownerType?: 'vessel' | 'vehicle' | 'personnel';
}
