import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class OfficeAuditListQueryDto {
  @IsOptional()
  @IsUUID()
  entryId?: string;

  @IsOptional()
  @IsIn(['create', 'update', 'publish', 'disable', 'delete', 'open'])
  action?: 'create' | 'update' | 'publish' | 'disable' | 'delete' | 'open';

  @IsOptional()
  @IsString()
  operatorUserId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}
