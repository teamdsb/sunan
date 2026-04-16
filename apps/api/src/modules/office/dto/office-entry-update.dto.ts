import { Type } from 'class-transformer';
import { ArrayUnique, IsArray, IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { OFFICE_CATEGORY_DEFINITIONS, OFFICE_OPEN_MODES, OFFICE_TARGET_TYPES, OFFICE_VISIBILITY_ROLES } from '../office.constants';

const categoryCodes = OFFICE_CATEGORY_DEFINITIONS.map((item) => item.code);

export class OfficeEntryUpdateDto {
  @IsOptional()
  @IsIn(categoryCodes)
  categoryCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  summary?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  iconType?: string;

  @IsOptional()
  @IsIn(OFFICE_TARGET_TYPES)
  targetType?: 'external_url' | 'internal_route';

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  targetValue?: string;

  @IsOptional()
  @IsIn(OFFICE_OPEN_MODES)
  openMode?: 'current_webview' | 'new_window';

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn(OFFICE_VISIBILITY_ROLES, { each: true })
  visibilityRoles?: string[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn(OFFICE_VISIBILITY_ROLES, { each: true })
  managerRoles?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
