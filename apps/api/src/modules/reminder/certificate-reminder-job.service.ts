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
const PROCESSING_HEARTBEAT_MS = 60 * 1000;
const PROCESSING_STALE_AFTER_MS = 3 * PROCESSING_HEARTBEAT_MS;
const RETRY_BACKOFF_BASE_MS = 1000;
const MAX_RETRY_COUNT = 3;
const CRON_MARKER_TTL_SECONDS = 172_800;
const WORKER_IDLE_DELAY_MS = 250;

class RecoverableScanAbortError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RecoverableScanAbortError';
  }
}

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

    const result = await this.redis.eval(
      `
      if redis.call('SET', KEYS[1], ARGV[1], 'NX', 'EX', ARGV[2]) then
        redis.call('HSET', KEYS[2], 'jobId', ARGV[1], 'source', 'cron', 'status', 'queued', 'acceptedAt', ARGV[3])
        redis.call('EXPIRE', KEYS[2], ARGV[4])
        redis.call('LPUSH', KEYS[3], ARGV[5])
        return 1
      end
      return 0
      `,
      3,
      cronMarkerKey,
      jobKey,
      QUEUE_KEY,
      jobId,
      String(CRON_MARKER_TTL_SECONDS),
      acceptedAt,
      '86400',
      payload,
    );

    if (Number(result) !== 1) {
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
    const payload = JSON.stringify(envelope);

    await this.redis.eval(
      `
      redis.call('HSET', KEYS[1], 'jobId', ARGV[1], 'source', ARGV[2], 'status', 'queued', 'acceptedAt', ARGV[3])
      redis.call('EXPIRE', KEYS[1], ARGV[4])
      redis.call('LPUSH', KEYS[2], ARGV[5])
      return 1
      `,
      2,
      jobKey,
      QUEUE_KEY,
      jobId,
      source,
      acceptedAt,
      '86400',
      payload,
    );

    return { jobId, acceptedAt };
  }

  private async runWorkerLoop(): Promise<void> {
    while (this.workerActive && !this.stopped) {
      try {
        await this.recoverStalledJobs();
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
    const payloads = await this.redis.lrange(PROCESSING_KEY, 0, -1);
    for (const payload of payloads) {
      const envelope = this.parseEnvelope(payload);
      if (!envelope) {
        continue;
      }

      const key = this.buildKey(envelope.jobId);
      const job = await this.redis.hgetall(key);
      if (!this.shouldRequeueJob(job)) {
        continue;
      }

      const removed = await this.redis.lrem(PROCESSING_KEY, 1, payload);
      if (removed > 0) {
        await this.redis.lpush(QUEUE_KEY, payload);
        await this.redis.hset(key, {
          status: 'queued',
        });
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
    let retainProcessingPayload = false;
    try {
      payload = await this.redis.rpoplpush(QUEUE_KEY, PROCESSING_KEY);
      if (!payload) {
        return false;
      }

      let leaseValid = true;
      stopHeartbeat = this.startLockHeartbeat(lockToken, () => {
        leaseValid = false;
      });
      const envelope = JSON.parse(payload) as ReminderJobEnvelope;
      await this.runJob(envelope, () => leaseValid);
      return true;
    } catch (error) {
      if (error instanceof RecoverableScanAbortError) {
        retainProcessingPayload = true;
      }

      const message = error instanceof Error ? error.message : 'queue processing failed';
      this.logger.warn(`reminder queue processing failed: ${message}`);
      return false;
    } finally {
      if (payload && !retainProcessingPayload) {
        await this.redis.lrem(PROCESSING_KEY, 1, payload);
      }

      stopHeartbeat();
      await this.releaseScanLock(lockToken);
    }
  }

  private async runJob(envelope: ReminderJobEnvelope, isLeaseValid: () => boolean): Promise<void> {
    const key = this.buildKey(envelope.jobId);
    const startedAt = this.clock.now().toISOString();
    let stopHeartbeat: () => void = () => undefined;

    try {
      await this.redis.hset(key, {
        status: 'running',
        startedAt,
        heartbeatAt: startedAt,
      });
      stopHeartbeat = this.startJobHeartbeat(key);

      const result = await this.engine.runScan(envelope, { isLeaseValid });

      await this.redis.hset(key, {
        status: 'completed',
        finishedAt: this.clock.now().toISOString(),
        heartbeatAt: this.clock.now().toISOString(),
        createdCount: String(result.createdCount),
        sentCount: String(result.sentCount),
        failedCount: String(result.failedCount),
      });
    } catch (error) {
      if (this.isRecoverableLeaseLoss(error)) {
        const job = await this.redis.hgetall(key);
        const retryCount = Number(job.retryCount ?? 0);
        const nextRetryCount = retryCount + 1;
        const now = this.clock.now();
        const abortedAt = now.toISOString();

        if (nextRetryCount > MAX_RETRY_COUNT) {
          await this.redis.hset(key, {
            status: 'failed',
            finishedAt: abortedAt,
            heartbeatAt: abortedAt,
            abortReason: 'lease_lost',
            error: 'scan lock lost',
            retryCount: String(retryCount),
          });
          throw new Error('scan lock lost');
        }

        await this.redis.hset(key, {
          status: 'retryable',
          abortReason: 'lease_lost',
          retryCount: String(nextRetryCount),
          nextRetryAt: new Date(now.getTime() + this.retryBackoffMs(nextRetryCount)).toISOString(),
          heartbeatAt: abortedAt,
        });
        throw new RecoverableScanAbortError('scan lock lost');
      }

      const message = error instanceof Error ? error.message : 'scan failed';
      this.logger.warn(`reminder scan job ${envelope.jobId} failed: ${message}`);
      await this.redis.hset(key, {
        status: 'failed',
        finishedAt: this.clock.now().toISOString(),
        heartbeatAt: this.clock.now().toISOString(),
        error: message,
      });
    } finally {
      stopHeartbeat();
    }
  }

  private async acquireScanLock(): Promise<string | null> {
    const token = randomUUID();
    const result = await this.redis.set(SCAN_LOCK_KEY, token, 'PX', SCAN_LOCK_TTL_MS, 'NX');
    return result === 'OK' ? token : null;
  }

  private startLockHeartbeat(token: string, onLeaseLost: () => void): () => void {
    const renew = () => {
      void this.renewScanLock(token)
        .then((renewed) => {
          if (!renewed) {
            this.logger.warn('reminder scan lock renewal failed');
            onLeaseLost();
          }
        })
        .catch((error) => {
          const message = error instanceof Error ? error.message : 'unknown renewal error';
          this.logger.warn(`reminder scan lock renewal failed: ${message}`);
          onLeaseLost();
        });
    };

    const timer = setInterval(renew, SCAN_LOCK_HEARTBEAT_MS);
    return () => {
      clearInterval(timer);
    };
  }

  private startJobHeartbeat(jobKey: string): () => void {
    const renew = () => {
      void this.redis.hset(jobKey, {
        heartbeatAt: this.clock.now().toISOString(),
      });
    };

    const timer = setInterval(renew, PROCESSING_HEARTBEAT_MS);
    return () => {
      clearInterval(timer);
    };
  }

  private shouldRequeueJob(job: Record<string, string>): boolean {
    const status = job.status;
    if (status === 'completed' || status === 'failed') {
      return false;
    }

    if (status === 'retryable') {
      const nextRetryAt = job.nextRetryAt;
      if (!nextRetryAt) {
        return true;
      }

      return this.clock.now().getTime() >= new Date(nextRetryAt).getTime();
    }

    const timestamp = job.heartbeatAt ?? job.startedAt ?? job.acceptedAt;
    if (!timestamp) {
      return true;
    }

    const ageMs = this.clock.now().getTime() - new Date(timestamp).getTime();
    return ageMs >= PROCESSING_STALE_AFTER_MS;
  }

  private parseEnvelope(payload: string): ReminderJobEnvelope | null {
    try {
      return JSON.parse(payload) as ReminderJobEnvelope;
    } catch (error) {
      this.logger.warn(`failed to parse reminder queue payload: ${error instanceof Error ? error.message : 'invalid payload'}`);
      return null;
    }
  }

  private isRecoverableLeaseLoss(error: unknown): boolean {
    return error instanceof Error && error.message === 'scan lock lost';
  }

  private retryBackoffMs(retryCount: number): number {
    return Math.min(RETRY_BACKOFF_BASE_MS * retryCount, 15 * 60 * 1000);
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
