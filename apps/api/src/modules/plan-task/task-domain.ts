import { createHash } from 'node:crypto';
import { toBusinessDateTime } from 'src/common/date/business-date';

export type RecurrenceKind = 'annual' | 'monthly' | 'periodic' | 'one_time';
export type TaskStatus = 'pending' | 'in_progress' | 'blocked' | 'completed' | 'cancelled';

export interface RecurrenceRule {
  kind: RecurrenceKind;
  startAt: string;
  month?: number;
  dayOfMonth?: number;
  intervalDays?: number;
}

type LocalDateTime = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function formatParts(date: Date, timeZone: string): LocalDateTime {
  let formatter = formatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });
    formatterCache.set(timeZone, formatter);
  }
  const values = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]),
  );
  const required = (key: string): number => {
    const value = values[key];
    if (typeof value !== 'number' || !Number.isInteger(value)) {
      throw new Error(`unable to resolve ${key} for ${timeZone}`);
    }
    return value;
  };
  return {
    year: required('year'),
    month: required('month'),
    day: required('day'),
    hour: required('hour'),
    minute: required('minute'),
    second: required('second'),
  };
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function localShanghaiToUtc(parts: LocalDateTime, timeZone: string): Date {
  if (timeZone !== 'Asia/Shanghai') {
    throw new Error(`unsupported plan time zone: ${timeZone}`);
  }
  return new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour - 8, parts.minute, parts.second),
  );
}

function inWindow(value: Date, windowStart: Date, windowEnd: Date): boolean {
  return value >= windowStart && value < windowEnd;
}

export function expandOccurrences(
  rule: RecurrenceRule,
  timeZone: string,
  windowStart: Date,
  windowEnd: Date,
): string[] {
  const anchor = toBusinessDateTime(rule.startAt);
  if (Number.isNaN(anchor.getTime()) || windowStart >= windowEnd) {
    return [];
  }
  const local = formatParts(anchor, timeZone);
  const result: Date[] = [];
  const append = (parts: LocalDateTime) => {
    const candidate = localShanghaiToUtc(parts, timeZone);
    if (inWindow(candidate, windowStart, windowEnd)) {
      result.push(candidate);
    }
  };

  if (rule.kind === 'one_time') {
    append(local);
  } else if (rule.kind === 'periodic') {
    if (!rule.intervalDays || rule.intervalDays < 1) {
      throw new Error('periodic recurrence requires intervalDays');
    }
    for (let candidate = new Date(anchor); candidate < windowEnd; candidate = new Date(candidate.getTime() + rule.intervalDays * 86_400_000)) {
      if (candidate >= windowStart) {
        result.push(candidate);
      }
    }
  } else if (rule.kind === 'monthly') {
    if (!rule.dayOfMonth || rule.dayOfMonth < 1 || rule.dayOfMonth > 31) {
      throw new Error('monthly recurrence requires dayOfMonth');
    }
    for (let year = local.year, month = local.month; ; month += 1) {
      if (month === 13) {
        month = 1;
        year += 1;
      }
      const candidate = localShanghaiToUtc(
        { ...local, year, month, day: Math.min(rule.dayOfMonth, daysInMonth(year, month)) },
        timeZone,
      );
      if (candidate >= windowEnd) break;
      if (candidate >= anchor && candidate >= windowStart) result.push(candidate);
    }
  } else {
    const month = rule.month ?? local.month;
    const day = rule.dayOfMonth ?? local.day;
    if (month < 1 || month > 12 || day < 1 || day > 31) {
      throw new Error('annual recurrence requires a valid month and dayOfMonth');
    }
    for (let year = local.year; ; year += 1) {
      const candidate = localShanghaiToUtc(
        { ...local, year, month, day: Math.min(day, daysInMonth(year, month)) },
        timeZone,
      );
      if (candidate >= windowEnd) break;
      if (candidate >= anchor && candidate >= windowStart) result.push(candidate);
    }
  }

  return result.sort((left, right) => left.getTime() - right.getTime()).map((value) => value.toISOString());
}

export function buildGenerationKey(planItemId: string, ruleVersion: number, occurrenceAt: string): string {
  return createHash('sha256').update(`${planItemId}:${ruleVersion}:${occurrenceAt}`).digest('hex');
}

export function isTaskOverdue(status: TaskStatus, dueAt: Date, now: Date): boolean {
  return status !== 'completed' && status !== 'cancelled' && dueAt < now;
}

export type TaskActionType = 'start' | 'complete' | 'block' | 'reschedule' | 'cancel' | 'remind' | 'escalate' | 'delegate' | 'transfer';

export interface TaskActionDecisionInput {
  status: TaskStatus;
  actionType: TaskActionType;
  reason: string;
  actor: 'executor' | 'owner' | 'plan_owner' | 'system_admin';
}

export interface TaskActionDecision {
  nextStatus: TaskStatus;
  revokeFormerExecutor: boolean;
}

export function resolveTaskAction(input: TaskActionDecisionInput): TaskActionDecision {
  const requireReason = new Set<TaskActionType>(['block', 'reschedule', 'cancel', 'remind', 'escalate', 'delegate', 'transfer']);
  if (requireReason.has(input.actionType) && !input.reason.trim()) {
    throw new Error('reason is required');
  }
  if (input.status === 'completed' || input.status === 'cancelled') {
    throw new Error('illegal task transition');
  }
  if (input.actionType === 'start') {
    if (input.status !== 'pending') throw new Error('illegal task transition');
    return { nextStatus: 'in_progress', revokeFormerExecutor: false };
  }
  if (input.actionType === 'complete') {
    return { nextStatus: 'completed', revokeFormerExecutor: false };
  }
  if (input.actionType === 'block') {
    if (input.status === 'blocked') throw new Error('illegal task transition');
    return { nextStatus: 'blocked', revokeFormerExecutor: false };
  }
  if (input.actionType === 'cancel') {
    return { nextStatus: 'cancelled', revokeFormerExecutor: false };
  }
  return { nextStatus: input.status, revokeFormerExecutor: input.actionType === 'transfer' };
}
