import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { CertificateReminderJobService } from './certificate-reminder-job.service';

@Injectable()
export class ReminderSchedulerService implements OnModuleInit, OnModuleDestroy {
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly jobService: CertificateReminderJobService) {}

  onModuleInit(): void {
    this.scheduleNextRun();
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private scheduleNextRun(): void {
    const now = new Date();
    const nextRun = this.nextShanghaiNine(now);
    const delay = Math.max(nextRun.getTime() - now.getTime(), 0);

    this.timer = setTimeout(() => {
      void this.jobService.enqueueScan({ source: 'cron' });
      this.scheduleNextRun();
    }, delay);
  }

  private nextShanghaiNine(now: Date): Date {
    const shanghaiOffsetMs = 8 * 60 * 60 * 1000;
    const shifted = new Date(now.getTime() + shanghaiOffsetMs);
    const year = shifted.getUTCFullYear();
    const month = shifted.getUTCMonth();
    const day = shifted.getUTCDate();
    const nineUtcMs = Date.UTC(year, month, day, 1, 0, 0, 0);
    if (now.getTime() < nineUtcMs) {
      return new Date(nineUtcMs);
    }

    return new Date(Date.UTC(year, month, day + 1, 1, 0, 0, 0));
  }
}
