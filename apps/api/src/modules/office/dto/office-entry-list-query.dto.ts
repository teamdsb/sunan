import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { OFFICE_CATEGORY_DEFINITIONS } from '../office.constants';

const categoryCodes = OFFICE_CATEGORY_DEFINITIONS.map((item) => item.code);

export class OfficeEntryListQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  keyword?: string;

  @IsOptional()
  @IsIn(categoryCodes)
  categoryCode?: string;
}
