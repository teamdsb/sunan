import { IsOptional, IsString } from 'class-validator';

export class ReminderAcknowledgeDto {
  @IsOptional()
  @IsString()
  comment?: string;
}
