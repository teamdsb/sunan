import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { PlanTaskService } from './plan-task.service';

export function nextShanghaiPlanTaskRun(now: Date): Date {
  const shifted = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const year = shifted.getUTCFullYear();
  const month = shifted.getUTCMonth();
  const day = shifted.getUTCDate();
  const todayRun = new Date(Date.UTC(year, month, day, -8, 5));
  return now < todayRun ? todayRun : new Date(Date.UTC(year, month, day + 1, -8, 5));
}

@Injectable()
export class PlanTaskSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PlanTaskSchedulerService.name);
  private timer: NodeJS.Timeout | null = null;
  private inFlight: Promise<void> | null = null;
  private stopped = false;

  constructor(private readonly planTaskService: PlanTaskService) {}

  onModuleInit() {
    this.stopped = false;
    this.scheduleNextRun();
  }

  async onModuleDestroy() {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    await this.inFlight;
  }

  private scheduleNextRun() {
    if (this.stopped) return;
    const now = new Date();
    const delay = Math.max(nextShanghaiPlanTaskRun(now).getTime() - now.getTime(), 0);
    this.timer = setTimeout(() => {
      this.timer = null;
      this.inFlight = this.planTaskService.runScheduledCycle().then(() => undefined).catch((error) => {
        this.logger.error(`plan-task scheduled cycle failed: ${error instanceof Error ? error.message : 'unknown error'}`);
      }).finally(() => {
        this.inFlight = null;
        this.scheduleNextRun();
      });
    }, delay);
  }
}
