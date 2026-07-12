import {
  buildGenerationKey,
  expandOccurrences,
  isTaskOverdue,
  resolveTaskAction,
  type RecurrenceRule,
} from './task-domain';

describe('plan-task domain rules', () => {
  const windowStart = new Date('2026-02-01T00:00:00.000Z');
  const windowEnd = new Date('2026-04-01T00:00:00.000Z');

  it('clamps a 31st monthly rule without permanently drifting its anchor', () => {
    const rule: RecurrenceRule = {
      kind: 'monthly',
      startAt: '2026-01-31T09:00:00+08:00',
      dayOfMonth: 31,
    };

    expect(expandOccurrences(rule, 'Asia/Shanghai', windowStart, windowEnd)).toEqual([
      '2026-02-28T01:00:00.000Z',
      '2026-03-31T01:00:00.000Z',
    ]);
  });

  it('expands leap-day annual occurrences only on valid dates', () => {
    const rule: RecurrenceRule = {
      kind: 'annual',
      startAt: '2024-02-29T08:00:00+08:00',
      month: 2,
      dayOfMonth: 29,
    };

    expect(
      expandOccurrences(
        rule,
        'Asia/Shanghai',
        new Date('2024-01-01T00:00:00.000Z'),
        new Date('2025-04-01T00:00:00.000Z'),
      ),
    ).toEqual([
      '2024-02-29T00:00:00.000Z',
      '2025-02-28T00:00:00.000Z',
    ]);
  });

  it('expands periodic and one-time plans at exact Asia/Shanghai instants', () => {
    expect(expandOccurrences(
      { kind: 'periodic', startAt: '2026-07-01T09:00:00+08:00', intervalDays: 2 },
      'Asia/Shanghai',
      new Date('2026-07-01T00:00:00.000Z'),
      new Date('2026-07-06T00:00:00.000Z'),
    )).toEqual(['2026-07-01T01:00:00.000Z', '2026-07-03T01:00:00.000Z', '2026-07-05T01:00:00.000Z']);
    expect(expandOccurrences(
      { kind: 'one_time', startAt: '2026-07-01T23:30:00+08:00' },
      'Asia/Shanghai',
      new Date('2026-07-01T00:00:00.000Z'),
      new Date('2026-07-02T00:00:00.000Z'),
    )).toEqual(['2026-07-01T15:30:00.000Z']);
  });

  it('rejects unsupported plan time zones', () => {
    expect(() => expandOccurrences(
      { kind: 'one_time', startAt: '2026-07-01T09:00:00+08:00' },
      'UTC',
      new Date('2026-07-01T00:00:00.000Z'),
      new Date('2026-07-02T00:00:00.000Z'),
    )).toThrow('unsupported plan time zone');
  });

  it('uses a stable generation key across repeat and concurrent attempts', () => {
    const occurrence = '2026-03-31T01:00:00.000Z';
    const first = buildGenerationKey('item-1', 2, occurrence);
    const concurrent = Array.from({ length: 8 }, () =>
      buildGenerationKey('item-1', 2, occurrence),
    );

    expect(new Set(concurrent)).toEqual(new Set([first]));
    expect(buildGenerationKey('item-1', 3, occurrence)).not.toBe(first);
    expect(buildGenerationKey('item-2', 2, occurrence)).not.toBe(first);
  });

  it('derives overdue strictly after the deadline in the task time zone', () => {
    const dueAt = new Date('2026-07-31T09:00:00.000Z');
    expect(isTaskOverdue('in_progress', dueAt, dueAt)).toBe(false);
    expect(isTaskOverdue('blocked', dueAt, new Date('2026-07-31T09:00:00.001Z'))).toBe(true);
    expect(isTaskOverdue('completed', dueAt, new Date('2026-08-01T00:00:00.000Z'))).toBe(false);
    expect(isTaskOverdue('cancelled', dueAt, new Date('2026-08-01T00:00:00.000Z'))).toBe(false);
  });

  it('requires reasons and revokes former responsibility on action decisions', () => {
    expect(() =>
      resolveTaskAction({ status: 'pending', actionType: 'reschedule', reason: '', actor: 'owner' }),
    ).toThrow('reason is required');
    expect(resolveTaskAction({ status: 'pending', actionType: 'cancel', reason: '天气原因', actor: 'owner' })).toMatchObject({ nextStatus: 'cancelled' });
    expect(resolveTaskAction({ status: 'in_progress', actionType: 'transfer', reason: '轮班交接', actor: 'plan_owner' })).toMatchObject({ nextStatus: 'in_progress', revokeFormerExecutor: true });
    expect(() =>
      resolveTaskAction({ status: 'completed', actionType: 'transfer', reason: 'too late', actor: 'plan_owner' }),
    ).toThrow('illegal task transition');
  });
});
