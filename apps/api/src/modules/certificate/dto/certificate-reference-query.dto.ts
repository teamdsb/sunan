import { IsEnum, IsOptional } from 'class-validator';

export class CertificateTypeListQueryDto {
  @IsOptional()
  @IsEnum(['vessel', 'vehicle', 'personnel'])
  ownerType?: 'vessel' | 'vehicle' | 'personnel';
}

export class CertificateOwnerListQueryDto {
  @IsEnum(['vessel', 'vehicle', 'personnel'])
  ownerType!: 'vessel' | 'vehicle' | 'personnel';
}
