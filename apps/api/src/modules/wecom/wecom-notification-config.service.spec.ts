import { ConflictException, ServiceUnavailableException } from '@nestjs/common';
import { createCipheriv, createHash, randomBytes } from 'crypto';

import { appEnv } from 'src/config/env';
import { WecomNotificationConfigEntity } from 'src/database/entities/wecom-notification-config.entity';
import { WecomNotificationConfigService } from './wecom-notification-config.service';

const encryptionKey = 'current-settings-encryption-key-012345';
const previousKey = 'previous-settings-encryption-key-67890';
const keyId = (value: string) => createHash('sha256').update(value).digest('hex').slice(0, 16);

function encryptFixture(secret: string, key: string) {
  const iv = randomBytes(12);
  const derivedKey = createHash('sha256').update(key).digest();
  const cipher = createCipheriv('aes-256-gcm', derivedKey, iv);
  const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return `v2:${keyId(key)}:${iv.toString('base64')}:${cipher.getAuthTag().toString('base64')}:${ciphertext.toString('base64')}`;
}

function makeConfigRow(overrides: Partial<WecomNotificationConfigEntity> = {}): WecomNotificationConfigEntity {
  return {
    id: 'config-id',
    corpId: appEnv.WECOM_CORP_ID,
    agentId: '2000001',
    secretCiphertext: encryptFixture('notification-secret', encryptionKey),
    configVersion: 3,
    updatedBy: 'admin-a',
    createdAt: new Date('2026-11-16T00:00:00.000Z'),
    updatedAt: new Date('2026-11-16T00:00:00.000Z'),
    ...overrides,
  };
}

describe('WecomNotificationConfigService', () => {
  const envKeys = ['SYSTEM_SETTINGS_ENCRYPTION_KEY', 'SYSTEM_SETTINGS_ENCRYPTION_KEY_PREVIOUS'] as const;
  const originalDescriptors = new Map(envKeys.map((key) => [key, Object.getOwnPropertyDescriptor(appEnv, key)]));

  const setEncryptionKeys = (current?: string, previous?: string) => {
    Object.defineProperty(appEnv, 'SYSTEM_SETTINGS_ENCRYPTION_KEY', { value: current, configurable: true, writable: true });
    Object.defineProperty(appEnv, 'SYSTEM_SETTINGS_ENCRYPTION_KEY_PREVIOUS', { value: previous, configurable: true, writable: true });
  };

  afterEach(() => {
    for (const key of envKeys) {
      const descriptor = originalDescriptors.get(key);
      if (descriptor) Object.defineProperty(appEnv, key, descriptor);
      else delete (appEnv as unknown as Record<string, unknown>)[key];
    }
  });

  it('uses the complete env main app when no override or encryption key exists', async () => {
    setEncryptionKeys();
    const repository = { findOne: jest.fn().mockResolvedValue(null) };
    const service = new WecomNotificationConfigService(repository as never, {} as never);

    await expect(service.resolve()).resolves.toMatchObject({
      corpId: appEnv.WECOM_CORP_ID,
      agentId: appEnv.WECOM_AGENT_ID,
      secret: appEnv.WECOM_AGENT_SECRET,
      source: 'env_main',
      version: 0,
    });
  });

  it('rejects partial and undecryptable overrides rather than falling back', async () => {
    setEncryptionKeys(encryptionKey);
    const partialRepository = { findOne: jest.fn().mockResolvedValue(makeConfigRow({ secretCiphertext: null })) };
    const partialService = new WecomNotificationConfigService(partialRepository as never, {} as never);
    await expect(partialService.resolve()).rejects.toThrow(ServiceUnavailableException);

    setEncryptionKeys('unrelated-settings-encryption-key-99999');
    const corruptRepository = { findOne: jest.fn().mockResolvedValue(makeConfigRow()) };
    const corruptService = new WecomNotificationConfigService(corruptRepository as never, {} as never);
    await expect(corruptService.resolve()).rejects.toThrow('通知应用 Secret 无法解密');
    await expect(corruptService.getView()).resolves.toMatchObject({ configurationError: true, source: 'admin_override' });
  });

  it('gives each unsaved draft an isolated token cache identity', async () => {
    setEncryptionKeys(encryptionKey);
    const repository = { findOne: jest.fn().mockResolvedValue(makeConfigRow()) };
    const service = new WecomNotificationConfigService(repository as never, {} as never);
    const first = await service.resolveDraft({ agentId: '2000001', secret: 'draft-secret-a' });
    const second = await service.resolveDraft({ agentId: '2000001', secret: 'draft-secret-b' });

    expect(first.cacheKey).toBeTruthy();
    expect(second.cacheKey).toBeTruthy();
    expect(first.cacheKey).not.toBe(second.cacheKey);
    expect(first.version).toBe(second.version);
  });

  it('rotates a credential using the previous key, bumps the config version, and audits no secret', async () => {
    setEncryptionKeys(encryptionKey, previousKey);
    const row = makeConfigRow({ secretCiphertext: encryptFixture('notification-secret', previousKey) });
    const configRepository = {
      findOne: jest.fn().mockResolvedValue(row),
      save: jest.fn(async (value: WecomNotificationConfigEntity) => value),
    };
    const auditRepository = {
      create: jest.fn((value: unknown) => value),
      save: jest.fn(async (value: unknown) => value),
    };
    const manager = {
      getRepository: (entity: unknown) => entity === WecomNotificationConfigEntity ? configRepository : auditRepository,
    };
    const dataSource = { transaction: (work: (value: typeof manager) => unknown) => work(manager) };
    const service = new WecomNotificationConfigService({} as never, dataSource as never);

    await expect(service.rotateEncryptionKey('admin-b')).resolves.toEqual({ rotated: true, configVersion: 4 });
    expect(row.secretCiphertext).toContain(`v2:${keyId(encryptionKey)}:`);
    expect(row.secretCiphertext).not.toContain('notification-secret');
    expect(auditRepository.save).toHaveBeenCalledWith(expect.objectContaining({ action: 'rotate', configVersion: 4 }));
    expect(JSON.stringify(auditRepository.save.mock.calls)).not.toContain('notification-secret');
  });

  it('rejects a stale optimistic version before changing an override', async () => {
    setEncryptionKeys(encryptionKey);
    const row = makeConfigRow();
    const configRepository = { findOne: jest.fn().mockResolvedValue(row), save: jest.fn() };
    const manager = { getRepository: () => configRepository, query: jest.fn() };
    const dataSource = { transaction: (work: (value: typeof manager) => unknown) => work(manager) };
    const service = new WecomNotificationConfigService({} as never, dataSource as never);

    await expect(service.save({ actorUserId: 'admin-b', expectedConfigVersion: 2, agentId: row.agentId! })).rejects.toThrow(ConflictException);
    expect(configRepository.save).not.toHaveBeenCalled();
  });

  it('authenticates ciphertext even when a rotation claims to already use the current key', async () => {
    setEncryptionKeys(encryptionKey, previousKey);
    const row = makeConfigRow({ secretCiphertext: `v2:${keyId(encryptionKey)}:invalid:invalid:invalid` });
    const repository = { findOne: jest.fn().mockResolvedValue(row), save: jest.fn() };
    const manager = { getRepository: () => repository };
    const dataSource = { transaction: (work: (value: typeof manager) => unknown) => work(manager) };
    const service = new WecomNotificationConfigService({} as never, dataSource as never);

    await expect(service.rotateEncryptionKey('admin')).rejects.toThrow('通知应用 Secret 无法解密');
    expect(repository.save).not.toHaveBeenCalled();
  });
});
