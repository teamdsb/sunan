import { IsArray, IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

import { IsDateTimeString } from 'src/common/validators/is-date-time-string.decorator';

export class CertificateCreateDto {
  @IsUUID()
  certificateTypeId!: string;

  @IsEnum(['vessel', 'vehicle', 'personnel', 'equipment'])
  ownerType!: 'vessel' | 'vehicle' | 'personnel' | 'equipment';

  @IsUUID()
  ownerId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  certificateNo?: string;

  @IsString()
  @MaxLength(128)
  title!: string;

  @IsOptional()
  @IsDateString()
  @IsDateTimeString()
  issueDate?: string;

  @IsDateString()
  @IsDateTimeString()
  expiryDate!: string;

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
