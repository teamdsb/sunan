import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUserDecorator } from 'src/common/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/interfaces/current-user.interface';
import { EnterprisePolicyBindFilesDto } from './dto/enterprise-policy-bind-files.dto';
import { EnterprisePolicyCreateDto } from './dto/enterprise-policy-create.dto';
import { EnterprisePolicyListQueryDto } from './dto/enterprise-policy-list-query.dto';
import { EnterprisePolicyUpdateDto } from './dto/enterprise-policy-update.dto';
import { EnterprisePolicyService } from './enterprise-policy.service';

@Controller('/api/v1/enterprise-policies')
@UseGuards(JwtAuthGuard)
export class EnterprisePolicyController {
  constructor(private readonly service: EnterprisePolicyService) {}

  @Get()
  list(@Query() query: EnterprisePolicyListQueryDto, @CurrentUserDecorator() user: CurrentUser) {
    return this.service.list(query, user);
  }

  @Get(':id')
  async getById(@Param('id') id: string, @CurrentUserDecorator() user: CurrentUser) {
    return { data: await this.service.getById(id, user) };
  }

  @Post()
  async create(@Body() dto: EnterprisePolicyCreateDto, @CurrentUserDecorator() user: CurrentUser) {
    return { data: await this.service.create(dto, user) };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: EnterprisePolicyUpdateDto, @CurrentUserDecorator() user: CurrentUser) {
    return { data: await this.service.update(id, dto, user) };
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string, @CurrentUserDecorator() user: CurrentUser) {
    await this.service.remove(id, user);
  }

  @Get(':id/versions')
  async versions(@Param('id') id: string) {
    return { data: await this.service.versions(id) };
  }

  @Post(':id/publish')
  async publish(@Param('id') id: string, @CurrentUserDecorator() user: CurrentUser) {
    return { data: await this.service.publish(id, user) };
  }

  @Post(':id/files')
  async bindFiles(@Param('id') id: string, @Body() dto: EnterprisePolicyBindFilesDto, @CurrentUserDecorator() user: CurrentUser) {
    return { data: await this.service.bindFiles(id, dto, user) };
  }

  @Get(':id/files/:fileId/download-url')
  async getFileDownloadUrl(
    @Param('id') id: string,
    @Param('fileId') fileId: string,
  ) {
    return { data: await this.service.getFileDownloadUrl(id, fileId) };
  }
}
