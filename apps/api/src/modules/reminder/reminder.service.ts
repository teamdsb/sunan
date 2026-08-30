import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import type { CurrentUser } from 'src/common/interfaces/current-user.interface';
import { CertificateReminderEntity } from 'src/database/entities/certificate-reminder.entity';
import { PersonnelEntity } from 'src/database/entities/personnel.entity';
import { WecomUserEntity } from 'src/database/entities/wecom-user.entity';

import { isManagementPosition, resolveRolesFromDepartments } from './reminder.constants';
import { ReminderClockService } from './reminder-clock.service';
import type { ReminderAcknowledgeDto } from './dto/reminder-acknowledge.dto';
import type { ReminderListQueryDto } from './dto/reminder-list-query.dto';

interface ViewerContext {
  viewer: WecomUserEntity | null;
  roles: Set<string>;
}

@Injectable()
export class ReminderService {
  constructor(
    @InjectRepository(CertificateReminderEntity)
    private readonly reminderRepository: Repository<CertificateReminderEntity>,
    @InjectRepository(PersonnelEntity)
    private readonly personnelRepository: Repository<PersonnelEntity>,
    @InjectRepository(WecomUserEntity)
    private readonly wecomUserRepository: Repository<WecomUserEntity>,
    private readonly clock: ReminderClockService,
  ) {}

  async dashboard(user: CurrentUser) {
    const reminders = await this.visibleReminders(user);
    return {
      totalPending: reminders.filter((item) => item.status === 'pending').length,
      totalOverdue: reminders.filter(
        (item) => item.reminderType === 'overdue' && item.status !== 'acknowledged',
      ).length,
      totalAcknowledged: reminders.filter((item) => item.status === 'acknowledged').length,
      byOwnerType: this.groupByOwnerType(reminders),
      byCertificateType: this.groupByCertificateType(reminders),
    };
  }

  async list(query: ReminderListQueryDto, user: CurrentUser) {
    const reminders = await this.visibleReminders(user);
    const filtered = this.filterReminders(reminders, query);
    const sorted = this.sortReminders(filtered);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const total = sorted.length;
    const data = sorted.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize).map((item) => this.toDto(item));

