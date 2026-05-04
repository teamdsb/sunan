import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUserDecorator } from 'src/common/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/interfaces/current-user.interface';
import { OfficeAdminEntryListQueryDto } from './dto/office-admin-entry-list-query.dto';
import { OfficeAuditListQueryDto } from './dto/office-audit-list-query.dto';
import { OfficeEntryCreateDto } from './dto/office-entry-create.dto';
import { OfficeEntryListQueryDto } from './dto/office-entry-list-query.dto';
import { OfficeEntryUpdateDto } from './dto/office-entry-update.dto';
import { OfficeService } from './office.service';

@Controller('/api/v1/office')
@UseGuards(JwtAuthGuard)
export class OfficeController {
  constructor(private readonly service: OfficeService) {}

  @Get('categories')
  async listCategories(@CurrentUserDecorator() user: CurrentUser) {
    return { data: await this.service.listCategories(user) };
  }

  @Get('entries')
  async listEntries(@Query() query: OfficeEntryListQueryDto, @CurrentUserDecorator() user: CurrentUser) {
    return { data: await this.service.listEntries(query, user) };
  }

  @Get('entries/:id')
  async getEntry(@Param('id') id: string, @CurrentUserDecorator() user: CurrentUser) {
    return { data: await this.service.getEntry(id, user) };
  }

  @Post('entries/:id/open')
  async openEntry(@Param('id') id: string, @CurrentUserDecorator() user: CurrentUser) {
    return { data: await this.service.openEntry(id, user) };
  }

  @Get('admin/entries')
  async listAdminEntries(@Query() query: OfficeAdminEntryListQueryDto, @CurrentUserDecorator() user: CurrentUser) {
    return { data: await this.service.listAdminEntries(query, user) };
  }

  @Get('admin/audits')
  async listAdminAudits(@Query() query: OfficeAuditListQueryDto, @CurrentUserDecorator() user: CurrentUser) {
    return await this.service.listAudits(query, user);
  }

  @Post('admin/entries')
  async createEntry(@Body() dto: OfficeEntryCreateDto, @CurrentUserDecorator() user: CurrentUser) {
    return { data: await this.service.createEntry(dto, user) };
  }

  @Patch('admin/entries/:id')
  async updateEntry(@Param('id') id: string, @Body() dto: OfficeEntryUpdateDto, @CurrentUserDecorator() user: CurrentUser) {
    return { data: await this.service.updateEntry(id, dto, user) };
  }

  @Post('admin/entries/:id/publish')
  async publishEntry(@Param('id') id: string, @CurrentUserDecorator() user: CurrentUser) {
    return { data: await this.service.publishEntry(id, user) };
  }

  @Post('admin/entries/:id/disable')
  async disableEntry(@Param('id') id: string, @CurrentUserDecorator() user: CurrentUser) {
    return { data: await this.service.disableEntry(id, user) };
  }
}
