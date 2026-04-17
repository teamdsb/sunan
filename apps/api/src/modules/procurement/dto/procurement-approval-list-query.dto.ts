import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { PROCUREMENT_DEPARTMENT_CODES } from '../procurement.constants';

const pendingEntityTypes = ['order', 'report'] as const;

export class ProcurementApprovalListQueryDto {
  @IsOptional()
  @IsIn(pendingEntityTypes)
  entityType?: (typeof pendingEntityTypes)[number];

  @IsOptional()
  @IsIn(PROCUREMENT_DEPARTMENT_CODES)
  departmentCode?: (typeof PROCUREMENT_DEPARTMENT_CODES)[number];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
