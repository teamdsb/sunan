import Redis from 'ioredis';
import request from 'supertest';
import { GenericContainer, type StartedTestContainer } from 'testcontainers';
import { CertificateReminderJobService } from 'src/modules/reminder/certificate-reminder-job.service';
import { CertificateReminderEngineService } from 'src/modules/reminder/certificate-reminder-engine.service';
import { ReminderClockService } from 'src/modules/reminder/reminder-clock.service';
import { createM9Wave5Rehearsal } from 'test/m9-wave5-rehearsal';

describe('Reminder scan HTTP job roundtrip with real Redis', () => {
  let container: StartedTestContainer;
  let redis: Redis;
  let rehearsal: Awaited<ReturnType<typeof createM9Wave5Rehearsal>>;
  beforeAll(async () => {
    container = await new GenericContainer('redis:7-alpine').withExposedPorts(6379).start();
    redis = new Redis({ host: container.getHost(), port: container.getMappedPort(6379) });
    await redis.ping();
    const jobs = new CertificateReminderJobService(redis, {} as CertificateReminderEngineService, new ReminderClockService());
    // Test queue persistence and HTTP polling deterministically; engine/worker
    // execution has separate database integration and lease recovery tests.
    jest.spyOn(jobs, 'onModuleInit').mockImplementation(() => undefined);
    rehearsal = await createM9Wave5Rehearsal([], { redis, reminderJobService: jobs });
  });
  afterAll(async () => {
    await rehearsal?.close();
    if (redis?.status !== 'end') await redis?.quit();
    await container?.stop();
  });
  it('returns the persisted queued job and an absent result without inventing success', async () => {
    const http = () => request(rehearsal.app.getHttpServer() as Parameters<typeof request>[0]);
    const login = await http().get('/api/v1/auth/wecom/callback?code=admin').expect(200);
    const token = (login.body as { data: { accessToken: string } }).data.accessToken;
    const accepted = await http().post('/api/v1/certificate-reminders/actions/scan').set('Authorization', `Bearer ${token}`).expect(202);
    const job = (accepted.body as { data: { jobId: string; acceptedAt: string } }).data;
    const result = await http().get(`/api/v1/certificate-reminders/actions/scan/${job.jobId}`).set('Authorization', `Bearer ${token}`).expect(200);
    expect((result.body as { data: unknown }).data).toMatchObject({ jobId: job.jobId, acceptedAt: job.acceptedAt, source: 'manual', status: 'queued', createdCount: 0, sentCount: 0 });
    expect(await redis.llen('certificate-reminder:queue')).toBe(1);
    const absent = await http().get('/api/v1/certificate-reminders/actions/scan/not-a-real-job').set('Authorization', `Bearer ${token}`).expect(200);
    expect((absent.body as { data: unknown }).data).toBeNull();
  });
});
