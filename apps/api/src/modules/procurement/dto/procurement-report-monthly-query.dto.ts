import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { PROCUREMENT_DEPARTMENT_CODES } from '../procurement.constants';

export class ProcurementReportMonthlyQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  year!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;

  @IsOptional()
  @IsIn(PROCUREMENT_DEPARTMENT_CODES)
  departmentCode?: (typeof PROCUREMENT_DEPARTMENT_CODES)[number];
}
