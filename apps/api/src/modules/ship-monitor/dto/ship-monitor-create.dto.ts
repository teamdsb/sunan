import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  Max,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class ShipMonitorCreateDto {
  @IsUUID()
  vesselId!: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty({ message: '请输入监控名称' })
  @MaxLength(128)
  monitorName!: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsUrl(
    {
      require_tld: false,
      require_protocol: true,
      protocols: ['http', 'https'],
      disallow_auth: true,
    },
    { message: '请输入以 http:// 或 https:// 开头的监控地址' },
  )
  endpointUrl!: string;

  @IsOptional()
  @IsEnum(['external', 'embed'])
  accessMode?: 'external' | 'embed';

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2147483647)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
