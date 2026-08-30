import { IsDateString, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { IsDateTimeString } from 'src/common/validators/is-date-time-string.decorator';

const DIMENSION_REPORT_DEPARTMENTS = ['shipping_dept', 'logistics_dept'] as const;
const DIMENSION_REPORT_TYPES = ['vessel', 'logistics_category'] as const;

export class ProcurementReportDimensionDetailsQueryDto {
  @IsIn(DIMENSION_REPORT_DEPARTMENTS)
  departmentCode!: (typeof DIMENSION_REPORT_DEPARTMENTS)[number];

  @IsIn(DIMENSION_REPORT_TYPES)
  dimensionType!: (typeof DIMENSION_REPORT_TYPES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(64)
  dimensionKey?: string;

  @IsDateString()
  @IsDateTimeString()
  startDate!: string;

  @IsDateString()
  @IsDateTimeString()
  endDate!: string;
}
