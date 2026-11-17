import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Not, Repository } from 'typeorm';
import { appEnv } from 'src/config/env';
import { WecomUserEntity } from 'src/database/entities/wecom-user.entity';
import { WecomMessageDeliveryEntity } from 'src/database/entities/wecom-message-delivery.entity';
import { CertificateReminderEntity } from 'src/database/entities/certificate-reminder.entity';
import { SafetyTaskNotificationDeliveryEntity } from 'src/database/entities/safety-plan-task.entity';
import { AuthorizationService } from 'src/modules/auth/authorization.service';
import { ProcurementService } from 'src/modules/procurement/procurement.service';
import { PlanTaskService } from 'src/modules/plan-task/plan-task.service';
import { CertificateReminderEngineService } from 'src/modules/reminder/certificate-reminder-engine.service';
import { WecomHttpGateway } from 'src/modules/wecom/wecom-http.gateway';
import { WecomMessageService } from 'src/modules/wecom/wecom-message.service';
import { WecomNotificationConfigService } from 'src/modules/wecom/wecom-notification-config.service';
import { UserSettingsEntity } from 'src/database/entities/user-settings.entity';
import { SettingsUpdateDto } from './dto/settings-update.dto';
import { NotificationConnectionTestDto, NotificationConfigUpdateDto, NotificationDeliveryReconcileDto, NotificationDraftTestDto } from './dto/notification-config.dto';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(UserSettingsEntity)
    private readonly repository: Repository<UserSettingsEntity>,
    @InjectRepository(WecomUserEntity)
    private readonly wecomUserRepository: Repository<WecomUserEntity>,
    @InjectRepository(WecomMessageDeliveryEntity)
    private readonly messageDeliveryRepository: Repository<WecomMessageDeliveryEntity>,
    private readonly dataSource: DataSource,
    private readonly notificationConfig: WecomNotificationConfigService,
    private readonly wecomGateway: WecomHttpGateway,
    private readonly messageService: WecomMessageService,
    private readonly authorizationService: AuthorizationService,
    private readonly procurementService: ProcurementService,
    private readonly planTaskService: PlanTaskService,
    private readonly reminderEngine: CertificateReminderEngineService,
  ) {}

  async getByUser(userId: string) {
    let settings = await this.repository.findOne({ where: { userId } });
    if (!settings) {
      settings = await this.repository.save(
        this.repository.create({
          userId,
          defaultModule: 'my',
          reminderViewMode: 'dashboard',
          certificateGroupBy: 'type',
          enablePushNotifications: true,
          theme: 'light',
        }),
      );
    }
    return this.toDto(settings);
  }

  async update(userId: string, dto: SettingsUpdateDto) {
    const settings = await this.getByUserEntity(userId);
    Object.assign(settings, {
      reminderViewMode: dto.reminderViewMode ?? settings.reminderViewMode,
      certificateGroupBy: 'type',
      enablePushNotifications: dto.enablePushNotifications ?? settings.enablePushNotifications,
    });

    return this.toDto(await this.repository.save(settings));
  }

  getNotificationConfig() {
    return this.notificationConfig.getView();
  }

  updateNotificationConfig(userId: string, dto: NotificationConfigUpdateDto) {
    return this.notificationConfig.save({ ...dto, actorUserId: userId });
  }

  rotateNotificationEncryptionKey(userId: string) {
    return this.notificationConfig.rotateEncryptionKey(userId);
  }

  async testNotificationConnection(dto: NotificationConnectionTestDto) {
    const config = await this.notificationConfig.resolveDraft(dto);
    await this.wecomGateway.getAccessToken(config.corpId, config.secret);
    return { success: true, agentId: config.agentId, source: config.source, configVersion: config.version };
  }

  async sendDraftTest(dto: NotificationDraftTestDto) {
    const user = await this.wecomUserRepository.findOne({ where: { userId: dto.testUserId.trim() } });
    if (!user) throw new NotFoundException('测试人员不存在');
    await this.authorizationService.getEffectiveAuthorization(user);
    const config = await this.notificationConfig.resolveDraft(dto);
    const result = await this.messageService.sendTextCard({
      userIds: [user.userId],
      title: dto.title?.trim() || '苏南船舶推送测试',
      description: dto.description?.trim() || '<div class="normal">这是一条定向测试消息</div>',
      url: dto.url?.trim() || `${appEnv.WEB_PUBLIC_URL.replace(/\/$/, '')}/my/settings`,
      sourceType: 'settings_test',
      sourceId: user.userId,
      dedupeKey: `settings-test:${user.userId}:${Date.now()}:${Math.random().toString(36).slice(2)}`,
      config,
    });
    return { ...result, testUserId: user.userId };
  }

  async listNotificationDeliveries() {
    const staleSendingBefore = new Date(Date.now() - 15 * 60_000);
    const rows = await this.messageDeliveryRepository.createQueryBuilder('delivery')
      .where('delivery.status IN (:...statuses)', { statuses: ['uncertain', 'failed'] })
      .orWhere('(delivery.status = :sending AND delivery.updatedAt < :staleSendingBefore)', { sending: 'sending', staleSendingBefore })
      .orderBy('delivery.updatedAt', 'DESC')
      .take(100)
      .getMany();
    return rows.map((row) => ({
      id: row.id,
      sourceType: row.sourceType,
      sourceId: row.sourceId,
      recipientUserId: row.recipientUserId,
      agentId: row.agentId,
      configSource: row.configSource,
      configVersion: row.configVersion,
      status: row.status,
      attemptCount: row.attemptCount,
      wecomErrcode: row.wecomErrcode,
      failureReason: row.failureReason,
      attemptHistory: row.attemptHistory,
      reconciledBy: row.reconciledBy,
      reconciledAt: row.reconciledAt?.toISOString() ?? null,
      updatedAt: row.updatedAt.toISOString(),
    }));
  }

  async reconcileNotificationDelivery(id: string, userId: string, dto: NotificationDeliveryReconcileDto) {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(WecomMessageDeliveryEntity);
      const delivery = await repository.findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!delivery) throw new NotFoundException('投递记录不存在');
      const staleSending = delivery.status === 'sending' && delivery.updatedAt.getTime() < Date.now() - 15 * 60_000;
      if (delivery.status !== 'uncertain' && !staleSending) throw new ConflictException('只有结果不确定或已超时的投递可以人工核对');
      const status = dto.delivered ? 'sent' : 'failed';
      delivery.status = status;
      delivery.failureReason = dto.delivered ? null : '人工核对确认未送达';
      delivery.sentAt = dto.delivered ? new Date() : null;
      delivery.reconciledBy = userId;
      delivery.reconciledAt = new Date();
      delivery.attemptHistory = [...(delivery.attemptHistory ?? []), {
        attempt: delivery.attemptCount,
        reconciledAt: delivery.reconciledAt.toISOString(),
        reconciledBy: userId,
        status,
      }];
      await repository.save(delivery);

      if (delivery.sourceType === 'certificate_reminder') {
        await manager.getRepository(CertificateReminderEntity).update(
          { id: delivery.sourceId, status: Not(In(['acknowledged', 'resolved'])) },
          { status: status === 'sent' ? 'sent' : 'failed', sentAt: delivery.sentAt, failureReason: delivery.failureReason },
        );
      } else if (delivery.sourceType === 'plan_task') {
        await manager.getRepository(SafetyTaskNotificationDeliveryEntity).update(
          { id: delivery.sourceId },
          { status, sentAt: delivery.sentAt, failureReason: delivery.failureReason, nextRetryAt: status === 'failed' ? new Date() : null },
        );
      }
      return { id: delivery.id, status: delivery.status, reconciledBy: delivery.reconciledBy, reconciledAt: delivery.reconciledAt?.toISOString() };
    });
  }

  async retryNotificationDelivery(id: string, actorUserId: string) {
    const delivery = await this.messageDeliveryRepository.findOne({ where: { id } });
    if (!delivery) throw new NotFoundException('投递记录不存在');
    if (delivery.status !== 'failed') throw new ConflictException('只有确认失败的投递可以重试');
    const user = await this.wecomUserRepository.findOne({ where: { userId: delivery.recipientUserId } });
    if (!user) throw new ConflictException('收件人已不在通讯录中，不能重试');
    await this.authorizationService.getEffectiveAuthorization(user);
    const eligible = delivery.sourceType === 'procurement'
      ? await this.procurementService.canReceiveNotification(delivery.dedupeKey, delivery.recipientUserId)
      : delivery.sourceType === 'plan_task'
        ? await this.planTaskService.canReceiveNotification(delivery.sourceId, delivery.recipientUserId)
        : delivery.sourceType === 'certificate_reminder'
          ? await this.reminderEngine.canReceiveNotification(delivery.sourceId, delivery.recipientUserId)
          : false;
    if (!eligible) throw new ConflictException('业务状态或收件人资格已变化，不能重发旧消息');
    const payload = delivery.payloadSnapshot as { title?: string; description?: string; url?: string };
    const result = await this.messageService.sendTextCard({
      userIds: [delivery.recipientUserId],
      title: payload.title ?? '系统通知',
      description: payload.description ?? '',
      url: payload.url ?? `${appEnv.WEB_PUBLIC_URL.replace(/\/$/, '')}/my`,
      sourceType: delivery.sourceType,
      sourceId: delivery.sourceId,
      dedupeKey: delivery.dedupeKey.slice(0, -(`:${delivery.recipientUserId}`.length)),
    });
    if (result.inFlight) return { ...result, retriedBy: actorUserId };
    const succeeded = result.success && !result.uncertain && !result.invalidUser.includes(delivery.recipientUserId);
    const failureReason = result.invalidUser.includes(delivery.recipientUserId) ? 'invalid user' : result.failureReason ?? null;
    if (delivery.sourceType === 'certificate_reminder') {
      await this.dataSource.getRepository(CertificateReminderEntity).update(
        { id: delivery.sourceId, status: Not(In(['acknowledged', 'resolved'])) },
        { status: result.uncertain ? 'uncertain' : succeeded ? 'sent' : 'failed', sentAt: succeeded ? new Date() : null, failureReason },
      );
    } else if (delivery.sourceType === 'plan_task') {
      await this.dataSource.getRepository(SafetyTaskNotificationDeliveryEntity).update(
        { id: delivery.sourceId },
        { status: result.uncertain ? 'uncertain' : succeeded ? 'sent' : 'failed', sentAt: succeeded ? new Date() : null, failureReason, nextRetryAt: result.uncertain || succeeded ? null : new Date() },
      );
    }
    return { ...result, retriedBy: actorUserId };
  }

  private async getByUserEntity(userId: string) {
    const settings = await this.repository.findOne({ where: { userId } });
    if (settings) return settings;

    return this.repository.save(
      this.repository.create({
        userId,
        defaultModule: 'my',
        reminderViewMode: 'dashboard',
        certificateGroupBy: 'type',
        enablePushNotifications: true,
        theme: 'light',
      }),
    );
  }

  private toDto(entity: UserSettingsEntity) {
    return {
      id: entity.id,
      userId: entity.userId,
      defaultModule: entity.defaultModule,
      reminderViewMode: entity.reminderViewMode,
      certificateGroupBy: entity.certificateGroupBy,
      enablePushNotifications: entity.enablePushNotifications,
      theme: entity.theme,
      updatedAt: entity.updatedAt.toISOString(),
    };
  }
}
