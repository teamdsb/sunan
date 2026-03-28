describe('CertificateReminderJobService', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('queues an async scan job in redis and returns a job id and accepted timestamp', async () => {
    const { CertificateReminderJobService } = await import('./certificate-reminder-job.service');

    const engine = {
      runScan: jest.fn(async () => ({ createdCount: 0, sentCount: 0, failedCount: 0 })),
    };
    const redis = {
      hset: jest.fn(async () => 1),
      hgetall: jest.fn(async () => ({})),
      expire: jest.fn(async () => 1),
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };
    const clock = {
      now: jest.fn(() => new Date('2026-03-28T01:00:00.000Z')),
    };
    const timer = jest.spyOn(global, 'setTimeout');

    const service = new CertificateReminderJobService(redis as never, engine as never, clock as never);
    const result = await service.enqueueScan({ source: 'manual' });

    expect(result.jobId).toEqual(expect.any(String));
    expect(result.acceptedAt).toBe('2026-03-28T01:00:00.000Z');
    expect(redis.hset).toHaveBeenCalledWith(
      expect.stringContaining('certificate-reminder:job:'),
      expect.objectContaining({ status: 'queued', source: 'manual' }),
    );
    expect(timer).toHaveBeenCalled();

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(engine.runScan).toHaveBeenCalledWith(
      expect.objectContaining({
        jobId: result.jobId,
        source: 'manual',
      }),
    );
  });
});
