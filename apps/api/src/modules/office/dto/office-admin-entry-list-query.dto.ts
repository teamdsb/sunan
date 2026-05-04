import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { OFFICE_CATEGORY_DEFINITIONS, OFFICE_STATUSES } from '../office.constants';

const categoryCodes = OFFICE_CATEGORY_DEFINITIONS.map((item) => item.code);

export class OfficeAdminEntryListQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  keyword?: string;

  @IsOptional()
  @IsIn(categoryCodes)
  categoryCode?: string;

  @IsOptional()
  @IsIn(OFFICE_STATUSES)
  status?: 'draft' | 'published' | 'disabled';
}
