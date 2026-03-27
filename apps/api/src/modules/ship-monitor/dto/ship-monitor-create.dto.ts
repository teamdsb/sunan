import { IsEnum, IsInt, IsOptional, IsString, IsUrl, IsUUID, MaxLength, Min } from 'class-validator';

export class ShipMonitorCreateDto {
  @IsUUID()
  vesselId!: string;

  @IsString()
  @MaxLength(128)
  monitorName!: string;

  @IsUrl({ require_tld: false })
  endpointUrl!: string;

  @IsOptional()
  @IsEnum(['external', 'embed'])
  accessMode?: 'external' | 'embed';

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
