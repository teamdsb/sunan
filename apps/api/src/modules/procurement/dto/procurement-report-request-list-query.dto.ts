import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import {
  PROCUREMENT_DEPARTMENT_CODES,
  PROCUREMENT_REPORT_REQUEST_STATUSES,
  PROCUREMENT_REPORT_TYPES,
} from '../procurement.constants';

export class ProcurementReportRequestListQueryDto {
  @IsOptional()
  @IsIn(PROCUREMENT_REPORT_TYPES)
  reportType?: (typeof PROCUREMENT_REPORT_TYPES)[number];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  periodYear?: number;

  @IsOptional()
  @IsIn(PROCUREMENT_DEPARTMENT_CODES)
  departmentCode?: (typeof PROCUREMENT_DEPARTMENT_CODES)[number];

  @IsOptional()
  @IsIn(PROCUREMENT_REPORT_REQUEST_STATUSES)
  status?: (typeof PROCUREMENT_REPORT_REQUEST_STATUSES)[number];

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
