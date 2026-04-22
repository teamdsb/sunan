import { IsIn, IsOptional } from 'class-validator';

export class WorkbenchRecordPrintQueryDto {
  @IsOptional()
  @IsIn(['A4', 'A3'])
  paperSize?: 'A4' | 'A3';
}

