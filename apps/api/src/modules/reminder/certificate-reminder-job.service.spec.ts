describe('CertificateReminderJobService', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  function createRedisMock() {
    const state = {
      queue: [] as string[],
      processing: [] as string[],
      hashes: new Map<string, Record<string, string>>(),
      lockToken: null as string | null,
      cronMarkers: new Set<string>(),
      lockRenewals: 0,
      failNextRenewal: false,
      rejectNextRenewal: false,
    };

    const redis = {
      hset: jest.fn(async (key: string, values: Record<string, string>) => {
        state.hashes.set(key, {
          ...(state.hashes.get(key) ?? {}),
          ...values,
        });
        return 1;
      }),
      expire: jest.fn(async () => 1),
      lpush: jest.fn(async (_key: string, value: string) => {
        state.queue.unshift(value);
        return state.queue.length;
      }),
      rpush: jest.fn(async (_key: string, value: string) => {
        state.queue.push(value);
        return state.queue.length;
      }),
      rpoplpush: jest.fn(async (source: string, destination: string) => {
        if (source === 'certificate-reminder:queue' && destination === 'certificate-reminder:queue:processing') {
          const value = state.queue.pop() ?? null;
          if (value) {
            state.processing.unshift(value);
          }
          return value;
        }

        if (source === 'certificate-reminder:queue:processing' && destination === 'certificate-reminder:queue') {
          const value = state.processing.shift() ?? null;
          if (value) {
            state.queue.unshift(value);
          }
          return value;
        }

        return null;
      }),
      lrange: jest.fn(async (_key: string, start: number, end: number) => {
        if (start === 0 && end === -1) {
          return [...state.processing];
        }

        return [];
      }),
      hgetall: jest.fn(async (key: string) => state.hashes.get(key) ?? {}),
      lrem: jest.fn(async (_key: string, _count: number, value: string) => {
        const index = state.processing.indexOf(value);
        if (index >= 0) {
          state.processing.splice(index, 1);
          return 1;
        }

        const queueIndex = state.queue.indexOf(value);
        if (queueIndex >= 0) {
          state.queue.splice(queueIndex, 1);
          return 1;
        }

        return 0;
      }),
      set: jest.fn(async (key: string, value: string) => {
        if (key === 'certificate-reminder:scan-lock') {
          if (state.lockToken) {
            return null;
          }

          state.lockToken = value;
          return 'OK';
        }

        return 'OK';
      }),
      get: jest.fn(async (key: string) => {
        if (key === 'certificate-reminder:scan-lock') {
          return state.lockToken;
        }

        return null;
      }),
      del: jest.fn(async (key: string) => {
        if (key === 'certificate-reminder:scan-lock') {
          state.lockToken = null;
          return 1;
        }

        if (state.cronMarkers.delete(key)) {
          return 1;
        }

        return 0;
      }),
      eval: jest.fn(async (script: string, keyCount: number, ...args: string[]) => {
        void keyCount;

        if (script.includes("redis.call('SET'") && script.includes("redis.call('LPUSH'")) {
          const [markerKey, jobKey, queueKey, jobId, ttlSeconds, acceptedAt, jobTtlSeconds, payload] = args as [
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string,
          ];
          void queueKey;
          void jobId;
          void ttlSeconds;
          void acceptedAt;
          void jobTtlSeconds;
          if (state.cronMarkers.has(markerKey)) {
            return 0;
          }

          state.cronMarkers.add(markerKey);
          state.hashes.set(jobKey, {
            jobId,
            source: 'cron',
            status: 'queued',
            acceptedAt,
          });
          state.queue.unshift(payload);
          return 1;
        }

        if (script.includes("redis.call('HSET'") && script.includes("redis.call('LPUSH'")) {
          const [jobKey, queueKey, jobId, source, acceptedAt, ttlSeconds, payload] = args as [
            string,
            string,
            string,
            string,
            string,
            string,
            string,
          ];
          void queueKey;
          void jobId;
          void source;
          void acceptedAt;
          void ttlSeconds;
          state.hashes.set(jobKey, {
            jobId,
            source,
            status: 'queued',
            acceptedAt,
          });
          state.queue.unshift(payload);
          return 1;
        }

        if (script.includes('PEXPIRE')) {
          const [lockKey, token, ttlMs] = args as [string, string, string];
          void ttlMs;
          if (state.rejectNextRenewal) {
            state.rejectNextRenewal = false;
            throw new Error('scan lock renewal failed');
          }
          if (state.failNextRenewal) {
            state.failNextRenewal = false;
            return 0;
          }
          if (lockKey === 'certificate-reminder:scan-lock' && state.lockToken === token) {
            state.lockRenewals += 1;
            return 1;
          }

          return 0;
        }

        const [lockKey, token] = args as [string, string];
        void lockKey;
        if (lockKey === 'certificate-reminder:scan-lock' && state.lockToken === token) {
          state.lockToken = null;
          return 1;
        }

        return 0;
      }),
    };

    return { redis, state };
  }

  it('persists manual accepted jobs in redis and processes them from the queue', async () => {
    const { CertificateReminderJobService } = await import('./certificate-reminder-job.service');

    const engine = {
      runScan: jest.fn(async () => ({ createdCount: 1, sentCount: 1, failedCount: 0 })),
    };
    const clock = {
      now: jest.fn(() => new Date('2026-03-28T01:00:00.000Z')),
      today: jest.fn(() => '2026-03-28'),
    };
    const { redis, state } = createRedisMock();

    const service = new CertificateReminderJobService(redis as never, engine as never, clock as never);
    const result = await service.enqueueScan({ source: 'manual' });

    expect(result.jobId).toEqual(expect.any(String));
    expect(result.acceptedAt).toBe('2026-03-28T01:00:00.000Z');
    expect(state.queue).toHaveLength(1);

    await (service as any).processQueueOnce();

    expect(engine.runScan).toHaveBeenCalledWith(
      expect.objectContaining({
        jobId: result.jobId,
        source: 'manual',
      }),
      expect.objectContaining({
        isLeaseValid: expect.any(Function),
      }),
    );

    const jobRecord = state.hashes.get(`certificate-reminder:job:${result.jobId}`);
    expect(jobRecord).toEqual(
      expect.objectContaining({
        status: 'completed',
        createdCount: '1',
        sentCount: '1',
        failedCount: '0',
      }),
    );
    expect(state.queue).toHaveLength(0);
    expect(state.processing).toHaveLength(0);
  });

  it('does not leave an orphaned queued job when atomic enqueue fails', async () => {
    const { CertificateReminderJobService } = await import('./certificate-reminder-job.service');

    const engine = {
      runScan: jest.fn(async () => ({ createdCount: 0, sentCount: 0, failedCount: 0 })),
    };
    const clock = {
      now: jest.fn(() => new Date('2026-03-28T01:00:00.000Z')),
      today: jest.fn(() => '2026-03-28'),
    };
    const { redis, state } = createRedisMock();
    redis.eval.mockRejectedValueOnce(new Error('atomic enqueue failed'));

    const service = new CertificateReminderJobService(redis as never, engine as never, clock as never);

    await expect(service.enqueueScan({ source: 'manual' })).rejects.toThrow('atomic enqueue failed');
    expect(state.queue).toHaveLength(0);
    expect(state.hashes.size).toBe(0);
  });

  it('enqueues cron jobs only once per Shanghai five-minute bucket', async () => {
    const { CertificateReminderJobService } = await import('./certificate-reminder-job.service');

    const engine = {
      runScan: jest.fn(async () => ({ createdCount: 0, sentCount: 0, failedCount: 0 })),
    };
    let now = new Date('2026-03-28T01:00:00.000Z');
    const clock = {
      now: jest.fn(() => now),
      today: jest.fn(() => '2026-03-28'),
    };
    const { redis, state } = createRedisMock();

    const service = new CertificateReminderJobService(redis as never, engine as never, clock as never);
    const first = await service.enqueueCronScan();
    const second = await service.enqueueCronScan();

    expect(first).not.toBeNull();
    expect(second).toBeNull();
    expect(state.queue).toHaveLength(1);

    now = new Date('2026-03-28T01:05:00.000Z');
    const nextBucket = await service.enqueueCronScan();
    expect(nextBucket).not.toBeNull();
    expect(state.queue).toHaveLength(2);

    await (service as any).processQueueOnce();
    expect(engine.runScan).toHaveBeenCalledTimes(1);
    expect(engine.runScan).toHaveBeenCalledWith(
      expect.objectContaining({
        jobId: first!.jobId,
        source: 'cron',
      }),
      expect.objectContaining({
        isLeaseValid: expect.any(Function),
      }),
    );
  });

  it('does not overlap scan execution when the redis lock is already held', async () => {
    const { CertificateReminderJobService } = await import('./certificate-reminder-job.service');

    const engine = {
      runScan: jest.fn(async () => ({ createdCount: 1, sentCount: 1, failedCount: 0 })),
    };
    const clock = {
      now: jest.fn(() => new Date('2026-03-28T01:00:00.000Z')),
      today: jest.fn(() => '2026-03-28'),
    };
    const { redis, state } = createRedisMock();
    state.lockToken = 'held-by-other-worker';

    const service = new CertificateReminderJobService(redis as never, engine as never, clock as never);
    await service.enqueueScan({ source: 'manual' });

    const processed = await (service as any).processQueueOnce();

    expect(processed).toBe(false);
    expect(engine.runScan).not.toHaveBeenCalled();
    expect(state.queue).toHaveLength(1);
    expect(state.processing).toHaveLength(0);
  });

  it('renews the redis scan lock while a job is still running', async () => {
    jest.useFakeTimers();

    const { CertificateReminderJobService } = await import('./certificate-reminder-job.service');

    let resolveRun: (() => void) | null = null;
    const engine = {
      runScan: jest.fn(
        async () =>
          new Promise<{ createdCount: number; sentCount: number; failedCount: number }>((resolve) => {
            resolveRun = () => resolve({ createdCount: 1, sentCount: 1, failedCount: 0 });
          }),
      ),
    };
    const clock = {
      now: jest.fn(() => new Date('2026-03-28T01:00:00.000Z')),
      today: jest.fn(() => '2026-03-28'),
    };
    const { redis, state } = createRedisMock();

    const service = new CertificateReminderJobService(redis as never, engine as never, clock as never);
    await service.enqueueScan({ source: 'manual' });

    const processing = (service as any).processQueueOnce();

    await jest.advanceTimersByTimeAsync(5 * 60 * 1000);
    expect(state.lockRenewals).toBeGreaterThan(0);

    (resolveRun as unknown as () => void)();
    await processing;

    expect(state.lockToken).toBeNull();
    jest.useRealTimers();
  });

  it('requeues a lease-lost job instead of failing it permanently', async () => {
    jest.useFakeTimers();

    const { CertificateReminderJobService } = await import('./certificate-reminder-job.service');

    let now = new Date('2026-03-28T01:00:00.000Z');
    const engine = {
      runScan: jest.fn(async (_envelope: unknown, options?: { isLeaseValid?: () => boolean }) => {
        await jest.advanceTimersByTimeAsync(5 * 60 * 1000);
        expect(options?.isLeaseValid?.()).toBe(false);
        throw new Error('scan lock lost');
      }),
    };
    const clock = {
      now: jest.fn(() => now),
      today: jest.fn(() => '2026-03-28'),
    };
    const { redis, state } = createRedisMock();
    state.failNextRenewal = true;

    const service = new CertificateReminderJobService(redis as never, engine as never, clock as never);
    jest.spyOn((service as unknown as { logger: { warn: (message: string) => void } }).logger, 'warn').mockImplementation(() => undefined);
    const enqueueResult = await service.enqueueScan({ source: 'manual' });

    const processing = (service as any).processQueueOnce();
    await processing;

    const jobRecord = state.hashes.get(`certificate-reminder:job:${enqueueResult.jobId}`);
    expect(jobRecord).toEqual(
      expect.objectContaining({
        status: 'retryable',
        abortReason: 'lease_lost',
        retryCount: '1',
        nextRetryAt: expect.any(String),
      }),
    );

    now = new Date('2026-03-28T01:00:02.000Z');
    await (service as any).recoverStalledJobs();

    expect(state.processing).toHaveLength(0);
    expect(state.queue).toHaveLength(1);
    jest.useRealTimers();
  });

  it('treats a rejected lock renewal as lease loss and requeues the job', async () => {
    jest.useFakeTimers();

    const { CertificateReminderJobService } = await import('./certificate-reminder-job.service');

    let now = new Date('2026-03-28T01:00:00.000Z');
    const engine = {
      runScan: jest.fn(async (_envelope: unknown, options?: { isLeaseValid?: () => boolean }) => {
        await jest.advanceTimersByTimeAsync(5 * 60 * 1000);
        expect(options?.isLeaseValid?.()).toBe(false);
        throw new Error('scan lock lost');
      }),
    };
    const clock = {
      now: jest.fn(() => now),
      today: jest.fn(() => '2026-03-28'),
    };
    const { redis, state } = createRedisMock();
    state.rejectNextRenewal = true;

    const service = new CertificateReminderJobService(redis as never, engine as never, clock as never);
    jest.spyOn((service as unknown as { logger: { warn: (message: string) => void } }).logger, 'warn').mockImplementation(() => undefined);
    const enqueueResult = await service.enqueueScan({ source: 'manual' });

    const processing = (service as any).processQueueOnce();
    await processing;

    const jobRecord = state.hashes.get(`certificate-reminder:job:${enqueueResult.jobId}`);
    expect(jobRecord).toEqual(
      expect.objectContaining({
        status: 'retryable',
        abortReason: 'lease_lost',
        retryCount: '1',
        nextRetryAt: expect.any(String),
      }),
    );

    now = new Date('2026-03-28T01:00:02.000Z');
    await (service as any).recoverStalledJobs();

    expect(state.processing).toHaveLength(0);
    expect(state.queue).toHaveLength(1);
    jest.useRealTimers();
  });

  it('reclaims stale processing jobs on a later worker tick without restarting the worker', async () => {
    const { CertificateReminderJobService } = await import('./certificate-reminder-job.service');

    const engine = {
      runScan: jest.fn(async () => ({ createdCount: 1, sentCount: 1, failedCount: 0 })),
    };
    const clock = {
      now: jest.fn(() => new Date('2026-03-28T00:10:00.000Z')),
      today: jest.fn(() => '2026-03-28'),
    };
    const { redis, state } = createRedisMock();
    const service = new CertificateReminderJobService(redis as never, engine as never, clock as never);

    const payload = JSON.stringify({ jobId: 'stale-job', source: 'manual' });
    state.processing.push(payload);
    state.hashes.set('certificate-reminder:job:stale-job', {
      jobId: 'stale-job',
      source: 'manual',
      status: 'running',
      acceptedAt: '2026-03-28T00:00:00.000Z',
      startedAt: '2026-03-28T00:00:00.000Z',
      heartbeatAt: '2026-03-28T00:00:00.000Z',
    });

    await (service as any).recoverStalledJobs();

    expect(state.processing).toHaveLength(0);
    expect(state.queue).toHaveLength(1);

    await (service as any).processQueueOnce();

    expect(engine.runScan).toHaveBeenCalledWith(
      expect.objectContaining({
        jobId: 'stale-job',
        source: 'manual',
      }),
      expect.objectContaining({
        isLeaseValid: expect.any(Function),
      }),
    );
  });

  it('keeps a fresh processing job in place during recovery ticks', async () => {
    const { CertificateReminderJobService } = await import('./certificate-reminder-job.service');

    const engine = {
      runScan: jest.fn(async () => ({ createdCount: 1, sentCount: 1, failedCount: 0 })),
    };
    const clock = {
      now: jest.fn(() => new Date('2026-03-28T00:01:00.000Z')),
      today: jest.fn(() => '2026-03-28'),
    };
    const { redis, state } = createRedisMock();
    const service = new CertificateReminderJobService(redis as never, engine as never, clock as never);

    const payload = JSON.stringify({ jobId: 'fresh-job', source: 'manual' });
    state.processing.push(payload);
    state.hashes.set('certificate-reminder:job:fresh-job', {
      jobId: 'fresh-job',
      source: 'manual',
      status: 'running',
      acceptedAt: '2026-03-28T00:00:00.000Z',
      startedAt: '2026-03-28T00:00:30.000Z',
      heartbeatAt: '2026-03-28T00:01:00.000Z',
    });

    await (service as any).recoverStalledJobs();

    expect(state.processing).toHaveLength(1);
    expect(state.queue).toHaveLength(0);
    expect(engine.runScan).not.toHaveBeenCalled();
  });
});
