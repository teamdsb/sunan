import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

const PROCUREMENT_DICTIONARY_DEPARTMENT_CODES = ['shipping_dept', 'logistics_dept'] as const;
const PROCUREMENT_DICTIONARY_DIMENSION_TYPES = ['vessel', 'logistics_category'] as const;

export class ProcurementDimensionCreateDto {
  @IsIn(PROCUREMENT_DICTIONARY_DEPARTMENT_CODES)
  departmentCode!: (typeof PROCUREMENT_DICTIONARY_DEPARTMENT_CODES)[number];

  @IsIn(PROCUREMENT_DICTIONARY_DIMENSION_TYPES)
  dimensionType!: (typeof PROCUREMENT_DICTIONARY_DIMENSION_TYPES)[number];

  @IsString()
  @MaxLength(64)
  dimensionKey!: string;

  @IsString()
  @MaxLength(128)
  dimensionName!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(9999)
  sortOrder?: number;
}
