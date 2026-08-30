import { IsArray, IsDateString, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

import { IsDateTimeString } from 'src/common/validators/is-date-time-string.decorator';

export class EnterpriseProfileCreateDto {
  @IsString()
  @MaxLength(128)
  title!: string;

  @IsString()
  @MaxLength(32)
  category!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(['draft', 'published', 'archived'])
  status?: 'draft' | 'published' | 'archived';

  @IsOptional()
  @IsDateString()
  @IsDateTimeString()
  effectiveDate?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  fileIds?: string[];
}
