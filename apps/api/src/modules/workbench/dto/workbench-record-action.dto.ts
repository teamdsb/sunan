import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';

const ACTION_TYPES = [
  'submit',
  'assign',
  'start',
  'complete_step',
  'submit_review',
  'request_rework',
  'close_record',
  'archive',
] as const;

export class WorkbenchRecordActionDto {
  @IsIn(ACTION_TYPES)
  actionType!: (typeof ACTION_TYPES)[number];

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}
