import { IsArray, IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

import { IsDateTimeString } from 'src/common/validators/is-date-time-string.decorator';

export class CertificateUpdateDto {
  @IsOptional()
  @IsUUID()
  certificateTypeId?: string;

  @IsOptional()
  @IsEnum(['vessel', 'vehicle', 'personnel', 'equipment'])
  ownerType?: 'vessel' | 'vehicle' | 'personnel' | 'equipment';

  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  certificateNo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  title?: string;

  @IsOptional()
  @IsDateString()
  @IsDateTimeString()
  issueDate?: string;

  @IsOptional()
  @IsDateString()
  @IsDateTimeString()
  expiryDate?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  advanceDays?: number;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  issuer?: string;

  @IsOptional()
  @IsEnum(['active', 'expired', 'archived'])
  status?: 'active' | 'expired' | 'archived';

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  fileIds?: string[];
}
