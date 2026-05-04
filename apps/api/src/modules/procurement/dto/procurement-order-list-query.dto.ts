import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import {
  PROCUREMENT_APPROVAL_CHANNELS,
  PROCUREMENT_DEPARTMENT_CODES,
  PROCUREMENT_DIMENSION_TYPES,
  PROCUREMENT_ORDER_STATUSES,
} from '../procurement.constants';

export class ProcurementOrderListQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  keyword?: string;

  @IsOptional()
  @IsIn(PROCUREMENT_DEPARTMENT_CODES)
  departmentCode?: (typeof PROCUREMENT_DEPARTMENT_CODES)[number];

  @IsOptional()
  @IsIn(PROCUREMENT_DIMENSION_TYPES)
  dimensionType?: (typeof PROCUREMENT_DIMENSION_TYPES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(64)
  dimensionKey?: string;

  @IsOptional()
  @IsIn(PROCUREMENT_ORDER_STATUSES)
  status?: (typeof PROCUREMENT_ORDER_STATUSES)[number];

  @IsOptional()
  @IsIn(PROCUREMENT_APPROVAL_CHANNELS)
  approvalChannel?: (typeof PROCUREMENT_APPROVAL_CHANNELS)[number];

  @IsOptional()
  @IsDateString()
  submittedFrom?: string;

  @IsOptional()
  @IsDateString()
  submittedTo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
