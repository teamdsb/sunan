import {
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsIn,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class LearningPublishDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  userIds!: string[];
  @IsNumber({ maxDecimalPlaces: 3 }) @Min(0) @Max(1000) hours!: number;
}
export class LearningConfirmDto {
  @IsString() @IsNotEmpty() materialId!: string;
}
export class FuelActualDto {
  @IsNumber({ maxDecimalPlaces: 3 }) @Min(0.001) @Max(1e9) amount!: number;
  @IsISO8601({ strict: true })
  @Matches(/T.*(?:Z|[+-]\d{2}:?\d{2})$/)
  occurredAt!: string;
  @IsString() @IsNotEmpty() @MaxLength(64) fuelType!: string;
  @IsIn(['L', 't']) unit!: 'L' | 't';
}
export class FuelMeasurementDto {
  @IsUUID() vesselId!: string;
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/) month!: string;
  @IsString() @IsNotEmpty() @MaxLength(64) fuelType!: string;
  @IsIn(['L', 't']) unit!: 'L' | 't';
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Max(1e9)
  openingBalance?: number;
  @IsNumber({ maxDecimalPlaces: 3 }) @Min(0) @Max(1e9) closingBalance!: number;
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Max(1e9)
  lowFuelThreshold?: number;
}
