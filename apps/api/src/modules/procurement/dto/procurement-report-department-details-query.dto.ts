import { IsDateString, IsIn } from 'class-validator';
import { PROCUREMENT_DEPARTMENT_CODES } from '../procurement.constants';
import { IsDateTimeString } from 'src/common/validators/is-date-time-string.decorator';

export class ProcurementReportDepartmentDetailsQueryDto {
  @IsIn(PROCUREMENT_DEPARTMENT_CODES)
  departmentCode!: (typeof PROCUREMENT_DEPARTMENT_CODES)[number];

  @IsDateString()
  @IsDateTimeString()
  startDate!: string;

  @IsDateString()
  @IsDateTimeString()
  endDate!: string;
}
