import { Transform, type TransformFnParams } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsObject, IsOptional, IsString, Min } from 'class-validator';

const CALLBACK_STATUSES = ['pending', 'approved', 'rejected', 'canceled', 'terminated'] as const;

export class WorkbenchApprovalCallbackDto {
  @IsString()
  eventId!: string;

  @IsString()
  processInstanceId!: string;

  @IsIn(CALLBACK_STATUSES)
  status!: (typeof CALLBACK_STATUSES)[number];

  @Transform((params: TransformFnParams) => {
    const value: unknown = params.value;
    return Number(value);
  })
  @IsInt()
  @Min(1)
  callbackVersion!: number;

  @IsOptional()
  @Transform((params: TransformFnParams) => {
    const value: unknown = params.value;
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  encrypted?: boolean;

  @IsOptional()
  @Transform((params: TransformFnParams) => {
    const value: unknown = params.value;
    const objectValue: unknown = params.obj;
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
    const encryptedValue =
      typeof objectValue === 'object' &&
      objectValue !== null &&
      'Encrypt' in objectValue
        ? objectValue.Encrypt
        : undefined;
    if (typeof encryptedValue === 'string' && encryptedValue.trim()) {
      return encryptedValue.trim();
    }
    return undefined;
  })
  @IsString()
  encrypt?: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}
