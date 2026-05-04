import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsObject, IsOptional, IsString, Min } from 'class-validator';

const CALLBACK_STATUSES = ['pending', 'approved', 'rejected', 'canceled', 'terminated'] as const;

export class WorkbenchApprovalCallbackDto {
  @IsString()
  eventId!: string;

  @IsString()
  processInstanceId!: string;

  @IsIn(CALLBACK_STATUSES)
  status!: (typeof CALLBACK_STATUSES)[number];

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  callbackVersion!: number;

  @IsOptional()
  @Transform(({ value }) => (value === 'true' || value === true ? true : value === 'false' || value === false ? false : value))
  @IsBoolean()
  encrypted?: boolean;

  @IsOptional()
  @Transform(({ value, obj }) => {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
    if (typeof obj?.Encrypt === 'string' && obj.Encrypt.trim()) {
      return obj.Encrypt.trim();
    }
    return undefined;
  })
  @IsString()
  encrypt?: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}
