import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUserDecorator } from 'src/common/decorators/current-user.decorator';
import { Param } from '@nestjs/common';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { CurrentUser } from 'src/common/interfaces/current-user.interface';
import { NotificationConnectionTestDto, NotificationConfigUpdateDto, NotificationDeliveryReconcileDto, NotificationDraftTestDto } from './dto/notification-config.dto';
import { SettingsUpdateDto } from './dto/settings-update.dto';
import { SettingsService } from './settings.service';

@Controller('/api/v1/settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  @Get()
  async getCurrentUserSettings(@CurrentUserDecorator() user: CurrentUser) {
    return { data: await this.service.getByUser(user.userId) };
  }

  @Patch()
  async updateCurrentUserSettings(
    @Body() dto: SettingsUpdateDto,
    @CurrentUserDecorator() user: CurrentUser,
  ) {
    return { data: await this.service.update(user.userId, dto) };
  }

  @Get('notification')
  @Roles('system_admin')
  async getNotificationConfig() {
    return { data: await this.service.getNotificationConfig() };
  }

  @Patch('notification')
  @Roles('system_admin')
  async updateNotificationConfig(
    @Body() dto: NotificationConfigUpdateDto,
    @CurrentUserDecorator() user: CurrentUser,
  ) {
    return { data: await this.service.updateNotificationConfig(user.userId, dto) };
  }

  @Post('notification/encryption-key/rotate')
  @Roles('system_admin')
  async rotateNotificationEncryptionKey(@CurrentUserDecorator() user: CurrentUser) {
    return { data: await this.service.rotateNotificationEncryptionKey(user.userId) };
  }

  @Post('notification/connection-test')
  @Roles('system_admin')
  async testNotificationConnection(@Body() dto: NotificationConnectionTestDto) {
    return { data: await this.service.testNotificationConnection(dto) };
  }

  @Post('notification/draft-test')
  @Roles('system_admin')
  async sendDraftTest(@Body() dto: NotificationDraftTestDto) {
    return { data: await this.service.sendDraftTest(dto) };
  }

  @Get('notification/deliveries')
  @Roles('system_admin')
  async listNotificationDeliveries() {
    return { data: await this.service.listNotificationDeliveries() };
  }

  @Post('notification/deliveries/:id/reconcile')
  @Roles('system_admin')
  async reconcileNotificationDelivery(
    @Param('id') id: string,
    @Body() dto: NotificationDeliveryReconcileDto,
    @CurrentUserDecorator() user: CurrentUser,
  ) {
    return { data: await this.service.reconcileNotificationDelivery(id, user.userId, dto) };
  }

  @Post('notification/deliveries/:id/retry')
  @Roles('system_admin')
  async retryNotificationDelivery(@Param('id') id: string, @CurrentUserDecorator() user: CurrentUser) {
    return { data: await this.service.retryNotificationDelivery(id, user.userId) };
  }
}

