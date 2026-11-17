import {
  ConflictException,
  Injectable,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from 'crypto';
import { DataSource, Repository } from 'typeorm';

import { appEnv } from 'src/config/env';
import { WecomNotificationConfigAuditEntity } from 'src/database/entities/wecom-notification-config-audit.entity';
import { WecomNotificationConfigEntity } from 'src/database/entities/wecom-notification-config.entity';

export interface WecomAppConfig {
  corpId: string;
  agentId: string;
  secret: string;
  source: 'env_main' | 'admin_override' | 'test_draft';
  version: number;
  cacheKey?: string;
}

export interface NotificationConfigView {
  corpId: string;
  mainCorpId: string;
  mainAgentId: string;
  configured: boolean;
  source: 'env_main' | 'admin_override';
  agentId: string;
  configVersion: number;
  secretStored: boolean;
  encryptionKeyAvailable: boolean;
  configurationError: boolean;
  encryptionKeyRotationAvailable: boolean;
  updatedAt: string | null;
}

@Injectable()
export class WecomNotificationConfigService {
  constructor(
    @InjectRepository(WecomNotificationConfigEntity)
    private readonly repository: Repository<WecomNotificationConfigEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async resolve(): Promise<WecomAppConfig> {
    const row = await this.repository.findOne({ where: { corpId: appEnv.WECOM_CORP_ID } });
    if (!row || !row.agentId || !row.secretCiphertext) {
      if (row && (row.agentId || row.secretCiphertext)) {
        throw new ServiceUnavailableException('通知应用配置不完整');
      }
      return this.mainConfig('env_main', row?.configVersion ?? 0);
    }
    return {
      corpId: row.corpId,
      agentId: row.agentId,
      secret: this.decrypt(row.secretCiphertext),
      source: 'admin_override',
      version: row.configVersion,
    };
  }

  async resolveDraft(input: { agentId?: string; secret?: string; clearOverride?: boolean }): Promise<WecomAppConfig> {
    if (input.clearOverride) {
      const row = await this.repository.findOne({ where: { corpId: appEnv.WECOM_CORP_ID } });
      return this.mainConfig('test_draft', row?.configVersion ?? 0);
    }
    const existing = await this.repository.findOne({ where: { corpId: appEnv.WECOM_CORP_ID } });
    const agentId = input.agentId?.trim() || existing?.agentId?.trim();
    if (!agentId && !input.secret?.trim()) {
      if (existing && (existing.agentId || existing.secretCiphertext)) {
        throw new ServiceUnavailableException('通知应用配置不完整');
      }
      return this.mainConfig('test_draft', existing?.configVersion ?? 0);
    }
    if (existing?.agentId && agentId !== existing.agentId && !input.secret?.trim()) {
      throw new UnprocessableEntityException('AgentID 已变更，请重新填写 Secret');
    }
    const secret = input.secret?.trim() || (existing?.secretCiphertext ? this.decrypt(existing.secretCiphertext) : undefined);
    if (!agentId || !secret) throw new UnprocessableEntityException('测试配置必须包含 AgentID 和 Secret');
    return {
      corpId: appEnv.WECOM_CORP_ID,
      agentId,
      secret,
      source: 'test_draft',
      version: existing?.configVersion ?? 0,
      cacheKey: randomUUID(),
    };
  }

  async getView(): Promise<NotificationConfigView> {
    const row = await this.repository.findOne({ where: { corpId: appEnv.WECOM_CORP_ID } });
    const configured = Boolean(row?.agentId && row.secretCiphertext);
    let configurationError = Boolean(row && !configured && (row.agentId || row.secretCiphertext));
    if (configured && row?.secretCiphertext) {
      try {
        this.decrypt(row.secretCiphertext);
      } catch {
        configurationError = true;
      }
    }
    return {
      corpId: appEnv.WECOM_CORP_ID,
      mainCorpId: appEnv.WECOM_CORP_ID,
      mainAgentId: appEnv.WECOM_AGENT_ID,
      configured,
      source: configured || configurationError ? 'admin_override' : 'env_main',
      agentId: row?.agentId ?? appEnv.WECOM_AGENT_ID,
      configVersion: row?.configVersion ?? 0,
      secretStored: Boolean(row?.secretCiphertext),
      encryptionKeyAvailable: Boolean(appEnv.SYSTEM_SETTINGS_ENCRYPTION_KEY?.trim()),
      configurationError,
      encryptionKeyRotationAvailable: this.hasPreviousEncryptionKey(),
      updatedAt: row?.updatedAt?.toISOString() ?? null,
    };
  }

  async save(input: {
    actorUserId: string;
    expectedConfigVersion: number;
    agentId?: string;
    secret?: string;
    clearOverride?: boolean;
  }): Promise<NotificationConfigView> {
    const agentId = input.agentId?.trim() || null;
    const providedSecret = input.secret?.trim() || null;
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(WecomNotificationConfigEntity);
      const auditRepository = manager.getRepository(WecomNotificationConfigAuditEntity);
      let row = await repository.findOne({ where: { corpId: appEnv.WECOM_CORP_ID }, lock: { mode: 'pessimistic_write' } });
      const currentVersion = row?.configVersion ?? 0;
      if (currentVersion !== input.expectedConfigVersion) {
        throw new ConflictException('通知配置已被其他管理员修改，请刷新后重试');
      }

      const before = this.auditSnapshot(row);
      if (input.clearOverride) {
        if (row) {
          row.agentId = null;
          row.secretCiphertext = null;
          row.configVersion = currentVersion + 1;
          row.updatedBy = input.actorUserId;
          row = await repository.save(row);
        } else {
          const insertedResult: unknown = await manager.query(
            `INSERT INTO notification_app_configs (corp_id, config_version, updated_by) VALUES ($1, 1, $2) ON CONFLICT (corp_id) DO NOTHING RETURNING id`,
            [appEnv.WECOM_CORP_ID, input.actorUserId],
          );
          const inserted = Array.isArray(insertedResult) ? insertedResult : [];
          if (!inserted.length) throw new ConflictException('通知配置已被其他管理员修改，请刷新后重试');
          row = await repository.findOneByOrFail({ corpId: appEnv.WECOM_CORP_ID });
        }
        await auditRepository.save(auditRepository.create({
          corpId: appEnv.WECOM_CORP_ID,
          actorUserId: input.actorUserId,
          action: 'clear',
          configVersion: row.configVersion,
          beforeSnapshot: before,
          afterSnapshot: this.auditSnapshot(row),
        }));
        return this.viewFromRow(row);
      }

      if (!agentId) throw new UnprocessableEntityException('AgentID 不能为空；如需回到主应用请明确清除覆盖');
      if (row && Boolean(row.agentId) !== Boolean(row.secretCiphertext) && !providedSecret) {
        throw new UnprocessableEntityException('现有通知覆盖配置不完整，请重新填写 Secret');
      }
      let secretCiphertext = row?.secretCiphertext ?? null;
      if (row?.agentId && row.agentId !== agentId && !providedSecret) {
        throw new UnprocessableEntityException('AgentID 已变更，请重新填写 Secret');
      }
      if (secretCiphertext && !providedSecret) this.decrypt(secretCiphertext);
      if (providedSecret) secretCiphertext = this.encrypt(providedSecret);
      if (!secretCiphertext) throw new UnprocessableEntityException('首次保存必须填写 Secret');
      if (!row) {
        const insertedResult: unknown = await manager.query(
          `INSERT INTO notification_app_configs (corp_id, agent_id, secret_ciphertext, config_version, updated_by) VALUES ($1, $2, $3, 1, $4) ON CONFLICT (corp_id) DO NOTHING RETURNING id`,
          [appEnv.WECOM_CORP_ID, agentId, secretCiphertext, input.actorUserId],
        );
        const inserted = Array.isArray(insertedResult) ? insertedResult : [];
        if (!inserted.length) throw new ConflictException('通知配置已被其他管理员修改，请刷新后重试');
        row = await repository.findOneByOrFail({ corpId: appEnv.WECOM_CORP_ID });
      } else {
        row.agentId = agentId;
        row.secretCiphertext = secretCiphertext;
        row.configVersion = currentVersion + 1;
        row.updatedBy = input.actorUserId;
      }
      row = await repository.save(row);
      await auditRepository.save(auditRepository.create({
        corpId: appEnv.WECOM_CORP_ID,
        actorUserId: input.actorUserId,
        action: 'save',
        configVersion: row.configVersion,
        beforeSnapshot: before,
        afterSnapshot: this.auditSnapshot(row),
      }));
      return this.viewFromRow(row);
    });
  }

  async rotateEncryptionKey(actorUserId: string): Promise<{ rotated: boolean; configVersion: number }> {
    if (!this.hasPreviousEncryptionKey()) {
      throw new UnprocessableEntityException('需要同时配置新的加密主密钥和上一把密钥才能执行轮换');
    }
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(WecomNotificationConfigEntity);
      const auditRepository = manager.getRepository(WecomNotificationConfigAuditEntity);
      const row = await repository.findOne({ where: { corpId: appEnv.WECOM_CORP_ID }, lock: { mode: 'pessimistic_write' } });
      if (row && Boolean(row.agentId) !== Boolean(row.secretCiphertext)) {
        throw new ServiceUnavailableException('通知应用配置不完整');
      }
      if (!row?.secretCiphertext) return { rotated: false, configVersion: row?.configVersion ?? 0 };
      const secret = this.decrypt(row.secretCiphertext);
      if (row.secretCiphertext.startsWith(`v2:${this.currentKeyId()}:`)) {
        return { rotated: false, configVersion: row.configVersion };
      }
      const before = this.auditSnapshot(row);
      row.secretCiphertext = this.encrypt(secret);
      row.configVersion += 1;
      row.updatedBy = actorUserId;
      const saved = await repository.save(row);
      await auditRepository.save(auditRepository.create({
        corpId: appEnv.WECOM_CORP_ID,
        actorUserId,
        action: 'rotate',
        configVersion: saved.configVersion,
        beforeSnapshot: before,
        afterSnapshot: this.auditSnapshot(saved),
      }));
      return { rotated: true, configVersion: saved.configVersion };
    });
  }

  private mainConfig(source: 'env_main' | 'test_draft' = 'env_main', version = 0): WecomAppConfig {
    if (!appEnv.WECOM_CORP_ID?.trim() || !appEnv.WECOM_AGENT_ID?.trim() || !appEnv.WECOM_AGENT_SECRET?.trim()) {
      throw new ServiceUnavailableException('env 主应用配置不完整');
    }
    return {
      corpId: appEnv.WECOM_CORP_ID,
      agentId: appEnv.WECOM_AGENT_ID,
      secret: appEnv.WECOM_AGENT_SECRET,
      source,
      version,
      ...(source === 'test_draft' ? { cacheKey: randomUUID() } : {}),
    };
  }

  private encryptionKey(value = appEnv.SYSTEM_SETTINGS_ENCRYPTION_KEY?.trim()): Buffer {
    if (!value) throw new ServiceUnavailableException('通知配置加密主密钥未配置');
    return createHash('sha256').update(value).digest();
  }

  private encryptionKeyCandidates(): string[] {
    return [appEnv.SYSTEM_SETTINGS_ENCRYPTION_KEY?.trim(), appEnv.SYSTEM_SETTINGS_ENCRYPTION_KEY_PREVIOUS?.trim()].filter(
      (value): value is string => Boolean(value),
    );
  }

  private currentKeyId(): string {
    const value = appEnv.SYSTEM_SETTINGS_ENCRYPTION_KEY?.trim();
    if (!value) throw new ServiceUnavailableException('通知配置加密主密钥未配置');
    return createHash('sha256').update(value).digest('hex').slice(0, 16);
  }

  private hasPreviousEncryptionKey(): boolean {
    const current = appEnv.SYSTEM_SETTINGS_ENCRYPTION_KEY?.trim();
    const previous = appEnv.SYSTEM_SETTINGS_ENCRYPTION_KEY_PREVIOUS?.trim();
    return Boolean(current && previous && current !== previous);
  }

  private encrypt(secret: string): string {
    const iv = randomBytes(12);
    const current = appEnv.SYSTEM_SETTINGS_ENCRYPTION_KEY?.trim();
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey(current), iv);
    const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
    return `v2:${this.currentKeyId()}:${iv.toString('base64')}:${cipher.getAuthTag().toString('base64')}:${ciphertext.toString('base64')}`;
  }

  private decrypt(value: string): string {
    try {
      const parts = value.split(':');
      let ivValue: string | undefined;
      let tagValue: string | undefined;
      let ciphertextValue: string | undefined;
      let candidateKeys = this.encryptionKeyCandidates();
      if (parts[0] === 'v1' && parts.length === 4) {
        [, ivValue, tagValue, ciphertextValue] = parts;
      } else if (parts[0] === 'v2' && parts.length === 5) {
        const [, keyId, iv, tag, ciphertext] = parts;
        candidateKeys = candidateKeys.filter((keyValue) => createHash('sha256').update(keyValue).digest('hex').slice(0, 16) === keyId);
        ivValue = iv;
        tagValue = tag;
        ciphertextValue = ciphertext;
      } else {
        throw new Error('bad ciphertext');
      }
      if (!ivValue || !tagValue || !ciphertextValue) throw new Error('bad ciphertext');
      for (const keyValue of candidateKeys) {
        try {
          const decipher = createDecipheriv('aes-256-gcm', this.encryptionKey(keyValue), Buffer.from(ivValue, 'base64'));
          decipher.setAuthTag(Buffer.from(tagValue, 'base64'));
          return Buffer.concat([decipher.update(Buffer.from(ciphertextValue, 'base64')), decipher.final()]).toString('utf8');
        } catch {
          // Try the previous rotation key before reporting a decrypt failure.
        }
      }
      throw new Error('bad ciphertext');
    } catch {
      throw new ServiceUnavailableException('通知应用 Secret 无法解密');
    }
  }

  private auditSnapshot(row: WecomNotificationConfigEntity | null): Record<string, unknown> {
    return row
      ? { configured: Boolean(row.agentId && row.secretCiphertext), agentId: row.agentId, configVersion: row.configVersion, secretStored: Boolean(row.secretCiphertext) }
      : { configured: false, agentId: null, configVersion: 0, secretStored: false };
  }

  private viewFromRow(row: WecomNotificationConfigEntity): NotificationConfigView {
    const configured = Boolean(row.agentId && row.secretCiphertext);
    const configurationError = Boolean(!configured && (row.agentId || row.secretCiphertext)) || (configured && row.secretCiphertext !== null && !this.canDecrypt(row.secretCiphertext));
    return {
      corpId: row.corpId,
      mainCorpId: appEnv.WECOM_CORP_ID,
      mainAgentId: appEnv.WECOM_AGENT_ID,
      configured,
      source: configured || configurationError ? 'admin_override' : 'env_main',
      agentId: configured ? row.agentId! : appEnv.WECOM_AGENT_ID,
      configVersion: row.configVersion,
      secretStored: Boolean(row.secretCiphertext),
      encryptionKeyAvailable: Boolean(appEnv.SYSTEM_SETTINGS_ENCRYPTION_KEY?.trim()),
      configurationError,
      encryptionKeyRotationAvailable: this.hasPreviousEncryptionKey(),
      updatedAt: row.updatedAt?.toISOString() ?? null,
    };
  }

  private canDecrypt(value: string): boolean {
    try {
      this.decrypt(value);
      return true;
    } catch {
      return false;
    }
  }
}
