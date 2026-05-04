import { ArrayNotEmpty, IsArray, IsOptional, IsString } from 'class-validator';

export class WorkbenchApprovalReconcileDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  processInstanceIds!: string[];

  @IsOptional()
  @IsString()
  reason?: string;
}
