import { IsIn, IsOptional, IsString } from 'class-validator';

const RETRY_STRATEGIES = ['retry_callback_processing', 'fetch_instance_detail', 'full_reconcile'] as const;

export class WorkbenchApprovalRetryDto {
  @IsString()
  processInstanceId!: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsIn(RETRY_STRATEGIES)
  strategy?: (typeof RETRY_STRATEGIES)[number];
}
