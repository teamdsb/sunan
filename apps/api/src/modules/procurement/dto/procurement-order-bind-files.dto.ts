import { ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class ProcurementOrderBindFilesDto {
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  fileIds!: string[];
}
