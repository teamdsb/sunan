import { IsDateString, IsIn } from 'class-validator';
import { PROCUREMENT_DEPARTMENT_CODES } from '../procurement.constants';

export class ProcurementReportDepartmentDetailsQueryDto {
  @IsIn(PROCUREMENT_DEPARTMENT_CODES)
  departmentCode!: (typeof PROCUREMENT_DEPARTMENT_CODES)[number];

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;
}
