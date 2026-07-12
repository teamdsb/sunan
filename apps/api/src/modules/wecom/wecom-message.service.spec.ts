import { HttpService } from '@nestjs/axios';
import { Logger } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { WecomMessageService } from './wecom-message.service';

describe('WecomMessageService', () => {
  const postMock = jest.fn();
  const getAccessTokenMock = jest.fn();
  const forceRefreshMock = jest.fn();

  const httpServiceMock = {
    post: postMock,
  } as unknown as HttpService;

  const tokenServiceMock = {
    getAccessToken: getAccessTokenMock,
    forceRefresh: forceRefreshMock,
  };

  let service: WecomMessageService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    service = new WecomMessageService(httpServiceMock, tokenServiceMock as never);
    jest.spyOn(global, 'setTimeout').mockImplementation(((fn: (...args: unknown[]) => void) => {
      fn();
      return 0 as unknown as NodeJS.Timeout;
    }) as typeof setTimeout);
    getAccessTokenMock.mockResolvedValue('token-1');
    forceRefreshMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sends text card and collects invalid users', async () => {
    postMock.mockReturnValue(of({ data: { errcode: 0, errmsg: 'ok', invaliduser: 'u3' } }));
    const result = await service.sendTextCard({ userIds: ['u1', 'u2'], title: 't', description: 'd', url: 'https://example.com' });

    expect(result.success).toBe(true);
    expect(result.invalidUser).toEqual(['u3']);
    expect(result.errcode).toBe(0);
  });

  it('refreshes token on token-expired response', async () => {
    postMock
      .mockReturnValueOnce(of({ data: { errcode: 42001, errmsg: 'expired' } }))
      .mockReturnValueOnce(of({ data: { errcode: 0, errmsg: 'ok' } }));

    await service.sendTextCard({ userIds: ['u1'], title: 't', description: 'd', url: 'https://example.com' });
    expect(forceRefreshMock).toHaveBeenCalledWith('access_token');
    expect(postMock).toHaveBeenCalledTimes(2);
  });

  it('retries on timeout', async () => {
    postMock
      .mockReturnValueOnce(throwError(() => ({ code: 'ECONNABORTED' })))
      .mockReturnValueOnce(of({ data: { errcode: 0, errmsg: 'ok' } }));

    await service.sendTextCard({ userIds: ['u1'], title: 't', description: 'd', url: 'https://example.com' });
    expect(postMock).toHaveBeenCalledTimes(2);
  });

  it('returns invalid users for non-zero errcode without retrying', async () => {
    postMock.mockReturnValue(of({ data: { errcode: 81013, errmsg: 'invalid user', invaliduser: 'u2|u3' } }));
    const result = await service.sendTextCard({ userIds: ['u1', 'u2', 'u3'], title: 't', description: 'd', url: 'https://example.com' });
    expect(result.success).toBe(false);
    expect(result.invalidUser).toEqual(['u2', 'u3']);
    expect(result.failureReason).toBe('WeCom API error 81013: invalid user');
    expect(result.errcode).toBe(81013);
    expect(postMock).toHaveBeenCalledTimes(1);
  });

  it('throws after timeout retries exhausted', async () => {
    postMock
      .mockReturnValueOnce(throwError(() => ({ code: 'ECONNABORTED' })))
      .mockReturnValueOnce(throwError(() => ({ code: 'ECONNABORTED' })))
      .mockReturnValueOnce(throwError(() => ({ code: 'ECONNABORTED' })));

    await expect(
      service.sendTextCard({ userIds: ['u1'], title: 't', description: 'd', url: 'https://example.com' }),
    ).rejects.toBeDefined();
    expect(postMock).toHaveBeenCalledTimes(3);
  });
});
