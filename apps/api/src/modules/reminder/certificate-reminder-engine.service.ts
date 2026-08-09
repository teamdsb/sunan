import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { IsNull, Repository } from 'typeorm';
import Redis from 'ioredis';

import { appEnv } from 'src/config/env';
import { CertificateReminderEntity } from 'src/database/entities/certificate-reminder.entity';
import { CertificateTypeEntity } from 'src/database/entities/certificate-type.entity';
import { CertificateEntity } from 'src/database/entities/certificate.entity';
import { PersonnelEntity } from 'src/database/entities/personnel.entity';
import { VesselEntity } from 'src/database/entities/vessel.entity';
import { VehicleEntity } from 'src/database/entities/vehicle.entity';
import { WecomUserEntity } from 'src/database/entities/wecom-user.entity';
import { REDIS_CLIENT } from 'src/modules/wecom/wecom.constants';
import { WecomMessageService } from 'src/modules/wecom/wecom-message.service';

import { isManagementPosition, resolveRolesFromDepartments } from './reminder.constants';
import { ReminderClockService } from './reminder-clock.service';
import type { ReminderJobEnvelope, ReminderOwnerType, ReminderType } from './reminder.types';

const SEND_LOCK_TTL_MS = 15 * 60 * 1000;
const DISPATCHING_STALE_AFTER_MS = SEND_LOCK_TTL_MS;

@Injectable()
export class CertificateReminderEngineService {
  private readonly logger = new Logger(CertificateReminderEngineService.name);

