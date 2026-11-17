import { nextShanghaiPlanTaskRun, PlanTaskSchedulerService } from './plan-task-scheduler.service';

describe('PlanTaskSchedulerService time boundary', () => {
  it('schedules 00:05 Asia/Shanghai today before the boundary and tomorrow after it', () => {
    expect(nextShanghaiPlanTaskRun(new Date('2026-07-10T16:04:59.999Z')).toISOString()).toBe('2026-07-10T16:05:00.000Z');
    expect(nextShanghaiPlanTaskRun(new Date('2026-07-10T16:05:00.000Z')).toISOString()).toBe('2026-07-11T16:05:00.000Z');
  });
});

describe('PlanTaskSchedulerService shutdown', () => {
  afterEach(() => jest.useRealTimers());

  it('waits for the running cycle and never schedules another after shutdown', async () => {
    jest.useFakeTimers({ now: new Date('2026-07-10T16:04:59.000Z') });
    let finish!: () => void;
    const cycle = new Promise<void>((resolve) => { finish = resolve; });
    const service = { runScheduledCycle: jest.fn().mockReturnValue(cycle) };
    const scheduler = new PlanTaskSchedulerService(service as never);
    scheduler.onModuleInit();
    await jest.advanceTimersByTimeAsync(1000);
    expect(service.runScheduledCycle).toHaveBeenCalledTimes(1);

    let closed = false;
    const closing = Promise.resolve(scheduler.onModuleDestroy()).then(() => { closed = true; });
    try {
      await Promise.resolve();
      expect(closed).toBe(false);
      finish();
      await closing;
      expect(jest.getTimerCount()).toBe(0);
      await jest.advanceTimersByTimeAsync(24 * 60 * 60 * 1000);
      expect(service.runScheduledCycle).toHaveBeenCalledTimes(1);
    } finally {
      finish();
      await closing;
      jest.clearAllTimers();
    }
  });
});
