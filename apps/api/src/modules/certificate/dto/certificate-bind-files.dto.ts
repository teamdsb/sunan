import { IsArray, IsUUID } from 'class-validator';

export class CertificateBindFilesDto {
  @IsArray()
  @IsUUID('4', { each: true })
  fileIds!: string[];
}

