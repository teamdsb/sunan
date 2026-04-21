import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class WorkbenchApprovalReconcileDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  processInstanceIds!: string[];
}
