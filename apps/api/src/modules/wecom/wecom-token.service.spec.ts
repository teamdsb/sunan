import { UnauthorizedException } from '@nestjs/common';

import { WecomTokenService } from 'src/modules/wecom/wecom-token.service';

describe('WecomTokenService', () => {
  const createRedisMock = () => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
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
      'wecom:access_token',
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
    expect(redis.del).toHaveBeenCalledWith('wecom:access_token');
  });
});
