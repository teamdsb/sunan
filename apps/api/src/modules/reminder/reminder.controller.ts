import { Body, Controller, ForbiddenException, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';

import { CurrentUserDecorator } from 'src/common/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import type { CurrentUser } from 'src/common/interfaces/current-user.interface';

import { CertificateReminderJobService } from './certificate-reminder-job.service';
import { ReminderService } from './reminder.service';
import { ReminderAcknowledgeDto } from './dto/reminder-acknowledge.dto';
import { ReminderListQueryDto } from './dto/reminder-list-query.dto';
import { MANAGEMENT_ROLES } from './reminder.constants';

@Controller('/api/v1/certificate-reminders')
@UseGuards(JwtAuthGuard)
export class ReminderController {
  constructor(
    private readonly reminderService: ReminderService,
    private readonly jobService: CertificateReminderJobService,
  ) {}

  @Get('dashboard')
  async dashboard(@CurrentUserDecorator() user: CurrentUser) {
    return { data: await this.reminderService.dashboard(user) };
  }

  @Get()
  async list(@Query() query: ReminderListQueryDto, @CurrentUserDecorator() user: CurrentUser) {
    return this.reminderService.list(query, user);
  }

  @Get(':id')
  async detail(@Param('id', new ParseUUIDPipe()) id: string, @CurrentUserDecorator() user: CurrentUser) {
    return { data: await this.reminderService.detail(id, user) };
  }

  @Post(':id/acknowledge')
  @HttpCode(200)
  async acknowledge(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ReminderAcknowledgeDto,
    @CurrentUserDecorator() user: CurrentUser,
  ) {
    return { data: await this.reminderService.acknowledge(id, dto, user) };
  }

  @Post('actions/scan')
  @HttpCode(202)
  async scan(@CurrentUserDecorator() user: CurrentUser) {
    if (!user.isAdmin && !user.roles.some((role) => role === 'system_admin' || MANAGEMENT_ROLES.has(role))) {
      throw new ForbiddenException('forbidden');
    }

    return { data: await this.jobService.enqueueScan({ source: 'manual' }) };
  }

  @Get('actions/scan/:jobId')
  async scanStatus(@Param('jobId') jobId: string) {
    const data = await this.jobService.getJobStatus(jobId);
    return { data };
  }
}
