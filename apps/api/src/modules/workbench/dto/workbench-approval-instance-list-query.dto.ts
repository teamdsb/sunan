import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

const APPROVAL_SYNC_STATUSES = ['pending', 'callback_received', 'reconciled', 'retrying', 'failed'] as const;
const EXTERNAL_STATUSES = ['pending', 'approved', 'rejected', 'canceled', 'terminated'] as const;

export class WorkbenchApprovalInstanceListQueryDto {
  @IsOptional()
  @IsString()
  processInstanceId?: string;

  @IsOptional()
  @IsString()
  businessRecordId?: string;

  @IsOptional()
  @IsString()
  moduleCode?: string;

  @IsOptional()
  @IsIn(APPROVAL_SYNC_STATUSES)
  approvalSyncStatus?: (typeof APPROVAL_SYNC_STATUSES)[number];

  @IsOptional()
  @IsIn(EXTERNAL_STATUSES)
  externalStatus?: (typeof EXTERNAL_STATUSES)[number];

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
