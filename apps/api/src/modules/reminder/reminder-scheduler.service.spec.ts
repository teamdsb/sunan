import { ReminderSchedulerService } from './reminder-scheduler.service';

describe('ReminderSchedulerService', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('queues an automatic scan immediately when the module starts', async () => {
    const jobService = {
      enqueueCronScan: jest.fn().mockResolvedValue({ jobId: 'job-1', acceptedAt: '2026-03-28T01:00:00.000Z' }),
    };
    const scheduler = new ReminderSchedulerService(jobService as never);

    scheduler.onModuleInit();
    await Promise.resolve();

    expect(jobService.enqueueCronScan).toHaveBeenCalledTimes(1);
    scheduler.onModuleDestroy();
  });

  it('queues another automatic scan every five minutes', async () => {
    const jobService = {
      enqueueCronScan: jest.fn().mockResolvedValue(null),
    };
    const scheduler = new ReminderSchedulerService(jobService as never);

    scheduler.onModuleInit();
    await Promise.resolve();
    await jest.advanceTimersByTimeAsync(5 * 60 * 1000);

    expect(jobService.enqueueCronScan).toHaveBeenCalledTimes(2);
    scheduler.onModuleDestroy();
  });

  it('stops scheduling after module destruction', async () => {
    const jobService = {
      enqueueCronScan: jest.fn().mockResolvedValue(null),
    };
    const scheduler = new ReminderSchedulerService(jobService as never);

    scheduler.onModuleInit();
    await Promise.resolve();
    scheduler.onModuleDestroy();
    await jest.advanceTimersByTimeAsync(10 * 60 * 1000);

    expect(jobService.enqueueCronScan).toHaveBeenCalledTimes(1);
  });
});
