import { IsArray, IsUUID } from 'class-validator';

export class EnterpriseProfileBindFilesDto {
  @IsArray()
  @IsUUID('4', { each: true })
  fileIds!: string[];
}

