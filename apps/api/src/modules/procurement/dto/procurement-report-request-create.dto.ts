import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import {
  PROCUREMENT_APPROVAL_CHANNELS,
  PROCUREMENT_DEPARTMENT_CODES,
  PROCUREMENT_REPORT_TYPES,
} from '../procurement.constants';

export class ProcurementReportRequestCreateDto {
  @IsIn(PROCUREMENT_REPORT_TYPES)
  reportType!: (typeof PROCUREMENT_REPORT_TYPES)[number];

  @Type(() => Number)
  @IsInt()
  @Min(2000)
  periodYear!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  periodMonth?: number;

  @IsOptional()
  @IsIn(PROCUREMENT_DEPARTMENT_CODES)
  departmentCode?: (typeof PROCUREMENT_DEPARTMENT_CODES)[number];

  @IsOptional()
  @IsIn(PROCUREMENT_APPROVAL_CHANNELS)
  approvalChannel?: (typeof PROCUREMENT_APPROVAL_CHANNELS)[number];
}
