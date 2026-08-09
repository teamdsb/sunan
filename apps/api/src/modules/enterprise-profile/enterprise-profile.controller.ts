import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUserDecorator } from 'src/common/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/interfaces/current-user.interface';
import { EnterpriseProfileBindFilesDto } from './dto/enterprise-profile-bind-files.dto';
import { EnterpriseProfileCreateDto } from './dto/enterprise-profile-create.dto';
import { EnterpriseProfileListQueryDto } from './dto/enterprise-profile-list-query.dto';
import { EnterpriseProfileUpdateDto } from './dto/enterprise-profile-update.dto';
import { EnterpriseProfileService } from './enterprise-profile.service';

@Controller('/api/v1/enterprise-profiles')
@UseGuards(JwtAuthGuard)
export class EnterpriseProfileController {
  constructor(private readonly service: EnterpriseProfileService) {}

  @Get()
  list(@Query() query: EnterpriseProfileListQueryDto, @CurrentUserDecorator() user: CurrentUser) {
    return this.service.list(query, user);
  }

  @Get(':id')
  async getById(@Param('id') id: string, @CurrentUserDecorator() user: CurrentUser) {
    return { data: await this.service.getById(id, user) };
  }

  @Post()
  async create(@Body() dto: EnterpriseProfileCreateDto, @CurrentUserDecorator() user: CurrentUser) {
    return { data: await this.service.create(dto, user) };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: EnterpriseProfileUpdateDto, @CurrentUserDecorator() user: CurrentUser) {
    return { data: await this.service.update(id, dto, user) };
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string, @CurrentUserDecorator() user: CurrentUser) {
    await this.service.remove(id, user);
  }

  @Post(':id/files')
  async bindFiles(@Param('id') id: string, @Body() dto: EnterpriseProfileBindFilesDto, @CurrentUserDecorator() user: CurrentUser) {
    return { data: await this.service.bindFiles(id, dto, user) };
  }

  @Delete(':id/files/:fileId')
  @HttpCode(204)
  async unbindFile(@Param('id') id: string, @Param('fileId') fileId: string, @CurrentUserDecorator() user: CurrentUser) {
    await this.service.unbindFile(id, fileId, user);
  }

  @Get(':id/files/:fileId/download-url')
  async getFileDownloadUrl(
    @Param('id') id: string,
    @Param('fileId') fileId: string,
  ) {
    return { data: await this.service.getFileDownloadUrl(id, fileId) };
  }
}
