import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { firstValueFrom } from 'rxjs';
import { DataSource, Repository } from 'typeorm';

import { WecomMessageDeliveryEntity } from 'src/database/entities/wecom-message-delivery.entity';
import { WecomNotificationConfigService, type WecomAppConfig } from './wecom-notification-config.service';
import { WecomTokenService } from './wecom-token.service';

export interface SendTextCardOptions {
  userIds: string[];
  title: string;
  description: string;
  url: string;
  btnText?: string;
  sourceType?: string;
  sourceId?: string;
  dedupeKey?: string;
  config?: WecomAppConfig;
}

export interface SendTextCardResult {
  success: boolean;
  invalidUser: string[];
  errcode?: number;
  failureReason?: string;
  uncertain?: boolean;
  inFlight?: boolean;
  configSource?: WecomAppConfig['source'];
  configVersion?: number;
  agentId?: string;
}

type WecomResponse = { errcode: number; errmsg: string; invaliduser?: string };
type ConfigSnapshot = { agentId: string | null; source: WecomMessageDeliveryEntity['configSource']; version: number | null };

@Injectable()
export class WecomMessageService {
  private readonly logger = new Logger(WecomMessageService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly tokenService: WecomTokenService,
    private readonly configService?: WecomNotificationConfigService,
    @InjectRepository(WecomMessageDeliveryEntity)
    private readonly deliveryRepository?: Repository<WecomMessageDeliveryEntity>,
    private readonly dataSource?: DataSource,
  ) {}

  async sendTextCard(options: SendTextCardOptions): Promise<SendTextCardResult> {
    const userIds = [...new Set(options.userIds.map((item) => item.trim()).filter(Boolean))];
    if (!userIds.length) return { success: true, invalidUser: [] };

    const deliveryRows = await this.prepareDeliveries(userIds, options, { agentId: null, source: 'unresolved', version: null });
    const pendingUserIds = deliveryRows.filter((row) => !row.existingTerminal).map((row) => row.userId);
    const blockedUncertain = deliveryRows.some((row) => row.existingStatus === 'uncertain' || row.existingStatus === 'sending');
    if (!pendingUserIds.length) {
      return {
        success: !blockedUncertain,
        invalidUser: deliveryRows.filter((row) => row.existingStatus === 'skipped').map((row) => row.userId),
        failureReason: blockedUncertain ? '消息结果待人工核对，未自动重试' : undefined,
        uncertain: blockedUncertain,
        inFlight: deliveryRows.some((row) => row.existingStatus === 'sending'),
      };
    }

    let config: WecomAppConfig;
    try {
      if (!options.config && !this.configService) throw new Error('Notification configuration service unavailable');
      config = options.config ?? await this.configService!.resolve();
    } catch {
      const failureReason = '通知应用配置读取或解密失败，请检查推送设置';
      await this.updateDeliveries(deliveryRows, pendingUserIds, { status: 'failed', failureReason, errcode: null });
      return { success: false, invalidUser: [], failureReason };
    }
    for (const row of deliveryRows) {
      if (row.existingTerminal || !row.entity || !this.deliveryRepository) continue;
      row.entity.agentId = config.agentId;
      row.entity.configSource = config.source;
      row.entity.configVersion = config.version;
      await this.deliveryRepository.save(row.entity);
    }
    const result = await this.sendToWecom(pendingUserIds, options, config);
    await this.updateDeliveries(deliveryRows, pendingUserIds, {
      status: result.uncertain ? 'uncertain' : result.success ? 'sent' : 'failed',
      failureReason: result.failureReason ?? null,
      errcode: result.errcode ?? null,
      invalidUser: result.invalidUser,
      agentId: result.agentId,
      configSource: result.configSource,
      configVersion: result.configVersion,
    });
    if (blockedUncertain) { result.uncertain = true; result.success = false; }
    return result;
  }

