import { IsString, MaxLength } from 'class-validator';

export class FileFromWecomDto {
  @IsString()
  @MaxLength(255)
  mediaId!: string;

  @IsString()
  @MaxLength(64)
  category!: string;
}