    return {
      data,
      meta: {
        total,
        page,
        pageSize,
        totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
      },
    };
  }

  async detail(id: string, user: CurrentUser) {
    const reminder = await this.findVisibleReminderOrThrow(id, user);
    return this.toDto(reminder);
  }

  async acknowledge(id: string, dto: ReminderAcknowledgeDto, user: CurrentUser) {
    const reminder = await this.findVisibleReminderOrThrow(id, user);
    if (reminder.status === 'acknowledged') {
      throw new ConflictException('already acknowledged');
    }

    if (!(await this.canAcknowledge(reminder, user))) {
      throw new ForbiddenException('forbidden');
    }

    reminder.status = 'acknowledged';
    reminder.acknowledgedAt = this.clock.now();
    reminder.acknowledgedBy = user.userId;
    await this.reminderRepository.save(reminder);

    void dto;
    return this.toDto(reminder);
  }

  private async visibleReminders(user: CurrentUser): Promise<CertificateReminderEntity[]> {
    const reminders = await this.reminderRepository.find({
      order: {
        scheduledDate: 'DESC',
        createdAt: 'DESC',
      },
    });
    const context = await this.resolveViewerContext(user);

    if (context.roles.has('system_admin')) {
      return reminders;
    }

    const visibleReminders: CertificateReminderEntity[] = [];
    for (const reminder of reminders) {
      if (await this.canViewReminder(reminder, user, context)) {
        visibleReminders.push(reminder);
      }
    }

    return visibleReminders;
  }

  private async findVisibleReminderOrThrow(id: string, user: CurrentUser): Promise<CertificateReminderEntity> {
    const reminder = await this.reminderRepository.findOne({
      where: { id },
    });

    if (!reminder) {
      throw new NotFoundException('certificate reminder not found');
    }

    const context = await this.resolveViewerContext(user);
    if (!(await this.canViewReminder(reminder, user, context))) {
      throw new NotFoundException('certificate reminder not found');
    }

    return reminder;
  }

  private async resolveViewerContext(user: CurrentUser): Promise<ViewerContext> {
    const viewer = await this.wecomUserRepository.findOne({ where: { userId: user.userId } });
    const roles = new Set(user.roles);

    if (viewer) {
      for (const role of resolveRolesFromDepartments(
        viewer.departmentIds ?? [],
        viewer.departmentNames,
        viewer.departmentCodes ?? [],
      )) {
        roles.add(role);
      }
    }

    if (user.roles.includes('system_admin')) {
      roles.add('system_admin');
    }

    return { viewer, roles };
  }

  private async canViewReminder(
    reminder: CertificateReminderEntity,
    user: CurrentUser,
    context: ViewerContext,
  ): Promise<boolean> {
    if (context.roles.has('system_admin')) {
      return true;
    }

    if (reminder.recipientUserId === user.userId) {
      return true;
    }

    if (reminder.ownerType === 'vessel') {
      return context.roles.has('shipping') || context.roles.has('general_office');
    }

    if (reminder.ownerType === 'vehicle') {
      return context.roles.has('logistics') || context.roles.has('general_office');
    }

    if (reminder.ownerType !== 'personnel') {
      return false;
    }

    const personnel = await this.personnelRepository.findOne({
      where: { id: reminder.ownerId, deletedAt: IsNull() },
    });
    if (!personnel || !context.viewer) {
      return false;
    }

    if (!isManagementPosition(context.viewer.position)) {
      return false;
    }

    return context.viewer.departmentCodes.includes(personnel.departmentCode);
  }

  private filterReminders(reminders: CertificateReminderEntity[], query: ReminderListQueryDto): CertificateReminderEntity[] {
    return reminders.filter((item) => {
      if (query.status && item.status !== query.status) {
        return false;
      }

      if (query.reminderType && item.reminderType !== query.reminderType) {
        return false;
      }

      if (query.ownerType && item.ownerType !== query.ownerType) {
        return false;
      }

      return true;
    });
  }

  private sortReminders(reminders: CertificateReminderEntity[]): CertificateReminderEntity[] {
    return [...reminders].sort((left, right) => {
      if (left.scheduledDate !== right.scheduledDate) {
        return right.scheduledDate.localeCompare(left.scheduledDate);
      }

      return right.createdAt.getTime() - left.createdAt.getTime();
    });
  }

  private groupByOwnerType(reminders: CertificateReminderEntity[]): Array<{ ownerType: string; count: number }> {
    const map = new Map<string, number>();
    for (const reminder of reminders) {
      const key = reminder.ownerType;
      map.set(key, (map.get(key) ?? 0) + 1);
    }

    return [...map.entries()].map(([ownerType, count]) => ({ ownerType, count }));
  }

  private groupByCertificateType(reminders: CertificateReminderEntity[]): Array<{ certificateTypeName: string; count: number }> {
    const map = new Map<string, number>();
    for (const reminder of reminders) {
      map.set(reminder.certificateTypeName, (map.get(reminder.certificateTypeName) ?? 0) + 1);
    }

    return [...map.entries()].map(([certificateTypeName, count]) => ({ certificateTypeName, count }));
  }

  private async canAcknowledge(reminder: CertificateReminderEntity, user: CurrentUser): Promise<boolean> {
    if (user.roles.includes('system_admin')) {
      return true;
    }

    if (reminder.recipientUserId === user.userId) {
      return true;
    }

    if (reminder.ownerType !== 'personnel') {
      return false;
    }

    const [personnel, currentUser] = await Promise.all([
      this.personnelRepository.findOne({ where: { id: reminder.ownerId, deletedAt: IsNull() } }),
      this.wecomUserRepository.findOne({ where: { userId: user.userId } }),
    ]);

    if (!personnel || !currentUser) {
      return false;
    }

    if (!isManagementPosition(currentUser.position)) {
      return false;
    }

    return currentUser.departmentCodes.includes(personnel.departmentCode);
  }

  private toDto(reminder: CertificateReminderEntity) {
    return {
      id: reminder.id,
      certificateId: reminder.certificateId,
      certificateTitle: reminder.certificateTitle,
      ownerType: reminder.ownerType,
      ownerName: reminder.ownerName,
      recipientUserId: reminder.recipientUserId,
      reminderType: reminder.reminderType,
      status: reminder.status,
      scheduledDate: reminder.scheduledDate,
      daysBeforeExpiry: reminder.daysBeforeExpiry,
      sentAt: reminder.sentAt?.toISOString() ?? null,
      acknowledgedAt: reminder.acknowledgedAt?.toISOString() ?? null,
      acknowledgedBy: reminder.acknowledgedBy,
    };
  }
}
