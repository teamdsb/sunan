import { ReminderClockService } from './reminder-clock.service';

describe('ReminderClockService', () => {
  it('returns the Shanghai-local calendar date', () => {
    const service = new ReminderClockService();
    jest.spyOn(service, 'now').mockReturnValue(new Date('2026-03-27T16:30:00.000Z'));

    expect(service.today()).toBe('2026-03-28');
  });

  it('does not drift when Shanghai is still on the same calendar day as UTC', () => {
    const service = new ReminderClockService();
    jest.spyOn(service, 'now').mockReturnValue(new Date('2026-03-27T01:30:00.000Z'));

    expect(service.today()).toBe('2026-03-27');
  });
});
