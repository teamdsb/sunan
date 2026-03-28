import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';

import { CurrentUserDecorator } from 'src/common/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import type { CurrentUser } from 'src/common/interfaces/current-user.interface';

import { CertificateReminderJobService } from './certificate-reminder-job.service';
import { ReminderService } from './reminder.service';
import { ReminderAcknowledgeDto } from './dto/reminder-acknowledge.dto';
import { ReminderListQueryDto } from './dto/reminder-list-query.dto';

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
  async scan() {
    return { data: await this.jobService.enqueueScan({ source: 'manual' }) };
  }
}
