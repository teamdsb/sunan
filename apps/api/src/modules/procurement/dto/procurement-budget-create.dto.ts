import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  PROCUREMENT_DEPARTMENT_CODES,
  PROCUREMENT_DIMENSION_TYPES,
} from '../procurement.constants';

export class ProcurementBudgetCreateDto {
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  budgetYear!: number;

  @IsIn(PROCUREMENT_DEPARTMENT_CODES)
  departmentCode!: (typeof PROCUREMENT_DEPARTMENT_CODES)[number];

  @IsIn(PROCUREMENT_DIMENSION_TYPES)
  dimensionType!: (typeof PROCUREMENT_DIMENSION_TYPES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(64)
  dimensionKey?: string | null;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  budgetAmount!: number;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  changeReason!: string;
}
