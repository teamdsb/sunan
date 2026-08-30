import { IsISO8601, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { IsDateTimeString } from 'src/common/validators/is-date-time-string.decorator';

export class WorkbenchRecordCreateDto {
  @IsString()
  moduleCode!: string;

  @IsString()
  @MaxLength(120)
  title!: string;

  @IsString()
  @MaxLength(1000)
  summary!: string;

  @IsOptional()
  @IsString()
  vesselId?: string;

  @IsOptional()
  @IsISO8601()
  @IsDateTimeString()
  occurredAt?: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}
