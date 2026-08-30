import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { IsDateTimeString } from 'src/common/validators/is-date-time-string.decorator';

export class PlanInputDto {
  @IsString() @IsNotEmpty() @MaxLength(200) title!: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsIn(['annual', 'monthly', 'periodic', 'one_time']) planType!: string;
  @IsIn(['Asia/Shanghai']) timeZone!: string;
  @IsOptional() @IsString() @MaxLength(64) ownerUserId?: string;
  @IsOptional() @IsUUID() vesselId?: string;
}

export class PlanActionDto {
  @IsIn(['activate', 'pause', 'retire']) actionType!: string;
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}

export class PlanListQueryDto {
  @IsOptional() @IsIn(['draft', 'active', 'paused', 'retired']) status?: string;
  @IsOptional() @IsUUID() vesselId?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 20;
}

export class PaginationQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 20;
}

export class RecurrenceRuleDto {
  @IsIn(['annual', 'monthly', 'periodic', 'one_time']) kind!: string;
  @IsDateString() @IsDateTimeString() startAt!: string;
  @IsOptional() @IsInt() @Min(1) @Max(12) month?: number;
  @IsOptional() @IsInt() @Min(1) @Max(31) dayOfMonth?: number;
  @IsOptional() @IsInt() @Min(1) @Max(366) intervalDays?: number;
}

export class PlanItemInputDto {
  @IsString() @IsNotEmpty() @MaxLength(200) title!: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsString() @IsNotEmpty() @MaxLength(64) responsibleUserId!: string;
  @IsOptional() @IsArray() @ArrayUnique() @IsString({ each: true }) participantUserIds?: string[];
  @IsIn(['all', 'any', 'quorum']) completionRule!: string;
  @IsOptional() @IsInt() @Min(1) quorumCount?: number;
  @IsInt() @Min(0) @Max(525600) dueOffsetMinutes!: number;
  @ValidateNested() @Type(() => RecurrenceRuleDto) recurrence!: RecurrenceRuleDto;
  @IsOptional() @IsBoolean() enabled?: boolean;
}

export class GenerationRequestDto {
  @IsDateString() @IsDateTimeString() windowStart!: string;
  @IsDateString() @IsDateTimeString() windowEnd!: string;
  @IsOptional() @IsIn(['generate', 'reconcile']) mode: string = 'generate';
}

export class TaskListQueryDto {
  @IsOptional() @IsIn(['todo', 'initiated', 'participated', 'completed', 'overdue']) view: string = 'todo';
  @IsOptional() @IsIn(['pending', 'in_progress', 'blocked', 'completed', 'cancelled']) status?: string;
  @IsOptional() @IsUUID() planId?: string;
  @IsOptional() @IsUUID() vesselId?: string;
  @IsOptional() @IsDateString() @IsDateTimeString() startAt?: string;
  @IsOptional() @IsDateString() @IsDateTimeString() endAt?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 20;
}

export class TaskActionDto {
  @IsIn(['start', 'complete', 'block', 'reschedule', 'cancel', 'remind', 'escalate', 'delegate', 'transfer']) actionType!: string;
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
  @IsOptional() @IsDateString() @IsDateTimeString() dueAt?: string;
  @IsOptional() @IsDateString() @IsDateTimeString() scheduledAt?: string;
  @IsOptional() @IsString() @MaxLength(64) recipientUserId?: string;
  @IsOptional() @IsString() @MaxLength(64) delegateUserId?: string;
  @IsOptional() @IsDateString() @IsDateTimeString() delegateUntil?: string;
  @IsOptional() @IsString() @MaxLength(64) transferToUserId?: string;
}
