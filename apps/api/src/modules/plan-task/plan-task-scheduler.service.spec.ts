import { nextShanghaiPlanTaskRun } from './plan-task-scheduler.service';

describe('PlanTaskSchedulerService time boundary', () => {
  it('schedules 00:05 Asia/Shanghai today before the boundary and tomorrow after it', () => {
    expect(nextShanghaiPlanTaskRun(new Date('2026-07-10T16:04:59.999Z')).toISOString()).toBe('2026-07-10T16:05:00.000Z');
    expect(nextShanghaiPlanTaskRun(new Date('2026-07-10T16:05:00.000Z')).toISOString()).toBe('2026-07-11T16:05:00.000Z');
  });
});
