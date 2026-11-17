import Redis from 'ioredis';
import { Test } from '@nestjs/testing';
import { once } from 'node:events';
import { createServer, type AddressInfo } from 'node:net';
import { GenericContainer, type StartedTestContainer } from 'testcontainers';

import { WecomTokenService } from 'src/modules/wecom/wecom-token.service';
import type { WecomAppConfig } from 'src/modules/wecom/wecom-notification-config.service';
import { WecomRedisClient } from 'src/modules/wecom/wecom-redis.client';
import { REDIS_CLIENT } from 'src/modules/wecom/wecom.constants';

describe('M9 Wave 4 shared Redis token isolation', () => {
  let container: StartedTestContainer;
  let firstRedis: Redis;
  let secondRedis: Redis;
  const base: WecomAppConfig = { corpId: 'corp-a', agentId: '2000001', secret: 'secret-a', source: 'admin_override', version: 1 };

  beforeAll(async () => {
    container = await new GenericContainer('redis:7-alpine').withExposedPorts(6379).start();
    firstRedis = new Redis({ host: container.getHost(), port: container.getMappedPort(6379) });
    secondRedis = new Redis({ host: container.getHost(), port: container.getMappedPort(6379) });
    await Promise.all([firstRedis.ping(), secondRedis.ping()]);
  });

  beforeEach(async () => { await firstRedis.flushdb(); });
  afterAll(async () => {
    await Promise.all([firstRedis?.quit(), secondRedis?.quit()]);
    await container?.stop();
  });

  it('refreshes once across instances and isolates corp, app, version and unsaved drafts', async () => {
    const gateway = { getAccessToken: jest.fn(async (corpId: string, secret: string) => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      return { access_token: `${corpId}:${secret}` };
    }) };
    const first = new WecomTokenService(firstRedis, gateway as never);
    const second = new WecomTokenService(secondRedis, gateway as never);
    expect(await Promise.all([first.getAccessTokenForApp(base), second.getAccessTokenForApp(base)])).toEqual(['corp-a:secret-a', 'corp-a:secret-a']);
    expect(gateway.getAccessToken).toHaveBeenCalledTimes(1);
    const variants: WecomAppConfig[] = [
      { ...base, corpId: 'corp-b', secret: 'secret-b' },
      { ...base, agentId: '2000002', secret: 'secret-c' },
      { ...base, version: 2, secret: 'secret-d' },
      { ...base, cacheKey: 'draft-1', source: 'test_draft', secret: 'draft-secret-1' },
      { ...base, cacheKey: 'draft-2', source: 'test_draft', secret: 'draft-secret-2' },
    ];
    for (const config of variants) expect(await second.getAccessTokenForApp(config)).toBe(`${config.corpId}:${config.secret}`);
    await second.forceRefreshForApp({ ...base, version: 2, secret: 'secret-d' });
    expect(await first.getAccessTokenForApp(base)).toBe('corp-a:secret-a');
    expect(gateway.getAccessToken).toHaveBeenCalledTimes(6);
    const keys = await firstRedis.keys('wecom:*');
    expect(keys).toHaveLength(5);
    expect(keys.join('|')).not.toContain('secret');
  });

  it('does not release a lock now owned by another instance', async () => {
    let signalStarted!: () => void;
    let finishRefresh!: () => void;
    const started = new Promise<void>((resolve) => { signalStarted = resolve; });
    const finished = new Promise<void>((resolve) => { finishRefresh = resolve; });
    const gateway = { getAccessToken: async () => { signalStarted(); await finished; return { access_token: 'token' }; } };
    const service = new WecomTokenService(firstRedis, gateway as never);
    const refreshing = service.getAccessTokenForApp(base);
    await started;
    const lock = 'wecom:refresh_lock:app:corp-a:2000001:v1:access_token';
    await secondRedis.set(lock, 'new-instance-owner', 'EX', 30);
    finishRefresh();
    expect(await refreshing).toBe('token');
    expect(await secondRedis.get(lock)).toBe('new-instance-owner');
  });

  it('closes the managed Redis connection when Nest shuts down', async () => {
    const client = new WecomRedisClient({ host: container.getHost(), port: container.getMappedPort(6379), lazyConnect: true });
    const moduleRef = await Test.createTestingModule({ providers: [{ provide: REDIS_CLIENT, useValue: client }] }).compile();
    try {
      await moduleRef.init();
      expect(await client.ping()).toBe('PONG');
      const ended = once(client, 'end');
      await moduleRef.close();
      await ended;
      expect(client.status).toBe('end');
    } finally {
      if (client.status !== 'end') client.disconnect();
    }
  });

  it('cancels a pending Redis reconnect when Nest shuts down', async () => {
    const server = createServer((socket) => socket.destroy());
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const retryStrategy = jest.fn(() => 100);
    const client = new WecomRedisClient({ host: '127.0.0.1', port: (server.address() as AddressInfo).port, lazyConnect: true, retryStrategy, disconnectTimeout: 1 });
    const moduleRef = await Test.createTestingModule({ providers: [{ provide: REDIS_CLIENT, useValue: client }] }).compile();
    client.on('error', () => undefined);
    try {
      await moduleRef.init();
      const reconnecting = new Promise<void>((resolve) => client.once('reconnecting', () => resolve()));
      void client.connect().catch(() => undefined);
      await reconnecting;
      await moduleRef.close();
      const retries = retryStrategy.mock.calls.length;
      await new Promise((resolve) => setTimeout(resolve, 200));
      expect(retryStrategy).toHaveBeenCalledTimes(retries);
    } finally {
      client.disconnect();
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });
});
