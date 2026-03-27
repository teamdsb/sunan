import { IsIn, IsString, IsUrl } from 'class-validator';

export class JssdkSignatureDto {
  @IsUrl({
    require_tld: false,
    require_protocol: true,
    require_host: true,
  })
  url!: string;

  @IsString()
  @IsIn(['corp', 'agent'])
  type!: 'corp' | 'agent';
}
