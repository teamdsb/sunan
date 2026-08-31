import { IsArray, IsDateString, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

import { IsDateTimeString } from 'src/common/validators/is-date-time-string.decorator';

export class MasterDataListQueryDto {
  @IsOptional() @IsString() @MaxLength(128) keyword?: string;
  @IsOptional() @IsEnum(['true', 'false']) includeInactive?: 'true' | 'false';
}

export class VesselMasterDataDto {
  @IsOptional() @IsString() @MaxLength(32) code?: string;
  @IsOptional() @IsString() @MaxLength(64) name?: string;
  @IsOptional() @IsString() @MaxLength(32) category?: string;
  @IsOptional() @IsEnum(['active', 'inactive']) status?: 'active' | 'inactive';
  @IsOptional() @IsString() @MaxLength(16) mmsi?: string;
  @IsOptional() @IsString() remarks?: string;
}

export class PersonnelMasterDataDto {
  @IsOptional() @IsString() @MaxLength(64) name?: string;
  @IsOptional() @IsString() @MaxLength(64) departmentCode?: string;
  @IsOptional() @IsString() @MaxLength(64) wecomUserId?: string;
  @IsOptional() @IsString() @MaxLength(64) position?: string;
  @IsOptional() @IsString() @MaxLength(32) mobile?: string;
  @IsOptional() @IsEnum(['active', 'inactive', 'left']) employmentStatus?: 'active' | 'inactive' | 'left';
  @IsOptional() @IsString() remarks?: string;
}

export class AssignmentCreateDto {
  @IsUUID() vesselId!: string;
  @IsUUID() personnelId!: string;
  @IsString() @MaxLength(64) roleCode!: string;
  @IsDateString() @IsDateTimeString() effectiveFrom!: string;
  @IsOptional() @IsDateString() @IsDateTimeString() effectiveTo?: string;
}

export class EquipmentMasterDataDto {
  @IsOptional() @IsString() @MaxLength(64) code?: string;
  @IsOptional() @IsString() @MaxLength(128) name?: string;
  @IsOptional() @IsString() @MaxLength(64) categoryCode?: string;
  @IsOptional() @IsUUID() vesselId?: string;
  @IsOptional() @IsString() @MaxLength(128) serialNo?: string;
  @IsOptional() @IsEnum(['active', 'inactive', 'retired']) status?: 'active' | 'inactive' | 'retired';
  @IsOptional() @IsString() remarks?: string;
}

export class VehicleMasterDataDto {
  @IsOptional() @IsString() @MaxLength(32) plateNumber?: string;
  @IsOptional() @IsString() @MaxLength(32) vehicleType?: string;
  @IsOptional() @IsEnum(['active', 'inactive', 'retired']) status?: 'active' | 'inactive' | 'retired';
  @IsOptional() @IsString() remarks?: string;
}

export class MasterDataImportDto {
  @IsEnum(['vessels', 'personnel', 'equipment', 'assignments']) importType!: 'vessels' | 'personnel' | 'equipment' | 'assignments';
  @IsString() content!: string;
}

export class NormalizeReferenceDto {
  @IsUUID() sourceRecordId!: string;
  @IsString() @MaxLength(128) fieldKey!: string;
  @IsEnum(['vessel', 'personnel', 'equipment']) objectType!: 'vessel' | 'personnel' | 'equipment';
  @IsOptional() @IsUUID() objectId?: string;
}

export class ImportRowsDto {
  @IsArray() rows!: Array<Record<string, unknown>>;
}
