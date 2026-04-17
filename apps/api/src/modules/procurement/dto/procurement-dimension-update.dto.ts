import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class ProcurementDimensionUpdateDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  dimensionName?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(9999)
  sortOrder?: number;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true') {
        return true;
      }
      if (normalized === 'false') {
        return false;
      }
    }

    return value;
  })
  @IsBoolean()
  isEnabled?: boolean;
}
