import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { PROCUREMENT_APPROVAL_CHANNELS, PROCUREMENT_DEPARTMENT_CODES, PROCUREMENT_DIMENSION_TYPES } from '../procurement.constants';

export class ProcurementOrderCreateDto {
  @IsIn(PROCUREMENT_DEPARTMENT_CODES)
  departmentCode!: (typeof PROCUREMENT_DEPARTMENT_CODES)[number];

  @IsOptional()
  @IsIn(PROCUREMENT_DIMENSION_TYPES)
  dimensionType?: (typeof PROCUREMENT_DIMENSION_TYPES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(64)
  dimensionKey?: string;

  @IsString()
  @MaxLength(128)
  title!: string;

  @IsString()
  summary!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount!: number;

  @IsOptional()
  @IsDateString()
  expenseDate?: string;

  @IsOptional()
  @IsIn(PROCUREMENT_APPROVAL_CHANNELS)
  approvalChannel?: (typeof PROCUREMENT_APPROVAL_CHANNELS)[number];
}