  private async sendToWecom(userIds: string[], options: SendTextCardOptions, config: WecomAppConfig): Promise<SendTextCardResult> {
    const invalidUser = new Set<string>();
    let accessToken: string;
    try { accessToken = await this.getAccessToken(config); } catch {
      return this.result(false, invalidUser, undefined, '通知应用获取 token 失败，请验证凭据或稍后重试', config);
    }
    let tokenExpiredRetried = false;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const { data } = await firstValueFrom(
          this.httpService.post<WecomResponse>(
            `https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${encodeURIComponent(accessToken)}`,
            {
              touser: userIds.join('|'),
              msgtype: 'textcard',
              agentid: Number(config.agentId),
              textcard: { title: options.title, description: options.description, url: options.url, btntxt: options.btnText ?? '查看详情' },
              safe: 0,
            },
            { timeout: 10_000 },
          ),
        );
        if (data.invaliduser) data.invaliduser.split('|').filter(Boolean).forEach((id) => invalidUser.add(id));
        if (data.errcode === 0) return this.result(true, invalidUser, data.errcode, undefined, config);
        if (data.errcode === 42001) {
          if (tokenExpiredRetried) return this.result(false, invalidUser, data.errcode, 'WeCom API rejected the refreshed token', config);
          tokenExpiredRetried = true;
          try {
            await this.forceRefresh(config);
            accessToken = await this.getAccessToken(config);
          } catch {
            return this.result(false, invalidUser, data.errcode, '通知应用刷新 token 失败', config);
          }
          continue;
        }
        const failureReason = `WeCom API error ${data.errcode}`;
        this.logger.warn(`WeCom sendTextCard failed: ${failureReason}`);
        return this.result(false, invalidUser, data.errcode, failureReason, config);
      } catch (error) {
        const axiosLike = error as { response?: { status?: number } };
        const status = axiosLike.response?.status;
        if (status && status >= 400 && status < 500 && status !== 408) {
          return this.result(false, invalidUser, undefined, `WeCom HTTP error ${status}`, config);
        }
        return this.result(false, invalidUser, undefined, 'WeCom API request result is uncertain; manual reconciliation required', config, true);
      }
    }
    return this.result(false, invalidUser, undefined, 'WeCom API request result is uncertain; manual reconciliation required', config, true);
  }

  private async prepareDeliveries(userIds: string[], options: SendTextCardOptions, config: ConfigSnapshot) {
    const rows = [] as Array<{ userId: string; entity?: WecomMessageDeliveryEntity; existingStatus?: string; existingTerminal: boolean }>;
    for (const userId of userIds) {
      const dedupeKey = options.dedupeKey ? `${options.dedupeKey}:${userId}` : `adhoc:${randomUUID()}:${userId}`;
      if (!this.deliveryRepository || !this.dataSource) {
        rows.push({ userId, existingTerminal: false });
        continue;
      }
      const claim = await this.dataSource.transaction(async (manager) => {
        const insertedResult: unknown = await manager.query(
          `INSERT INTO notification_delivery_attempts (source_type, source_id, recipient_user_id, dedupe_key, payload_snapshot, agent_id, config_source, config_version, status, attempt_count, attempt_history) VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,'sending',1,'[]'::jsonb) ON CONFLICT (dedupe_key) DO NOTHING RETURNING id`,
          [options.sourceType ?? 'message', options.sourceId ?? 'adhoc', userId, dedupeKey, JSON.stringify({ title: options.title, description: options.description, url: options.url }), config.agentId, config.source, config.version],
        );
        const inserted = Array.isArray(insertedResult) ? insertedResult : [];
        const repository = manager.getRepository(WecomMessageDeliveryEntity);
        const entity = await repository.findOne({ where: { dedupeKey }, lock: { mode: 'pessimistic_write' } });
        if (!entity) throw new Error('Notification delivery claim failed');
        if (!inserted.length && entity.status !== 'failed') {
          return { entity, status: entity.status, terminal: true };
        }
        if (inserted.length) entity.attemptCount = 1;
        else entity.attemptCount += 1;
        entity.status = 'sending';
        entity.agentId = config.agentId;
        entity.configSource = config.source;
        entity.configVersion = config.version;
        entity.payloadSnapshot = { title: options.title, description: options.description, url: options.url };
        await repository.save(entity);
        return { entity, status: undefined, terminal: false };
      });
      rows.push({ userId, entity: claim.entity, existingStatus: claim.status, existingTerminal: claim.terminal });
    }
    return rows;
  }

  private async updateDeliveries(rows: Array<{ userId: string; entity?: WecomMessageDeliveryEntity; existingStatus?: string; existingTerminal: boolean }>, pendingUserIds: string[], result: { status: WecomMessageDeliveryEntity['status']; failureReason: string | null; errcode: number | null; invalidUser?: string[]; agentId?: string; configSource?: string; configVersion?: number }) {
    if (!this.deliveryRepository) return;
    const invalid = new Set(result.invalidUser ?? []);
    for (const row of rows) {
      if (!pendingUserIds.includes(row.userId) || !row.entity) continue;
      const status = invalid.has(row.userId) ? 'failed' : result.status;
      row.entity.status = status;
      row.entity.wecomErrcode = result.errcode;
      row.entity.failureReason = invalid.has(row.userId) ? 'invalid user' : result.failureReason;
      if (status === 'sent') row.entity.sentAt = new Date();
      row.entity.attemptHistory = [...(row.entity.attemptHistory ?? []), { attempt: row.entity.attemptCount, attemptedAt: new Date().toISOString(), status, agentId: result.agentId ?? row.entity.agentId, configSource: result.configSource ?? row.entity.configSource, configVersion: result.configVersion ?? row.entity.configVersion, wecomErrcode: row.entity.wecomErrcode, failureReason: row.entity.failureReason }];
      await this.deliveryRepository.save(row.entity);
    }
  }

  private result(success: boolean, invalidUser: Set<string>, errcode: number | undefined, failureReason: string | undefined, config: WecomAppConfig, uncertain = false): SendTextCardResult {
    return { success, invalidUser: [...invalidUser], errcode, failureReason, uncertain, configSource: config.source, configVersion: config.version, agentId: config.agentId };
  }

  private getAccessToken(config: WecomAppConfig): Promise<string> {
    if (typeof this.tokenService.getAccessTokenForApp === 'function') return this.tokenService.getAccessTokenForApp(config);
    return this.tokenService.getAccessToken();
  }

  private forceRefresh(config: WecomAppConfig): Promise<void> {
    if (typeof this.tokenService.forceRefreshForApp === 'function') return this.tokenService.forceRefreshForApp(config);
    return this.tokenService.forceRefresh('access_token');
  }
}
