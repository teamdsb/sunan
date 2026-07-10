import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUserDecorator } from 'src/common/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/interfaces/current-user.interface';
import { WorkbenchAttendanceExportQueryDto } from './dto/workbench-attendance-export-query.dto';
import { WorkbenchAttendanceReconcileDto } from './dto/workbench-attendance-reconcile.dto';
import { WorkbenchRecordActionDto } from './dto/workbench-record-action.dto';
import { WorkbenchRecordCreateDto } from './dto/workbench-record-create.dto';
import { WorkbenchRecordListQueryDto } from './dto/workbench-record-list-query.dto';
import { WorkbenchRecordPrintQueryDto } from './dto/workbench-record-print-query.dto';
import { WorkbenchRecordUploadAttachmentDto } from './dto/workbench-record-upload-attachment.dto';
import { WorkbenchRecordParticipantDto } from './dto/workbench-record-participant.dto';
import { WorkbenchService } from './workbench.service';

@Controller('/api/v1/workbench')
@UseGuards(JwtAuthGuard)
export class WorkbenchController {
  constructor(private readonly service: WorkbenchService) {}

  @Get('modules')
  async listModules(@CurrentUserDecorator() user: CurrentUser) {
    return { data: await this.service.listModules(user) };
  }

  @Get('modules/:moduleCode/schema')
  async getModuleSchema(@Param('moduleCode') moduleCode: string, @CurrentUserDecorator() user: CurrentUser) {
    return { data: await this.service.getModuleSchema(moduleCode, user) };
  }

  @Get('dashboard')
  async getDashboard(@CurrentUserDecorator() user: CurrentUser) {
    return { data: await this.service.getDashboard(user) };
  }

  @Get('statistics/attendance')
  async getAttendanceStatistics(@Query('month') month: string | undefined, @CurrentUserDecorator() user: CurrentUser) {
    return { data: await this.service.getAttendanceStatistics(user, month) };
  }

  @Get('statistics/attendance/export')
  @HttpCode(202)
  async exportAttendanceStatistics(@Query() query: WorkbenchAttendanceExportQueryDto, @CurrentUserDecorator() user: CurrentUser) {
    return { data: await this.service.exportAttendanceStatistics(query, user) };
  }

  @Get('export-jobs/:jobId')
  async getExportJob(@Param('jobId') jobId: string, @CurrentUserDecorator() user: CurrentUser) {
    return { data: await this.service.getExportJob(jobId, user) };
  }

  @Post('export-jobs/:jobId/retry')
  @HttpCode(202)
  async retryExportJob(@Param('jobId') jobId: string, @CurrentUserDecorator() user: CurrentUser) {
    return { data: await this.service.retryExportJob(jobId, user) };
  }

  @Get('export-jobs/:jobId/download-url')
  async getExportDownloadUrl(@Param('jobId') jobId: string, @CurrentUserDecorator() user: CurrentUser) {
    return { data: await this.service.getExportDownloadUrl(jobId, user) };
  }

  @Post('statistics/attendance/reconcile')
  @HttpCode(202)
  async reconcileAttendance(@Body() dto: WorkbenchAttendanceReconcileDto, @CurrentUserDecorator() user: CurrentUser) {
    return { data: await this.service.reconcileAttendanceStatistics(dto, user) };
  }

  @Get('records')
  async listRecords(@Query() query: WorkbenchRecordListQueryDto, @CurrentUserDecorator() user: CurrentUser) {
    return this.service.listRecords(query, user);
  }

  @Post('records')
  async createRecord(@Body() dto: WorkbenchRecordCreateDto, @CurrentUserDecorator() user: CurrentUser) {
    return { data: await this.service.createRecord(dto, user) };
  }

  @Get('records/:recordId')
  async getRecordDetail(@Param('recordId') recordId: string, @CurrentUserDecorator() user: CurrentUser) {
    return { data: await this.service.getRecordDetail(recordId, user) };
  }

  @Post('records/:recordId/actions')
  async performAction(@Param('recordId') recordId: string, @Body() dto: WorkbenchRecordActionDto, @CurrentUserDecorator() user: CurrentUser) {
    return { data: await this.service.performRecordAction(recordId, dto, user) };
  }

  @Post('records/:recordId/participants')
  async assignParticipant(@Param('recordId') recordId: string, @Body() dto: WorkbenchRecordParticipantDto, @CurrentUserDecorator() user: CurrentUser) {
    return { data: await this.service.assignParticipant(recordId, dto, user) };
  }

  @Post('records/:recordId/attachments')
  async uploadAttachment(
    @Param('recordId') recordId: string,
    @Body() dto: WorkbenchRecordUploadAttachmentDto,
    @CurrentUserDecorator() user: CurrentUser,
  ) {
    return { data: await this.service.uploadAttachment(recordId, dto, user) };
  }

  @Get('records/:recordId/print')
  async getPrintSnapshot(
    @Param('recordId') recordId: string,
    @Query() query: WorkbenchRecordPrintQueryDto,
    @CurrentUserDecorator() user: CurrentUser,
  ) {
    return { data: await this.service.getPrintSnapshot(recordId, user, query.paperSize ?? 'A4') };
  }

  @Post('records/:recordId/signature-evidence')
  async createSignatureEvidence(@Param('recordId') recordId: string, @Body() body: { signatureFileId: string; businessSummaryHash: string }, @CurrentUserDecorator() user: CurrentUser) {
    return { data: await this.service.createSignatureEvidence(recordId, body.signatureFileId, body.businessSummaryHash, user) };
  }

  @Post('records/:recordId/location-evidence')
  async createLocationEvidence(@Param('recordId') recordId: string, @Body() body: { captureStatus: string; latitude?: number; longitude?: number; accuracyMeters?: number; failureReason?: string; addressText?: string }, @CurrentUserDecorator() user: CurrentUser) {
    return { data: await this.service.createLocationEvidence(recordId, body, user) };
  }
}
