import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsObject, IsOptional, IsString, Min } from 'class-validator';

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
  @IsObject()
  payload?: Record<string, unknown>;
}
