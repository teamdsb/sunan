import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ProcurementOrderAttachmentUnlinkDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}
