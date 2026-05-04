import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { PROCUREMENT_DEPARTMENT_CODES, PROCUREMENT_DIMENSION_TYPES } from '../procurement.constants';

export class ProcurementOrderUpdateDto {
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
  @IsString()
  @MaxLength(128)
  title?: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsDateString()
  expenseDate?: string;
}
