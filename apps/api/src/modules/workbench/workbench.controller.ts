import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUserDecorator } from 'src/common/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/interfaces/current-user.interface';
import { WorkbenchRecordActionDto } from './dto/workbench-record-action.dto';
import { WorkbenchRecordListQueryDto } from './dto/workbench-record-list-query.dto';
import { WorkbenchRecordUploadAttachmentDto } from './dto/workbench-record-upload-attachment.dto';
import { WorkbenchService } from './workbench.service';

@Controller('/api/v1/workbench')
@UseGuards(JwtAuthGuard)
export class WorkbenchController {
  constructor(private readonly service: WorkbenchService) {}

  @Get('modules')
  async listModules(@CurrentUserDecorator() user: CurrentUser) {
    return { data: this.service.listModules(user) };
  }

  @Get('dashboard')
  async getDashboard(@CurrentUserDecorator() user: CurrentUser) {
    return { data: this.service.getDashboard(user) };
  }

  @Get('records')
  async listRecords(@Query() query: WorkbenchRecordListQueryDto, @CurrentUserDecorator() user: CurrentUser) {
    return this.service.listRecords(query, user);
  }

  @Get('records/:recordId')
  async getRecordDetail(@Param('recordId') recordId: string, @CurrentUserDecorator() user: CurrentUser) {
    return { data: this.service.getRecordDetail(recordId, user) };
  }

  @Post('records/:recordId/actions')
  async performAction(@Param('recordId') recordId: string, @Body() dto: WorkbenchRecordActionDto, @CurrentUserDecorator() user: CurrentUser) {
    return { data: this.service.performRecordAction(recordId, dto, user) };
  }

  @Post('records/:recordId/attachments')
  async uploadAttachment(
    @Param('recordId') recordId: string,
    @Body() dto: WorkbenchRecordUploadAttachmentDto,
    @CurrentUserDecorator() user: CurrentUser,
  ) {
    return { data: this.service.uploadAttachment(recordId, dto, user) };
  }

  @Get('records/:recordId/print')
  async getPrintSnapshot(@Param('recordId') recordId: string, @CurrentUserDecorator() user: CurrentUser) {
    return { data: this.service.getPrintSnapshot(recordId, user) };
  }
}
