import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class ProcurementBudgetUpdateDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  budgetAmount?: number;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string' && value.toLowerCase() === 'true') {
      return true;
    }
    if (typeof value === 'string' && value.toLowerCase() === 'false') {
      return false;
    }
    return value;
  })
  @IsBoolean()
  isEnabled?: boolean;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  changeReason!: string;
}
