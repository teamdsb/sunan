import { toBusinessDate, toBusinessDateTime } from './business-date';

describe('toBusinessDate', () => {
  it('keeps the selected Shanghai calendar date when the UTC instant is the prior day', () => {
    expect(toBusinessDate('2026-08-13T00:00:00+08:00')).toBe('2026-08-13');
    expect(toBusinessDate('2026-08-12T16:00:00.000Z')).toBe('2026-08-13');
  });

  it('interprets an offset-less date-time in the business time zone', () => {
    expect(toBusinessDate('2026-08-13T00:00')).toBe('2026-08-13');
  });

  it('returns null for an invalid value', () => {
    expect(toBusinessDate('not-a-date')).toBeNull();
  });
});

describe('toBusinessDateTime', () => {
  it('interprets offset-less datetime-local values in Asia/Shanghai', () => {
    expect(toBusinessDateTime('2026-08-13T00:00').toISOString()).toBe('2026-08-12T16:00:00.000Z');
  });

  it('preserves an explicit offset', () => {
    expect(toBusinessDateTime('2026-08-13T00:00:00Z').toISOString()).toBe('2026-08-13T00:00:00.000Z');
  });
});
