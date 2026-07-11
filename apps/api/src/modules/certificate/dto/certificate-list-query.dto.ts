import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class CertificateListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @IsOptional()
  @IsEnum(['vessel', 'vehicle', 'personnel', 'equipment'])
  ownerType?: 'vessel' | 'vehicle' | 'personnel' | 'equipment';

  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @IsOptional()
  @IsUUID()
  certificateTypeId?: string;

  @IsOptional()
  @IsEnum(['active', 'expired', 'archived'])
  status?: 'active' | 'expired' | 'archived';

  @IsOptional()
  @IsString()
  keyword?: string;
}
