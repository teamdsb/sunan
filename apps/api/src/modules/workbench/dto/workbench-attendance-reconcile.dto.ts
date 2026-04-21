import { IsIn, IsOptional, IsString, Matches } from 'class-validator';

export class WorkbenchAttendanceReconcileDto {
  @Matches(/^\d{4}-\d{2}$/)
  month!: string;

  @IsOptional()
  @IsString()
  departmentCode?: string;

  @IsOptional()
  @IsIn(['finance_template', 'exported_sheet', 'manual_snapshot'])
  compareSource?: 'finance_template' | 'exported_sheet' | 'manual_snapshot';

  @IsOptional()
  @IsString()
  attachmentFileId?: string;
}
