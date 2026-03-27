import { IsOptional, IsString } from 'class-validator';

export class WecomCallbackDto {
  @IsString()
  code!: string;

  @IsOptional()
  @IsString()
  state?: string;
}
