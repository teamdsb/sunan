import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUserDecorator } from 'src/common/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/interfaces/current-user.interface';
import { CertificateBindFilesDto } from './dto/certificate-bind-files.dto';
import { CertificateCreateDto } from './dto/certificate-create.dto';
import { CertificateGroupQueryDto } from './dto/certificate-group-query.dto';
import { CertificateListQueryDto } from './dto/certificate-list-query.dto';
import { CertificateUpdateDto } from './dto/certificate-update.dto';
import { CertificateService } from './certificate.service';

@Controller('/api/v1/certificates')
@UseGuards(JwtAuthGuard)
export class CertificateController {
  constructor(private readonly service: CertificateService) {}

  @Get()
  list(@Query() query: CertificateListQueryDto) {
    return this.service.list(query);
  }

  @Get('grouped')
  async grouped(@Query() query: CertificateGroupQueryDto) {
    return { data: await this.service.grouped(query) };
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return { data: await this.service.getById(id) };
  }

  @Post()
  async create(@Body() dto: CertificateCreateDto, @CurrentUserDecorator() user: CurrentUser) {
    return { data: await this.service.create(dto, user) };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: CertificateUpdateDto, @CurrentUserDecorator() user: CurrentUser) {
    return { data: await this.service.update(id, dto, user) };
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string, @CurrentUserDecorator() user: CurrentUser) {
    await this.service.remove(id, user);
  }

  @Post(':id/files')
  async bindFiles(@Param('id') id: string, @Body() dto: CertificateBindFilesDto, @CurrentUserDecorator() user: CurrentUser) {
    return { data: await this.service.bindFiles(id, dto, user) };
  }
}
