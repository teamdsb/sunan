import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Matches,
  Min,
  MinLength,
} from 'class-validator';

import { BUSINESS_ROLES } from 'src/modules/auth/authorization.service';

const toBoolean = ({ value }: { value: unknown }): unknown => {
  if (value === undefined || value === null || value === '') return undefined;
  if (value === true || value === 'true' || value === '1' || value === 1) return true;
  if (value === false || value === 'false' || value === '0' || value === 0) return false;
  return value;
};

export class AdminUserListQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  departmentId?: number;

  @IsOptional()
  @IsIn([...BUSINESS_ROLES, 'all_authenticated', 'system_admin'])
  role?: string;

  @IsOptional()
  @IsIn(['enabled', 'disabled'])
  platformStatus?: 'enabled' | 'disabled';

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  isSystemAdmin?: boolean;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  hasLoggedIn?: boolean;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  hasOverrides?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;
}

export class AdminUserAuditQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;
}

export class UpdateAdminUserDto {
  @IsOptional()
  @IsIn(['follow_wecom', 'manual'])
  departmentMode?: 'follow_wecom' | 'manual';

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  manualDepartmentIds?: number[];

  @IsOptional()
  @IsIn(['auto', 'manual'])
  roleMode?: 'auto' | 'manual';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsIn([...BUSINESS_ROLES], { each: true })
  manualRoles?: string[];

  @IsOptional()
  @IsIn(['enabled', 'disabled'])
  platformStatus?: 'enabled' | 'disabled';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  expectedAuthorizationVersion!: number;

  @IsString()
  @MinLength(1)
  @Matches(/\S/)
  reason!: string;
}
