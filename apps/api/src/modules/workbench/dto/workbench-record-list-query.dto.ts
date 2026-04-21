import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

const TEMPLATE_TYPES = [
  'ledger_form',
  'operation_flow',
  'inspection_rectification',
  'attendance_statistics',
  'service_asset',
  'wecom_approval',
] as const;

export class WorkbenchRecordListQueryDto {
  @IsOptional()
  @IsString()
  moduleCode?: string;

  @IsOptional()
  @IsIn(TEMPLATE_TYPES)
  templateType?: (typeof TEMPLATE_TYPES)[number];

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  vesselId?: string;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
