import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { PROCUREMENT_DEPARTMENT_CODES } from '../procurement.constants';

export class ProcurementReportYearlyQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  year!: number;

  @IsOptional()
  @IsIn(PROCUREMENT_DEPARTMENT_CODES)
  departmentCode?: (typeof PROCUREMENT_DEPARTMENT_CODES)[number];
}
