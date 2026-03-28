import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'crypto';
import Redis from 'ioredis';

import { REDIS_CLIENT } from 'src/modules/wecom/wecom.constants';

import { CertificateReminderEngineService } from './certificate-reminder-engine.service';
import { ReminderClockService } from './reminder-clock.service';
import type { ReminderJobEnvelope } from './reminder.types';

const QUEUE_KEY = 'certificate-reminder:queue';
const PROCESSING_KEY = 'certificate-reminder:queue:processing';
const SCAN_LOCK_KEY = 'certificate-reminder:scan-lock';
const CRON_MARKER_PREFIX = 'certificate-reminder:cron:';
const SCAN_LOCK_TTL_MS = 30 * 60 * 1000;
const SCAN_LOCK_HEARTBEAT_MS = 5 * 60 * 1000;
const CRON_MARKER_TTL_SECONDS = 172_800;
const WORKER_IDLE_DELAY_MS = 250;

@Injectable()
export class CertificateReminderJobService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CertificateReminderJobService.name);
  private workerActive = false;
  private workerLoopPromise: Promise<void> | null = null;
  private stopped = false;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly engine: CertificateReminderEngineService,
    private readonly clock: ReminderClockService,
  ) {}

  onModuleInit(): void {
    if (this.workerLoopPromise) {
      return;
    }

    this.workerActive = true;
    this.workerLoopPromise = this.runWorkerLoop().finally(() => {
      this.workerLoopPromise = null;
    });
  }

  async onModuleDestroy(): Promise<void> {
    this.stopped = true;
    this.workerActive = false;
    await this.workerLoopPromise?.catch(() => undefined);
  }

  async enqueueScan(params: { source: ReminderJobEnvelope['source'] }): Promise<{
    jobId: string;
    acceptedAt: string;
  }> {
    return this.enqueueManualJob(params.source);
  }

  async enqueueCronScan(): Promise<{ jobId: string; acceptedAt: string } | null> {
    const jobId = randomUUID();
    const acceptedAt = this.clock.now().toISOString();
    const envelope: ReminderJobEnvelope = { jobId, source: 'cron' };
    const jobKey = this.buildKey(jobId);
    const payload = JSON.stringify(envelope);
    const cronMarkerKey = `${CRON_MARKER_PREFIX}${this.clock.today()}`;

    await this.redis.hset(jobKey, {
      jobId,
      source: envelope.source,
      status: 'queued',
      acceptedAt,
    });
    await this.redis.expire(jobKey, 86_400);

    const result = await this.redis.eval(
      `
      if redis.call('SET', KEYS[1], ARGV[1], 'NX', 'EX', ARGV[2]) then
        redis.call('LPUSH', KEYS[2], ARGV[3])
        return 1
      end
      return 0
      `,
      2,
      cronMarkerKey,
      QUEUE_KEY,
      jobId,
      String(CRON_MARKER_TTL_SECONDS),
      payload,
    );

    if (Number(result) !== 1) {
      await this.redis.hset(jobKey, {
        status: 'skipped',
        finishedAt: acceptedAt,
      });
      return null;
    }

    return { jobId, acceptedAt };
  }

  private async enqueueManualJob(source: ReminderJobEnvelope['source']): Promise<{
    jobId: string;
    acceptedAt: string;
  }> {
    const jobId = randomUUID();
    const acceptedAt = this.clock.now().toISOString();
    const envelope: ReminderJobEnvelope = { jobId, source };
    const jobKey = this.buildKey(jobId);

    await this.redis.hset(jobKey, {
      jobId,
      source,
      status: 'queued',
      acceptedAt,
    });
    await this.redis.expire(jobKey, 86_400);
    await this.redis.lpush(QUEUE_KEY, JSON.stringify(envelope));

    return { jobId, acceptedAt };
  }

  private async runWorkerLoop(): Promise<void> {
    await this.recoverStalledJobs();

    while (this.workerActive && !this.stopped) {
      try {
        const processed = await this.processQueueOnce();
        if (!processed) {
          await this.sleep(WORKER_IDLE_DELAY_MS);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'worker failed';
        this.logger.warn(`reminder worker loop failed: ${message}`);
        await this.sleep(WORKER_IDLE_DELAY_MS);
      }
    }
  }

  private async recoverStalledJobs(): Promise<void> {
    while (true) {
      const payload = await this.redis.rpoplpush(PROCESSING_KEY, QUEUE_KEY);
      if (!payload) {
        return;
      }
    }
  }

  private async processQueueOnce(): Promise<boolean> {
    const lockToken = await this.acquireScanLock();
    if (!lockToken) {
      return false;
    }

    let payload: string | null = null;
    let stopHeartbeat: () => void = () => undefined;
    try {
      payload = await this.redis.rpoplpush(QUEUE_KEY, PROCESSING_KEY);
      if (!payload) {
        return false;
      }

      stopHeartbeat = this.startLockHeartbeat(lockToken);
      const envelope = JSON.parse(payload) as ReminderJobEnvelope;
      await this.runJob(envelope);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'queue processing failed';
      this.logger.warn(`reminder queue processing failed: ${message}`);
      return false;
    } finally {
      if (payload) {
        await this.redis.lrem(PROCESSING_KEY, 1, payload);
      }

      stopHeartbeat();
      await this.releaseScanLock(lockToken);
    }
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

  private async acquireScanLock(): Promise<string | null> {
    const token = randomUUID();
    const result = await this.redis.set(SCAN_LOCK_KEY, token, 'PX', SCAN_LOCK_TTL_MS, 'NX');
    return result === 'OK' ? token : null;
  }

  private startLockHeartbeat(token: string): () => void {
    const renew = () => {
      void this.renewScanLock(token).then((renewed) => {
        if (!renewed) {
          this.logger.warn('reminder scan lock renewal failed');
        }
      });
    };

    const timer = setInterval(renew, SCAN_LOCK_HEARTBEAT_MS);
    return () => {
      clearInterval(timer);
    };
  }

  private async renewScanLock(token: string): Promise<boolean> {
    const result = await this.redis.eval(
      `
      if redis.call('GET', KEYS[1]) == ARGV[1] then
        return redis.call('PEXPIRE', KEYS[1], ARGV[2])
      end
      return 0
      `,
      1,
      SCAN_LOCK_KEY,
      token,
      String(SCAN_LOCK_TTL_MS),
    );

    return Number(result) === 1;
  }

  private async releaseScanLock(token: string | null): Promise<void> {
    if (!token) {
      return;
    }

    await this.redis.eval(
      `
      if redis.call('GET', KEYS[1]) == ARGV[1] then
        return redis.call('DEL', KEYS[1])
      end
      return 0
      `,
      1,
      SCAN_LOCK_KEY,
      token,
    );
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  private buildKey(jobId: string): string {
    return `certificate-reminder:job:${jobId}`;
  }
}
