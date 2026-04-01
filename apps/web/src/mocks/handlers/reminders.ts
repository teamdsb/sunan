import type { ReminderItem } from '../../features/reminder/reminderApi';
import {
  cloneReminderRecord,
  createReminderDashboardSummary,
  type ReminderMockRecord,
  type ReminderMockState,
} from '../fixtures/reminders';
import type { MockHandlerContext, MockRouteDefinition } from '../types';
import { createMockResponse } from '../utils';

const BASE_TIMESTAMP = Date.parse('2026-03-01T00:00:00.000Z');

type ReminderRuntimeState = MockHandlerContext['state'] & {
  reminder: ReminderMockState;
};

function now(offsetMinutes = 1): string {
  return new Date(BASE_TIMESTAMP + offsetMinutes * 60_000).toISOString();
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function toText(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

function parsePage(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function parsePageSize(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function getReminderState(context: MockHandlerContext): ReminderMockState {
  return (context.state as ReminderRuntimeState).reminder;
}

function cloneReminders(reminders: ReminderMockRecord[]): ReminderItem[] {
  return reminders.map((reminder) => cloneReminderRecord(reminder));
}

function findReminder(
  state: ReminderMockState,
  id: string,
): ReminderMockRecord | undefined {
  return state.reminders.find((reminder) => reminder.id === id);
}

function matchesFilters(
  reminder: ReminderMockRecord,
  params: Record<string, unknown>,
): boolean {
  const status = toText(params.status);
  const reminderType = toText(params.reminderType);
  const ownerType = toText(params.ownerType);

  if (status && reminder.status !== status) {
    return false;
  }

  if (reminderType && reminder.reminderType !== reminderType) {
    return false;
  }

  if (ownerType && reminder.ownerType !== ownerType) {
    return false;
  }

  return true;
}

function sortReminders(reminders: ReminderMockRecord[]): ReminderMockRecord[] {
  return [...reminders].sort(
    (left, right) =>
      right.scheduledDate.localeCompare(left.scheduledDate) ||
      left.id.localeCompare(right.id),
  );
}

function paginate<T>(items: T[], params: Record<string, unknown>) {
  const page = parsePage(params.page, 1);
  const pageSize = parsePageSize(params.pageSize, 20);
  const start = (page - 1) * pageSize;
  const totalPages = items.length === 0 ? 0 : Math.ceil(items.length / pageSize);

  return {
    data: items.slice(start, start + pageSize),
    meta: {
      page,
      pageSize,
      total: items.length,
      totalPages,
    },
  };
}

function listReminders(context: MockHandlerContext) {
  const state = getReminderState(context);
  const params = asObject(context.request.params);
  const filtered = sortReminders(state.reminders.filter((reminder) => matchesFilters(reminder, params)));
  const result = paginate(cloneReminders(filtered), params);

  return createMockResponse({
    data: result.data,
    meta: result.meta,
  });
}

function getReminderDashboard(context: MockHandlerContext) {
  const state = getReminderState(context);

  return createMockResponse({
    data: createReminderDashboardSummary(state.reminders),
  });
}

function getReminderDetail(context: MockHandlerContext) {
  const reminder = findReminder(getReminderState(context), context.params.id);

  if (!reminder) {
    return createMockResponse({ message: 'Reminder not found' }, 404);
  }

  return createMockResponse({
    data: cloneReminderRecord(reminder),
  });
}

function acknowledgeReminder(context: MockHandlerContext) {
  const state = getReminderState(context);
  const reminder = findReminder(state, context.params.id);

  if (!reminder) {
    return createMockResponse({ message: 'Reminder not found' }, 404);
  }

  if (reminder.status === 'acknowledged') {
    return createMockResponse({ message: 'Reminder already acknowledged' }, 409);
  }

  const acknowledgedReminder: ReminderMockRecord = {
    ...reminder,
    status: 'acknowledged',
    acknowledgedAt: now(),
    acknowledgedBy: reminder.recipientUserId,
    updatedAt: now(),
  };

  const index = state.reminders.findIndex((item) => item.id === reminder.id);
  state.reminders[index] = acknowledgedReminder;

  return createMockResponse({
    data: cloneReminderRecord(acknowledgedReminder),
  });
}

function triggerReminderScan(context: MockHandlerContext) {
  const state = getReminderState(context);
  const jobId = `scan-job-${state.nextScanJobId++}`;

  return createMockResponse(
    {
      data: {
        jobId,
        acceptedAt: now(),
      },
    },
    202,
  );
}

export const reminderHandlers: MockRouteDefinition[] = [
  {
    method: 'GET',
    path: '/certificate-reminders/dashboard',
    handler: getReminderDashboard,
  },
  {
    method: 'GET',
    path: '/certificate-reminders',
    handler: listReminders,
  },
  {
    method: 'GET',
    path: '/certificate-reminders/:id',
    handler: getReminderDetail,
  },
  {
    method: 'POST',
    path: '/certificate-reminders/:id/acknowledge',
    handler: acknowledgeReminder,
  },
  {
    method: 'POST',
    path: '/certificate-reminders/actions/scan',
    handler: triggerReminderScan,
  },
];
