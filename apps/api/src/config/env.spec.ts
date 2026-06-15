import { ZodError } from 'zod';

import { parseAppEnv } from 'src/config/env';

const productionEnv = {
  NODE_ENV: 'production',
  DB_PASSWORD: 'database-password-strong',
  REDIS_PASSWORD: 'redis-password-strong',
  JWT_SECRET: 'jwt-secret-that-is-longer-than-thirty-two-characters',
  WECOM_CORP_ID: 'ww-real-corp-id',
  WECOM_AGENT_ID: '1000001',
  WECOM_AGENT_SECRET: 'wecom-agent-secret-strong',
  WECOM_REDIRECT_URI: 'https://app.qzssncb.com/auth/callback',
  WEB_PUBLIC_URL: 'https://app.qzssncb.com',
  API_PUBLIC_URL: 'https://api.qzssncb.com',
  APP_DOMAIN: 'qzssncb.com',
  WECOM_SYSTEM_ADMIN_USER_IDS: 'admin-user',
  WECOM_CALLBACK_TOKEN: 'callback-token-strong',
  WECOM_ENCODING_AES_KEY: 'abcdefghijklmnopqrstuvwxyz1234567890ABCDEFG',
  WECOM_CALLBACK_SIGNATURE_REQUIRED: 'true',
  OSS_DRIVER: 's3',
  OSS_BUCKET: 'sunan-files',
  OSS_ACCESS_KEY_ID: 'sunan',
  OSS_ACCESS_KEY_SECRET: 'object-storage-secret-strong',
  OSS_ENDPOINT: 'http://sunan-oss:9000',
  OSS_PUBLIC_ENDPOINT: 'https://oss.qzssncb.com',
} as const;

describe('parseAppEnv', () => {
  it('accepts a complete production configuration', () => {
    expect(parseAppEnv(productionEnv)).toMatchObject({
      NODE_ENV: 'production',
      SUNAN_VERSION: '0.0.2',
      WEB_PUBLIC_URL: 'https://app.qzssncb.com',
      OSS_DRIVER: 's3',
    });
  });

  it('rejects production placeholders and missing secrets', () => {
    expect(() =>
      parseAppEnv({
        NODE_ENV: 'production',
        JWT_SECRET: '01234567890123456789012345678901',
      }),
    ).toThrow(ZodError);
  });

  it('keeps development defaults available for local work', () => {
    expect(parseAppEnv({ NODE_ENV: 'development' })).toMatchObject({
      NODE_ENV: 'development',
      DB_HOST: '127.0.0.1',
      WECOM_CORP_ID: 'ww-test-corp',
    });
  });
});
