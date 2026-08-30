import { IsArray, IsDateString, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

import { IsDateTimeString } from 'src/common/validators/is-date-time-string.decorator';

export class EnterprisePolicyCreateDto {
  @IsString()
  @MaxLength(128)
  title!: string;

  @IsString()
  @MaxLength(64)
  policyCode!: string;

  @IsString()
  @MaxLength(32)
  version!: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsEnum(['draft', 'published', 'deprecated'])
  status?: 'draft' | 'published' | 'deprecated';

  @IsOptional()
  @IsDateString()
  @IsDateTimeString()
  effectiveDate?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  fileIds?: string[];
}