  constructor(
    @InjectRepository(CertificateReminderEntity)
    private readonly reminderRepository: Repository<CertificateReminderEntity>,
    @InjectRepository(CertificateEntity)
    private readonly certificateRepository: Repository<CertificateEntity>,
    @InjectRepository(CertificateTypeEntity)
    private readonly certificateTypeRepository: Repository<CertificateTypeEntity>,
    @InjectRepository(VesselEntity)
    private readonly vesselRepository: Repository<VesselEntity>,
    @InjectRepository(VehicleEntity)
    private readonly vehicleRepository: Repository<VehicleEntity>,
    @InjectRepository(PersonnelEntity)
    private readonly personnelRepository: Repository<PersonnelEntity>,
    @InjectRepository(WecomUserEntity)
    private readonly wecomUserRepository: Repository<WecomUserEntity>,
    private readonly wecomMessageService: WecomMessageService,
    private readonly clock: ReminderClockService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async runScan(
    envelope: ReminderJobEnvelope,
    options: { isLeaseValid?: () => boolean } = {},
  ): Promise<{
    createdCount: number;
    sentCount: number;
    failedCount: number;
  }> {
    const now = this.clock.now();
    const scheduledDate = this.clock.today();
    const [certificates, certificateTypes, reminders, vessels, vehicles, personnel, users] = await Promise.all([
      this.certificateRepository.find({ where: { deletedAt: IsNull() } }),
      this.certificateTypeRepository.find(),
      this.reminderRepository.find(),
      this.vesselRepository.find({ where: { deletedAt: IsNull() } }),
      this.vehicleRepository.find({ where: { deletedAt: IsNull() } }),
      this.personnelRepository.find({ where: { deletedAt: IsNull() } }),
      this.wecomUserRepository.find(),
    ]);

    const typeById = new Map(certificateTypes.map((type) => [type.id, type]));
    const vesselById = new Map(vessels.map((row) => [row.id, row]));
    const vehicleById = new Map(vehicles.map((row) => [row.id, row]));
    const personnelById = new Map(personnel.map((row) => [row.id, row]));
    const reminderByKey = new Map(
      reminders.map((reminder) => [
        this.makeReminderKey(reminder.certificateId, reminder.recipientUserId, reminder.scheduledDate, reminder.reminderType),
        reminder,
      ]),
    );
    const acknowledgedReminderKeys = new Set(
      reminders
        .filter((reminder) => reminder.status === 'acknowledged')
        .map((reminder) =>
          this.makeReminderCycleKey(
            reminder.certificateId,
            reminder.recipientUserId,
            reminder.certificateExpiryDate,
          ),
        ),
    );

    let createdCount = 0;
    let sentCount = 0;
    let failedCount = 0;

    const assertLeaseValid = (): void => {
      if (options.isLeaseValid && !options.isLeaseValid()) {
        throw new Error('scan lock lost');
      }
    };

    for (const certificate of certificates) {
      assertLeaseValid();
      if (certificate.deletedAt || certificate.status === 'archived') {
        continue;
      }

      const type = typeById.get(certificate.certificateTypeId);
      const advanceDays = certificate.advanceDays ?? type?.defaultAdvanceDays ?? 30;
      const daysUntilExpiry = this.diffDays(certificate.expiryDate, scheduledDate);
      const reminderType = this.resolveReminderType(daysUntilExpiry, advanceDays);

      if (!reminderType) {
        continue;
      }

      const recipients = this.resolveRecipients({
        certificate,
        type,
        users,
        personnelById,
        vesselById,
        vehicleById,
      });

      if (!recipients.length) {
        continue;
      }

      if (reminderType === 'overdue' && certificate.status === 'active') {
        certificate.status = 'expired';
      }
      certificate.latestScanAt = now;
      await this.certificateRepository.save(certificate);

      for (const recipientUserId of recipients) {
        assertLeaseValid();
        const reminderKey = this.makeReminderKey(certificate.id, recipientUserId, scheduledDate, reminderType);
        const reminderCycleKey = this.makeReminderCycleKey(
          certificate.id,
          recipientUserId,
          certificate.expiryDate,
        );
        if (acknowledgedReminderKeys.has(reminderCycleKey)) {
          continue;
        }

        const existingReminder = reminderByKey.get(reminderKey);
        if (existingReminder) {
          if (existingReminder.status === 'sent' || existingReminder.status === 'acknowledged') {
            continue;
          }

          if (
            existingReminder.status === 'dispatching' &&
            this.isFreshDispatchingReminder(existingReminder, now)
          ) {
            continue;
          }

          if (existingReminder.status === 'failed' && !this.isRecoverableFailure(existingReminder.failureReason)) {
            continue;
          }
        }

        const reminder = existingReminder ?? this.reminderRepository.create({
          id: randomUUID(),
          certificateId: certificate.id,
          certificateTypeId: certificate.certificateTypeId,
          certificateTypeName: type?.name ?? type?.code ?? certificate.certificateTypeId,
          certificateTitle: certificate.title,
          certificateExpiryDate: certificate.expiryDate,
          ownerType: certificate.ownerType,
          ownerId: certificate.ownerId,
          ownerName: this.resolveOwnerName(certificate.ownerType, certificate.ownerId, vesselById, vehicleById, personnelById),
          recipientUserId,
          reminderType,
          status: 'dispatching',
          scheduledDate,
          daysBeforeExpiry: daysUntilExpiry,
          sentAt: null,
          acknowledgedAt: null,
          acknowledgedBy: null,
          failureReason: null,
        });

        const sendLockToken = await this.acquireSendLock(reminder);
        if (!sendLockToken) {
          reminderByKey.set(reminderKey, reminder);
          continue;
        }

        try {
          reminder.certificateTypeId = certificate.certificateTypeId;
          reminder.certificateTypeName = type?.name ?? type?.code ?? certificate.certificateTypeId;
          reminder.certificateTitle = certificate.title;
          reminder.certificateExpiryDate = certificate.expiryDate;
          reminder.ownerType = certificate.ownerType;
          reminder.ownerId = certificate.ownerId;
          reminder.ownerName = this.resolveOwnerName(certificate.ownerType, certificate.ownerId, vesselById, vehicleById, personnelById);
          reminder.reminderType = reminderType;
          reminder.scheduledDate = scheduledDate;
          reminder.daysBeforeExpiry = daysUntilExpiry;
          reminder.status = 'dispatching';
          reminder.sentAt = null;
          reminder.acknowledgedAt = null;
          reminder.acknowledgedBy = null;
          reminder.failureReason = null;

          if (!existingReminder) {
            const persistedReminder = { ...reminder };
            await this.reminderRepository.upsert(persistedReminder, [
              'certificateId',
              'recipientUserId',
              'scheduledDate',
              'reminderType',
            ]);
            createdCount += 1;
          } else {
            await this.reminderRepository.save(reminder);
          }

          const message = this.buildMessage(reminder, certificate.expiryDate, reminderType, daysUntilExpiry);
          assertLeaseValid();
          const result = await this.wecomMessageService.sendTextCard({
            userIds: [recipientUserId],
            title: message.title,
            description: message.description,
            url: message.url,
          });

          if (result.success === false) {
            reminder.status = 'failed';
            reminder.failureReason = result.failureReason ?? 'WeCom API error';
            failedCount += 1;
          } else if (result.invalidUser.includes(recipientUserId)) {
            reminder.status = 'failed';
            reminder.failureReason = 'invalid user';
            failedCount += 1;
          } else {
            reminder.status = 'sent';
            reminder.sentAt = now;
            sentCount += 1;
          }
        } catch (error) {
          if (this.isLeaseLostError(error)) {
            throw error;
          }

          reminder.status = 'failed';
          reminder.failureReason = this.describeError(error);
          failedCount += 1;
          this.logger.warn(`reminder send failed for ${recipientUserId}: ${reminder.failureReason}`);
        } finally {
          await this.releaseSendLock(reminder, sendLockToken);
        }

        await this.reminderRepository.save(reminder);
        reminderByKey.set(reminderKey, reminder);
      }
    }

    this.logger.log(
      `scan ${envelope.jobId} (${envelope.source}) created=${createdCount} sent=${sentCount} failed=${failedCount}`,
    );

    return { createdCount, sentCount, failedCount };
  }

  private resolveReminderType(daysUntilExpiry: number, advanceDays: number): ReminderType | null {
    if (daysUntilExpiry < 0) {
      return 'overdue';
    }

    if (daysUntilExpiry <= advanceDays) {
      return 'upcoming';
    }

    return null;
  }

  private resolveRecipients(params: {
    certificate: CertificateEntity;
    type: CertificateTypeEntity | undefined;
    users: WecomUserEntity[];
    personnelById: Map<string, PersonnelEntity>;
    vesselById: Map<string, VesselEntity>;
    vehicleById: Map<string, VehicleEntity>;
  }): string[] {
    const recipients = new Set<string>();
    const ownerType = params.certificate.ownerType;

    if (ownerType === 'vessel') {
      this.collectByRoles(recipients, params.users, ['shipping', 'general_office']);
      return [...recipients];
    }

    if (ownerType === 'vehicle') {
      this.collectByRoles(recipients, params.users, ['logistics', 'general_office']);
      return [...recipients];
    }

    if (ownerType === 'equipment') {
      this.collectByRoles(recipients, params.users, ['shipping', 'general_office']);
      return [...recipients];
    }

    const personnel = params.personnelById.get(params.certificate.ownerId);
    if (!personnel) {
      return [...recipients];
    }

    if (personnel.wecomUserId) {
      recipients.add(personnel.wecomUserId);
    }

    for (const user of params.users) {
      if (!user.departmentCodes.includes(personnel.departmentCode)) {
        continue;
      }

      if (isManagementPosition(user.position)) {
        recipients.add(user.userId);
      }
    }

    return [...recipients];
  }

  private collectByRoles(target: Set<string>, users: WecomUserEntity[], roleNames: string[]): void {
    for (const user of users) {
      const roles = resolveRolesFromDepartments(
        user.departmentIds ?? [],
        user.departmentNames,
      );
      if (roles.some((role) => roleNames.includes(role))) {
        target.add(user.userId);
      }
    }
  }

  private resolveOwnerName(
    ownerType: ReminderOwnerType,
    ownerId: string,
    vessels: Map<string, VesselEntity>,
    vehicles: Map<string, VehicleEntity>,
    personnel: Map<string, PersonnelEntity>,
  ): string {
    if (ownerType === 'vessel') {
      return vessels.get(ownerId)?.name ?? ownerId;
    }

    if (ownerType === 'vehicle') {
      return vehicles.get(ownerId)?.plateNumber ?? ownerId;
    }

    if (ownerType === 'equipment') {
      return ownerId;
    }

    return personnel.get(ownerId)?.name ?? ownerId;
  }

  private buildMessage(
    reminder: CertificateReminderEntity,
    expiryDate: string,
    reminderType: ReminderType,
    daysUntilExpiry: number,
  ): { title: string; description: string; url: string } {
    const title = '证书到期提醒';
    const description = [
      `证书：${reminder.certificateTitle}`,
      `对象：${reminder.ownerName}`,
      `到期日：${expiryDate}`,
      `提醒类型：${reminderType === 'overdue' ? '逾期' : '到期前'}`,
      `距离到期：${daysUntilExpiry}天`,
    ].join('\n');
    const url = `https://${appEnv.APP_DOMAIN}/my/reminders/${reminder.id}`;
    return { title, description, url };
  }

  private async acquireSendLock(reminder: CertificateReminderEntity): Promise<string | null> {
    const token = randomUUID();
    const key = this.buildSendLockKey(reminder);
    const result = await this.redis.set(key, token, 'PX', SEND_LOCK_TTL_MS, 'NX');
    if (result === null) {
      return null;
    }

    return token;
  }

  private async releaseSendLock(reminder: CertificateReminderEntity, token: string | null): Promise<void> {
    if (!token) {
      return;
    }

    if (typeof this.redis.eval !== 'function') {
      return;
    }

    const key = this.buildSendLockKey(reminder);
    await this.redis.eval(
      `
      if redis.call('GET', KEYS[1]) == ARGV[1] then
        return redis.call('DEL', KEYS[1])
      end
      return 0
      `,
      1,
      key,
      token,
    );
  }

  private buildSendLockKey(reminder: CertificateReminderEntity): string {
    return [
      'certificate-reminder:send',
      reminder.certificateId,
      reminder.recipientUserId,
      reminder.scheduledDate,
      reminder.reminderType,
    ].join(':');
  }

  private isLeaseLostError(error: unknown): boolean {
    return error instanceof Error && error.message === 'scan lock lost';
  }

  private isRecoverableFailure(failureReason: string | null | undefined): boolean {
    if (!failureReason) {
      return false;
    }

    return failureReason === 'scan lock lost' || failureReason.startsWith('retryable:');
  }

  private isFreshDispatchingReminder(reminder: CertificateReminderEntity, now: Date): boolean {
    const timestamp = reminder.updatedAt ?? reminder.createdAt;
    if (!timestamp) {
      return false;
    }

    return now.getTime() - timestamp.getTime() < DISPATCHING_STALE_AFTER_MS;
  }

  private diffDays(expiryDate: string, scheduledDate: string): number {
    const expiry = new Date(`${expiryDate}T00:00:00.000Z`);
    const current = new Date(`${scheduledDate}T00:00:00.000Z`);
    return Math.trunc((expiry.getTime() - current.getTime()) / 86_400_000);
  }

  private makeReminderKey(
    certificateId: string,
    recipientUserId: string,
    scheduledDate: string,
    reminderType: string,
  ): string {
    return [certificateId, recipientUserId, scheduledDate, reminderType].join(':');
  }

  private makeReminderCycleKey(
    certificateId: string,
    recipientUserId: string,
    certificateExpiryDate: string,
  ): string {
    return [certificateId, recipientUserId, certificateExpiryDate].join(':');
  }

  private describeError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'string') {
      return error;
    }

    return 'reminder send failed';
  }
}
