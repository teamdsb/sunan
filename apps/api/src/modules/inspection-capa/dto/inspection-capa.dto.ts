import { Type } from 'class-transformer';
import { ArrayMinSize, ArrayUnique, IsArray, IsBoolean, IsDateString, IsIn, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { RecurrenceRuleDto } from 'src/modules/plan-task/dto/plan-task.dto';

export class TemplateItemDto {
  @IsString() @IsNotEmpty() @MaxLength(64) itemCode!: string;
  @IsString() @IsNotEmpty() @MaxLength(200) title!: string;
  @IsOptional() @IsString() @MaxLength(200) clauseRef?: string;
  @IsBoolean() resultRequired!: boolean;
  @IsOptional() @IsBoolean() evidenceRequiredOnFailure?: boolean;
  @IsInt() @Min(1) sequenceNo!: number;
}

export class TemplateScopeDto {
  @IsOptional() @IsUUID() vesselId?: string;
  @IsOptional() @IsString() @MaxLength(64) departmentCode?: string;
}

export class CreateTemplateDto {
  @IsString() @IsNotEmpty() @MaxLength(64) code!: string;
  @IsString() @IsNotEmpty() @MaxLength(200) name!: string;
  @IsIn(['regulation', 'company', 'vessel']) sourceType!: string;
  @IsOptional() @IsString() @MaxLength(500) importSource?: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => TemplateScopeDto) scopes?: TemplateScopeDto[];
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => TemplateItemDto) items!: TemplateItemDto[];
}

export class CreateTemplateVersionDto {
  @IsOptional() @IsString() @MaxLength(500) importSource?: string;
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => TemplateItemDto) items!: TemplateItemDto[];
}

export class CreateInspectionPlanDto {
  @IsString() @IsNotEmpty() @MaxLength(200) title!: string;
  @IsUUID() templateVersionId!: string;
  @IsString() @IsNotEmpty() @MaxLength(64) responsibleUserId!: string;
  @IsOptional() @IsArray() @ArrayUnique() @IsString({ each: true }) participantUserIds?: string[];
  @IsOptional() @IsIn(['all', 'any', 'quorum']) completionRule: string = 'all';
  @IsOptional() @IsInt() @Min(1) quorumCount?: number;
  @IsOptional() @IsUUID() vesselId?: string;
  @ValidateNested() @Type(() => RecurrenceRuleDto) recurrence!: RecurrenceRuleDto;
  @IsInt() @Min(0) @Max(525600) dueOffsetMinutes!: number;
}

export class InspectionGenerationDto {
  @IsDateString() windowStart!: string;
  @IsDateString() windowEnd!: string;
  @IsOptional() @IsIn(['generate', 'reconcile']) mode: string = 'generate';
}

export class SaveInspectionResultDto {
  @IsString() @IsNotEmpty() @MaxLength(128) templateItemSnapshotKey!: string;
  @IsIn(['conforming', 'nonconforming', 'not_applicable']) conclusion!: string;
  @IsOptional() @IsString() @MaxLength(2000) remark?: string;
  @IsOptional() @IsArray() @ArrayUnique() @IsUUID('4', { each: true }) evidenceFileIds?: string[];
}

export class SubmitInspectionDto {
  @IsUUID() signatureFileId!: string;
  @IsOptional() @IsString() @MaxLength(500) remark?: string;
}

export class CreateIssueSourceDto {
  @IsString() @IsNotEmpty() sourceType!: string;
  @IsUUID() sourceId!: string;
  @IsOptional() @IsString() @MaxLength(128) sourceItemKey?: string;
}

export class CreateIssueDto {
  @IsString() @IsNotEmpty() @MaxLength(200) title!: string;
  @IsIn(['hazard', 'nonconformity', 'general', 'external']) issueType!: string;
  @IsIn(['minor', 'major', 'critical']) severity!: string;
  @IsOptional() @IsUUID() vesselId?: string;
  @IsOptional() @IsIn(['vessel', 'department', 'company']) responsibilityScope?: string;
  @IsString() @IsNotEmpty() @MaxLength(64) responsibleUserId!: string;
  @IsDateString() dueAt!: string;
  @IsOptional() @ValidateNested() @Type(() => CreateIssueSourceDto) source?: CreateIssueSourceDto;
}

export class CreateCapaDto {
  @IsString() @IsNotEmpty() @MaxLength(64) verifierUserId!: string;
  @IsOptional() @IsBoolean() effectivenessRequired: boolean = true;
}

export class RootCauseDto {
  @IsIn(['five_whys', 'fishbone', 'category', 'other']) method!: string;
  @IsString() @IsNotEmpty() @MaxLength(4000) conclusion!: string;
  @IsOptional() @IsObject() analysis?: Record<string, unknown>;
}

export class CreateCapaActionDto {
  @IsIn(['corrective', 'preventive']) actionType!: string;
  @IsString() @IsNotEmpty() @MaxLength(500) title!: string;
  @IsString() @IsNotEmpty() @MaxLength(64) responsibleUserId!: string;
  @IsDateString() dueAt!: string;
}

export class SubmitCapaActionDto {
  @IsString() @IsNotEmpty() @MaxLength(4000) completionStatement!: string;
  @IsArray() @ArrayMinSize(1) @ArrayUnique() @IsUUID('4', { each: true }) evidenceFileIds!: string[];
}

export class AcceptCapaActionDto { @IsString() @IsNotEmpty() @MaxLength(1000) comment!: string; }

export class VerificationDto {
  @IsIn(['passed', 'failed']) result!: string;
  @IsString() @IsNotEmpty() @MaxLength(4000) conclusion!: string;
  @IsString() @IsNotEmpty() @MaxLength(4000) effectivenessEvaluation!: string;
  @IsOptional() @IsString() @MaxLength(4000) reworkReason?: string;
}

export class CloseIssueDto { @IsString() @IsNotEmpty() @MaxLength(1000) comment!: string; }

export class InspectionListQueryDto {
  @IsOptional() @IsIn(['pending', 'in_progress', 'submitted', 'completed', 'cancelled']) status?: string;
  @IsOptional() @IsUUID() taskId?: string;
  @IsOptional() @IsUUID() vesselId?: string;
}

export class IssueListQueryDto {
  @IsOptional() @IsIn(['open', 'analyzing', 'action_in_progress', 'pending_verification', 'closed']) status?: string;
  @IsOptional() @IsIn(['hazard', 'nonconformity', 'general', 'external']) issueType?: string;
  @IsOptional() @IsIn(['minor', 'major', 'critical']) severity?: string;
  @IsOptional() @IsUUID() vesselId?: string;
}
