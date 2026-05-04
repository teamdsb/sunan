import { IsIn, IsOptional, IsString, Matches } from 'class-validator';

export class WorkbenchAttendanceExportQueryDto {
  @Matches(/^\d{4}-\d{2}$/)
  month!: string;

  @IsOptional()
  @IsString()
  departmentCode?: string;

  @IsOptional()
  @IsIn(['xlsx', 'pdf'])
  exportFormat?: 'xlsx' | 'pdf';
}
