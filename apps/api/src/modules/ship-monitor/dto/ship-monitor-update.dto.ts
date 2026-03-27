import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUrl, IsUUID, MaxLength, Min } from 'class-validator';

export class ShipMonitorUpdateDto {
  @IsOptional()
  @IsUUID()
  vesselId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  monitorName?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  endpointUrl?: string;

  @IsOptional()
  @IsEnum(['external', 'embed'])
  accessMode?: 'external' | 'embed';

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

