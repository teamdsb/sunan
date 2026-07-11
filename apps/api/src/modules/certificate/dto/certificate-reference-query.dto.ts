import { IsEnum, IsOptional } from 'class-validator';

export class CertificateTypeListQueryDto {
  @IsOptional()
  @IsEnum(['vessel', 'vehicle', 'personnel', 'equipment'])
  ownerType?: 'vessel' | 'vehicle' | 'personnel' | 'equipment';
}

export class CertificateOwnerListQueryDto {
  @IsEnum(['vessel', 'vehicle', 'personnel', 'equipment'])
  ownerType!: 'vessel' | 'vehicle' | 'personnel' | 'equipment';
}
