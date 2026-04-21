import { IsIn, IsOptional, IsString } from 'class-validator';

const ATTACHMENT_CATEGORIES = [
  'before_rectification',
  'after_rectification',
  'meeting_photo',
  'evidence',
  'document',
  'print_export',
] as const;

export class WorkbenchRecordUploadAttachmentDto {
  @IsIn(ATTACHMENT_CATEGORIES)
  category!: (typeof ATTACHMENT_CATEGORIES)[number];

  @IsOptional()
  @IsString()
  stepCode?: string;

  @IsString()
  fileId!: string;

  @IsOptional()
  @IsString()
  remark?: string;
}
