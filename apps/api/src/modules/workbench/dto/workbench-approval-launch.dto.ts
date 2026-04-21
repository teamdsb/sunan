import { IsObject, IsOptional, IsString } from 'class-validator';

export class WorkbenchApprovalLaunchDto {
  @IsString()
  moduleCode!: string;

  @IsString()
  businessRecordId!: string;

  @IsString()
  templateCode!: string;

  @IsString()
  title!: string;

  @IsString()
  applicantUserId!: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}
