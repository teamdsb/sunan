import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional } from 'class-validator';

const PROCUREMENT_DICTIONARY_DEPARTMENT_CODES = ['shipping_dept', 'logistics_dept'] as const;

export class ProcurementDimensionListQueryDto {
  @IsOptional()
  @IsIn(PROCUREMENT_DICTIONARY_DEPARTMENT_CODES)
  departmentCode?: (typeof PROCUREMENT_DICTIONARY_DEPARTMENT_CODES)[number];

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true') {
        return true;
      }
      if (normalized === 'false') {
        return false;
      }
    }

    return value;
  })
  @IsBoolean()
  isEnabled?: boolean;
}
