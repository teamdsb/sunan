import { IsBoolean, IsInt, IsOptional, IsString, Matches, MaxLength, Min, MinLength } from 'class-validator';

export class NotificationConfigUpdateDto {
  @IsInt()
  @Min(0)
  expectedConfigVersion!: number;

  @IsOptional()
  @IsString()
  @Matches(/^\s*\d+\s*$/, { message: 'AgentID 必须是数字' })
  @MaxLength(32)
  agentId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  secret?: string;

  @IsOptional()
  @IsBoolean()
  clearOverride?: boolean;
}

export class NotificationConnectionTestDto {
  @IsOptional()
  @IsString()
  @Matches(/^\s*\d*\s*$/, { message: 'AgentID 必须是数字' })
  @MaxLength(32)
  agentId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  secret?: string;

  @IsOptional()
  @IsBoolean()
  clearOverride?: boolean;
}

export class NotificationDraftTestDto extends NotificationConnectionTestDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  testUserId!: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  url?: string;
}

export class NotificationDeliveryReconcileDto {
  @IsBoolean()
  delivered!: boolean;
}
