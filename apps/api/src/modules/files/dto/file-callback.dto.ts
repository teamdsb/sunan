import { IsInt, IsString, MaxLength, Min } from 'class-validator';

export class FileCallbackDto {
  @IsString()
  @MaxLength(255)
  ossKey!: string;

  @IsString()
  @MaxLength(255)
  fileName!: string;

  @IsString()
  @MaxLength(128)
  mimeType!: string;

  @IsInt()
  @Min(1)
  fileSize!: number;

  @IsString()
  @MaxLength(64)
  category!: string;
}
