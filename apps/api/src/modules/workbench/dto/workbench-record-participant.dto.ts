import { IsIn, IsInt, IsOptional, IsString, Min, ValidateIf } from 'class-validator';

export class WorkbenchRecordParticipantDto {
  @IsString() userId!: string;
  @IsIn(['executor', 'collaborator', 'reviewer', 'observer', 'verifier']) role!: string;
  @IsOptional() @IsString() stepCode?: string;
  @IsOptional() @IsIn(['all', 'any', 'quorum']) completionRule?: string;
  @ValidateIf((value: { completionRule?: unknown }) => value.completionRule === 'quorum') @IsInt() @Min(1) quorumCount?: number;
}
