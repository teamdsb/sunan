import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { CertificateReminderJobService } from './certificate-reminder-job.service';

@Injectable()
export class ReminderSchedulerService implements OnModuleInit, OnModuleDestroy {
  private timer: NodeJS.Timeout | null = null;
  private readonly intervalMs = 5 * 60 * 1000;

  constructor(private readonly jobService: CertificateReminderJobService) {}

  onModuleInit(): void {
    void this.enqueueScheduledScan();
    this.timer = setInterval(() => {
      void this.enqueueScheduledScan();
    }, this.intervalMs);
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async enqueueScheduledScan(): Promise<void> {
    try {
      await this.jobService.enqueueCronScan();
    } catch {
      // The next interval retries automatically; the worker remains available.
    }
  }
}
