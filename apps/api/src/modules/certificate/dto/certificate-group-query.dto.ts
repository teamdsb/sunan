import { IsEnum } from 'class-validator';

export class CertificateGroupQueryDto {
  @IsEnum(['owner', 'type'])
  groupBy!: 'owner' | 'type';
}

