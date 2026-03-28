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

        if (script.includes('LPUSH')) {
          const [markerKey, queueKey, jobId, ttlSeconds, payload] = args as [string, string, string, string, string];
          void queueKey;
          void jobId;
          void ttlSeconds;
          if (state.cronMarkers.has(markerKey)) {
            return 0;
          }

          state.cronMarkers.add(markerKey);
          state.queue.unshift(payload);
          return 1;
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

  it('enqueues cron jobs only once per Shanghai day', async () => {
    const { CertificateReminderJobService } = await import('./certificate-reminder-job.service');

    const engine = {
      runScan: jest.fn(async () => ({ createdCount: 0, sentCount: 0, failedCount: 0 })),
    };
    const clock = {
      now: jest.fn(() => new Date('2026-03-28T01:00:00.000Z')),
      today: jest.fn(() => '2026-03-28'),
    };
    const { redis, state } = createRedisMock();

    const service = new CertificateReminderJobService(redis as never, engine as never, clock as never);
    const first = await service.enqueueCronScan();
    const second = await service.enqueueCronScan();

    expect(first).not.toBeNull();
    expect(second).toBeNull();
    expect(state.queue).toHaveLength(1);

    await (service as any).processQueueOnce();
    expect(engine.runScan).toHaveBeenCalledTimes(1);
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
});
