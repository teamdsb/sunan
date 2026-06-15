import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { PROCUREMENT_DEPARTMENT_CODES } from '../procurement.constants';

export class ProcurementBudgetListQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year!: number;

  @IsOptional()
  @IsIn(PROCUREMENT_DEPARTMENT_CODES)
  departmentCode?: (typeof PROCUREMENT_DEPARTMENT_CODES)[number];

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string' && value.toLowerCase() === 'true') {
      return true;
    }
    if (typeof value === 'string' && value.toLowerCase() === 'false') {
      return false;
    }
    return value;
  })
  @IsBoolean()
  isEnabled?: boolean;
}
