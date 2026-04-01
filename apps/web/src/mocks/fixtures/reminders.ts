import { mockAuthPayload } from './auth';
import type { ReminderDashboardSummary, ReminderItem } from '../../features/reminder/reminderApi';

const BASE_TIMESTAMP = Date.parse('2026-03-01T00:00:00.000Z');

export interface ReminderMockRecord extends ReminderItem {
  createdAt: string;
  updatedAt: string;
  failureReason?: string | null;
}

export interface ReminderMockState {
  reminders: ReminderMockRecord[];
  nextReminderId: number;
  nextScanJobId: number;
}

function timestamp(offsetMinutes: number): string {
  return new Date(BASE_TIMESTAMP + offsetMinutes * 60_000).toISOString();
}

function cloneReminder(reminder: ReminderMockRecord): ReminderMockRecord {
  return {
    ...reminder,
  };
}

export function cloneReminderRecord(reminder: ReminderMockRecord): ReminderMockRecord {
  return cloneReminder(reminder);
}

export function createReminderMockState(): ReminderMockState {
  return {
    reminders: [
      {
        id: 'reminder-1',
        certificateId: '1',
        certificateTitle: '国籍证书',
        ownerType: 'vessel',
        ownerName: '苏南012',
        recipientUserId: mockAuthPayload.user.userId,
        reminderType: 'overdue',
        status: 'pending',
        scheduledDate: '2026-03-01',
        daysBeforeExpiry: -1,
        sentAt: '2026-03-01T01:00:00.000Z',
        acknowledgedAt: null,
        acknowledgedBy: null,
        createdAt: timestamp(0),
        updatedAt: timestamp(0),
      },
      {
        id: 'reminder-2',
        certificateId: '2',
        certificateTitle: '船检证书',
        ownerType: 'vessel',
        ownerName: '苏南018',
        recipientUserId: mockAuthPayload.user.userId,
        reminderType: 'upcoming',
        status: 'acknowledged',
        scheduledDate: '2026-03-02',
        daysBeforeExpiry: 15,
        sentAt: '2026-03-01T01:05:00.000Z',
        acknowledgedAt: '2026-03-01T02:00:00.000Z',
        acknowledgedBy: mockAuthPayload.user.userId,
        createdAt: timestamp(10),
        updatedAt: timestamp(10),
      },
      {
        id: 'reminder-3',
        certificateId: '1',
        certificateTitle: '国籍证书',
        ownerType: 'vehicle',
        ownerName: '桂A0001',
        recipientUserId: 'shipping-manager',
        reminderType: 'upcoming',
        status: 'sent',
        scheduledDate: '2026-03-03',
        daysBeforeExpiry: 30,
        sentAt: '2026-03-01T03:00:00.000Z',
        acknowledgedAt: null,
        acknowledgedBy: null,
        createdAt: timestamp(20),
        updatedAt: timestamp(20),
      },
    ],
    nextReminderId: 4,
    nextScanJobId: 1,
  };
}

export function createReminderDashboardSummary(
  reminders: ReminderMockRecord[],
): ReminderDashboardSummary {
  const byOwnerType = new Map<string, number>();
  const byCertificateType = new Map<string, number>();

  for (const reminder of reminders) {
    byOwnerType.set(reminder.ownerType, (byOwnerType.get(reminder.ownerType) ?? 0) + 1);
    byCertificateType.set(
      reminder.certificateTitle,
      (byCertificateType.get(reminder.certificateTitle) ?? 0) + 1,
    );
  }

  return {
    totalPending: reminders.filter((reminder) => reminder.status === 'pending').length,
    totalOverdue: reminders.filter(
      (reminder) => reminder.reminderType === 'overdue' && reminder.status !== 'acknowledged',
    ).length,
    totalAcknowledged: reminders.filter((reminder) => reminder.status === 'acknowledged').length,
    byOwnerType: [...byOwnerType.entries()].map(([ownerType, count]) => ({ ownerType, count })),
    byCertificateType: [...byCertificateType.entries()].map(([certificateTypeName, count]) => ({
      certificateTypeName,
      count,
    })),
  };
}
