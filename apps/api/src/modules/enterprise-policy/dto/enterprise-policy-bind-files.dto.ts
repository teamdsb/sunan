import { IsArray, IsUUID } from 'class-validator';

export class EnterprisePolicyBindFilesDto {
  @IsArray()
  @IsUUID('4', { each: true })
  fileIds!: string[];
}

