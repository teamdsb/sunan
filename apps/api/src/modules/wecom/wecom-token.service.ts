import {
  HttpException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import Redis from 'ioredis';
import { randomUUID } from 'crypto';

import { appEnv } from 'src/config/env';
import {
  REDIS_CLIENT,
  REFRESH_LOCK_TTL_SECONDS,
  REFRESH_RETRY_COUNT,
  REFRESH_RETRY_DELAY_MS,
  TOKEN_TTL_SECONDS,
} from 'src/modules/wecom/wecom.constants';
import { WecomHttpGateway } from 'src/modules/wecom/wecom-http.gateway';
import type { WecomAppConfig } from 'src/modules/wecom/wecom-notification-config.service';

type TokenType = 'access_token' | 'corp_ticket' | 'agent_ticket';

@Injectable()
export class WecomTokenService {
  private readonly logger = new Logger(WecomTokenService.name);

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly gateway: WecomHttpGateway,
  ) {}

  async getAccessToken(): Promise<string> {
    return this.getAccessTokenForApp({
      corpId: appEnv.WECOM_CORP_ID,
      agentId: appEnv.WECOM_AGENT_ID,
      secret: appEnv.WECOM_AGENT_SECRET,
      source: 'env_main',
      version: 0,
    });
  }

  async getAccessTokenForApp(config: WecomAppConfig): Promise<string> {
    return this.getOrRefreshToken(this.accessTokenKey(config), this.lockKey(config), async () => {
      const response = await this.gateway.getAccessToken(
        config.corpId,
        config.secret,
      );
      return response.access_token;
    });
  }

  async getCorpJsapiTicket(): Promise<string> {
    return this.getOrRefreshToken(
      'wecom:corp_jsapi_ticket',
      'corp_ticket',
      async () => {
        const accessToken = await this.getAccessToken();
        const response = await this.gateway.getCorpJsapiTicket(accessToken);
        return response.ticket;
      },
    );
  }

  async getAgentJsapiTicket(agentId: string): Promise<string> {
    return this.getOrRefreshToken(
      `wecom:agent_jsapi_ticket:${agentId}`,
      'agent_ticket',
      async () => {
        const accessToken = await this.getAccessToken();
        const response = await this.gateway.getAgentJsapiTicket(accessToken);
        return response.ticket;
      },
    );
  }

  async forceRefresh(tokenType: TokenType): Promise<void> {
    if (tokenType === 'access_token') {
      await this.redis.del(this.accessTokenKey({ corpId: appEnv.WECOM_CORP_ID, agentId: appEnv.WECOM_AGENT_ID, secret: appEnv.WECOM_AGENT_SECRET, source: 'env_main', version: 0 }));
      return;
    }

    if (tokenType === 'corp_ticket') {
      await this.redis.del('wecom:corp_jsapi_ticket');
      return;
    }

    await this.redis.del(`wecom:agent_jsapi_ticket:${appEnv.WECOM_AGENT_ID}`);
  }

  async forceRefreshForApp(config: WecomAppConfig): Promise<void> {
    await this.redis.del(this.accessTokenKey(config));
  }

  private async getOrRefreshToken(
    key: string,
    lockSuffix: string,
    refresh: () => Promise<string>,
  ): Promise<string> {
    try {
      const cachedValue = await this.redis.get(key);
      if (cachedValue) {
        return cachedValue;
      }

      const lockKey = lockSuffix.startsWith('wecom:refresh_lock:') ? lockSuffix : `wecom:refresh_lock:${lockSuffix}`;
      const lockToken = randomUUID();
      const lockAcquired = await this.redis.set(
        lockKey,
        lockToken,
        'EX',
        REFRESH_LOCK_TTL_SECONDS,
        'NX',
      );

      if (lockAcquired) {
        try {
          const refreshed = await refresh();
          await this.redis.set(key, refreshed, 'EX', TOKEN_TTL_SECONDS);
          return refreshed;
        } finally {
          await this.redis.eval("if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end", 1, lockKey, lockToken);
        }
      }

      for (let attempt = 0; attempt < REFRESH_RETRY_COUNT; attempt += 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, REFRESH_RETRY_DELAY_MS),
        );
        const retryValue = await this.redis.get(key);
        if (retryValue) {
          return retryValue;
        }
      }

      throw new ServiceUnavailableException('WeCom token refresh contention failed');
    } catch (error) {
      if (error instanceof HttpException) {
        if (error.getStatus() === 401) {
          await this.redis.del(key);
          const refreshed = await refresh();
          await this.redis.set(key, refreshed, 'EX', TOKEN_TTL_SECONDS);
          return refreshed;
        }

        throw error;
      }

      this.logger.warn('Redis unavailable, entering degraded token mode');
      return refresh();
    }
  }

  private accessTokenKey(config: WecomAppConfig): string {
    if (config.cacheKey) return `wecom:app:${config.corpId}:${config.agentId}:draft:${config.cacheKey}:access_token`;
    return `wecom:app:${config.corpId}:${config.agentId}:v${config.version}:access_token`;
  }

  private lockKey(config: WecomAppConfig): string {
    if (config.cacheKey) return `wecom:refresh_lock:app:${config.corpId}:${config.agentId}:draft:${config.cacheKey}:access_token`;
    return `wecom:refresh_lock:app:${config.corpId}:${config.agentId}:v${config.version}:access_token`;
  }
}
