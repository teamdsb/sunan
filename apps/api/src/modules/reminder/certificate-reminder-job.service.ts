import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { randomUUID } from 'crypto';

import { REDIS_CLIENT } from 'src/modules/wecom/wecom.constants';

import { ReminderClockService } from './reminder-clock.service';
import type { ReminderJobEnvelope } from './reminder.types';
import { CertificateReminderEngineService } from './certificate-reminder-engine.service';

@Injectable()
export class CertificateReminderJobService {
  private readonly logger = new Logger(CertificateReminderJobService.name);

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly engine: CertificateReminderEngineService,
    private readonly clock: ReminderClockService,
  ) {}

  async enqueueScan(params: { source: ReminderJobEnvelope['source'] }): Promise<{
    jobId: string;
    acceptedAt: string;
  }> {
    const jobId = randomUUID();
    const acceptedAt = this.clock.now().toISOString();
    const key = this.buildKey(jobId);

    await this.redis.hset(key, {
      jobId,
      source: params.source,
      status: 'queued',
      acceptedAt,
    });
    await this.redis.expire(key, 86_400);

    setTimeout(() => {
      void this.runJob({ jobId, source: params.source });
    }, 0);

    return { jobId, acceptedAt };
  }

  private async runJob(envelope: ReminderJobEnvelope): Promise<void> {
    const key = this.buildKey(envelope.jobId);
    const startedAt = this.clock.now().toISOString();

    try {
      await this.redis.hset(key, {
        status: 'running',
        startedAt,
      });

      const result = await this.engine.runScan(envelope);

      await this.redis.hset(key, {
        status: 'completed',
        finishedAt: this.clock.now().toISOString(),
        createdCount: String(result.createdCount),
        sentCount: String(result.sentCount),
        failedCount: String(result.failedCount),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'scan failed';
      this.logger.warn(`reminder scan job ${envelope.jobId} failed: ${message}`);
      await this.redis.hset(key, {
        status: 'failed',
        finishedAt: this.clock.now().toISOString(),
        error: message,
      });
    }
  }

  private buildKey(jobId: string): string {
    return `certificate-reminder:job:${jobId}`;
  }
}
