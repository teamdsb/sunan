import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PROCUREMENT_APPROVAL_ACTIONS, PROCUREMENT_APPROVAL_SOURCES } from '../procurement.constants';

export class ProcurementApprovalActionDto {
  @IsIn(PROCUREMENT_APPROVAL_ACTIONS)
  action!: (typeof PROCUREMENT_APPROVAL_ACTIONS)[number];

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsIn(PROCUREMENT_APPROVAL_SOURCES)
  source?: (typeof PROCUREMENT_APPROVAL_SOURCES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(128)
  externalEventId?: string;
}
