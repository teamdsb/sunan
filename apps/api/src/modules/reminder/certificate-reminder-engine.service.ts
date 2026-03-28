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

import { isManagementPosition, resolveRolesFromDepartmentNames } from './reminder.constants';
import { ReminderClockService } from './reminder-clock.service';
import type { ReminderJobEnvelope, ReminderOwnerType, ReminderType } from './reminder.types';

interface ReminderRecipient {
  userId: string;
  roles: string[];
  departmentCodes: string[];
  departmentNames: string[];
  isSystemAdmin: boolean;
}

interface ViewerContext {
  viewer: WecomUserEntity | null;
  roles: Set<string>;
}

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

  async runScan(envelope: ReminderJobEnvelope): Promise<{
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
    const existingReminderKeys = new Set(
      reminders.map((reminder) =>
        this.makeReminderKey(reminder.certificateId, reminder.recipientUserId, reminder.scheduledDate, reminder.reminderType),
      ),
    );
    const acknowledgedReminderKeys = new Set(
      reminders
        .filter((reminder) => reminder.status === 'acknowledged')
        .map((reminder) => this.makeReminderCycleKey(reminder.certificateId, reminder.recipientUserId, reminder.reminderType)),
    );

    let createdCount = 0;
    let sentCount = 0;
    let failedCount = 0;

    for (const certificate of certificates) {
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
        const reminderKey = this.makeReminderKey(certificate.id, recipientUserId, scheduledDate, reminderType);
        const reminderCycleKey = this.makeReminderCycleKey(certificate.id, recipientUserId, reminderType);
        if (acknowledgedReminderKeys.has(reminderCycleKey)) {
          continue;
        }

        if (existingReminderKeys.has(reminderKey)) {
          continue;
        }

        const reminder = this.reminderRepository.create({
          id: randomUUID(),
          certificateId: certificate.id,
          certificateTypeId: certificate.certificateTypeId,
          certificateTypeName: type?.name ?? type?.code ?? certificate.certificateTypeId,
          certificateTitle: certificate.title,
          ownerType: certificate.ownerType,
          ownerId: certificate.ownerId,
          ownerName: this.resolveOwnerName(certificate.ownerType, certificate.ownerId, vesselById, vehicleById, personnelById),
          recipientUserId,
          reminderType,
          status: 'pending',
          scheduledDate,
          daysBeforeExpiry: daysUntilExpiry,
          sentAt: null,
          acknowledgedAt: null,
          acknowledgedBy: null,
          failureReason: null,
        });

        const message = this.buildMessage(reminder, certificate.expiryDate, reminderType, daysUntilExpiry);
        try {
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
          reminder.status = 'failed';
          reminder.failureReason = this.describeError(error);
          failedCount += 1;
          this.logger.warn(`reminder send failed for ${recipientUserId}: ${reminder.failureReason}`);
        }

        await this.reminderRepository.save(reminder);
        createdCount += 1;
        existingReminderKeys.add(reminderKey);
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
      const roles = resolveRolesFromDepartmentNames(user.departmentNames, user.isSystemAdmin);
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

  private makeReminderCycleKey(certificateId: string, recipientUserId: string, reminderType: string): string {
    return [certificateId, recipientUserId, reminderType].join(':');
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
