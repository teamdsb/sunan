import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CertificateService } from './certificate.service';
import {
  CertificateOwnerListQueryDto,
  CertificateTypeListQueryDto,
} from './dto/certificate-reference-query.dto';

@Controller('/api/v1')
@UseGuards(JwtAuthGuard)
export class CertificateReferenceController {
  constructor(private readonly service: CertificateService) {}

  @Get('certificate-types')
  async listTypes(@Query() query: CertificateTypeListQueryDto) {
    return { data: await this.service.listTypes(query.ownerType) };
  }

  @Get('certificate-owners')
  async listOwners(@Query() query: CertificateOwnerListQueryDto) {
    return { data: await this.service.listOwners(query.ownerType) };
  }
}
