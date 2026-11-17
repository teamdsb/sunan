import { UnauthorizedException } from '@nestjs/common';
import { appEnv } from 'src/config/env';

import { WecomTokenService } from 'src/modules/wecom/wecom-token.service';

describe('WecomTokenService', () => {
  const createRedisMock = () => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    eval: jest.fn(),
  });

  const createGatewayMock = () => ({
    getAccessToken: jest.fn(),
    getCorpJsapiTicket: jest.fn(),
    getAgentJsapiTicket: jest.fn(),
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('returns cached access token on cache hit', async () => {
    const redis = createRedisMock();
    const gateway = createGatewayMock();
    redis.get.mockResolvedValue('cached-token');

    const service = new WecomTokenService(redis as never, gateway as never);

    await expect(service.getAccessToken()).resolves.toBe('cached-token');
    expect(gateway.getAccessToken).not.toHaveBeenCalled();
  });

  it('refreshes and caches access token on cache miss', async () => {
    const redis = createRedisMock();
    const gateway = createGatewayMock();
    redis.get.mockResolvedValue(null);
    redis.set.mockResolvedValue('OK');
    gateway.getAccessToken.mockResolvedValue({ access_token: 'fresh-token' });

    const service = new WecomTokenService(redis as never, gateway as never);

    await expect(service.getAccessToken()).resolves.toBe('fresh-token');
    expect(redis.set).toHaveBeenCalledWith(
      `wecom:app:${appEnv.WECOM_CORP_ID}:${appEnv.WECOM_AGENT_ID}:v0:access_token`,
      'fresh-token',
      'EX',
      7000,
    );
  });

  it('waits for competing refresh to populate redis', async () => {
    jest.useFakeTimers();
    const redis = createRedisMock();
    const gateway = createGatewayMock();
    redis.get
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce('contended-token');
    redis.set.mockResolvedValue(null);

    const service = new WecomTokenService(redis as never, gateway as never);
    const promise = service.getAccessToken();

    await jest.advanceTimersByTimeAsync(1000);

    await expect(promise).resolves.toBe('contended-token');
    expect(gateway.getAccessToken).not.toHaveBeenCalled();
  });

  it('falls back to direct upstream call when redis fails', async () => {
    const redis = createRedisMock();
    const gateway = createGatewayMock();
    redis.get.mockRejectedValue(new Error('redis down'));
    gateway.getAccessToken.mockResolvedValue({ access_token: 'degraded-token' });

    const service = new WecomTokenService(redis as never, gateway as never);
    jest.spyOn((service as unknown as { logger: { warn: (message: string) => void } }).logger, 'warn').mockImplementation(() => undefined);

    await expect(service.getAccessToken()).resolves.toBe('degraded-token');
  });

  it('clears token and retries once when wecom returns 42001', async () => {
    const redis = createRedisMock();
    const gateway = createGatewayMock();
    redis.get.mockResolvedValue(null);
    redis.set.mockResolvedValue('OK');
    gateway.getAccessToken
      .mockRejectedValueOnce(new UnauthorizedException())
      .mockResolvedValueOnce({ access_token: 'retry-token' });

    const service = new WecomTokenService(redis as never, gateway as never);

    await expect(service.getAccessToken()).resolves.toBe('retry-token');
    expect(redis.del).toHaveBeenCalledWith(`wecom:app:${appEnv.WECOM_CORP_ID}:${appEnv.WECOM_AGENT_ID}:v0:access_token`);
  });

  it('isolates notification token and refresh locks by application and config version', async () => {
    const redis = createRedisMock();
    const gateway = createGatewayMock();
    redis.get.mockResolvedValue(null);
    redis.set.mockResolvedValue('OK');
    gateway.getAccessToken
      .mockResolvedValueOnce({ access_token: 'v7-token' })
      .mockResolvedValueOnce({ access_token: 'v8-token' });
    const service = new WecomTokenService(redis as never, gateway as never);

    const base = { corpId: 'corp-x', agentId: 'agent-y', secret: 'never-in-key', source: 'admin_override' as const };
    await expect(service.getAccessTokenForApp({ ...base, version: 7 })).resolves.toBe('v7-token');
    await expect(service.getAccessTokenForApp({ ...base, version: 8 })).resolves.toBe('v8-token');

    expect(redis.get).toHaveBeenNthCalledWith(1, 'wecom:app:corp-x:agent-y:v7:access_token');
    expect(redis.get).toHaveBeenNthCalledWith(2, 'wecom:app:corp-x:agent-y:v8:access_token');
    const setCalls = redis.set.mock.calls as unknown as Array<[string, string, ...unknown[]]>;
    const lockKeys = setCalls.filter((call) => call[0].includes('refresh_lock')).map((call) => call[0]);
    expect(lockKeys).toEqual([
      'wecom:refresh_lock:app:corp-x:agent-y:v7:access_token',
      'wecom:refresh_lock:app:corp-x:agent-y:v8:access_token',
    ]);
    expect(lockKeys.join('|')).not.toContain(base.secret);
  });
});
