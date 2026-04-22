import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  DB_HOST: z.string().default('127.0.0.1'),
  DB_PORT: z.coerce.number().default(5432),
  DB_NAME: z.string().default('sunan'),
  DB_USER: z.string().default('postgres'),
  DB_PASSWORD: z.string().default('postgres'),
  DB_SSL: z
    .string()
    .optional()
    .transform((value) => value === 'true'),
  REDIS_URL: z.string().default('redis://127.0.0.1:6379'),
  REDIS_PASSWORD: z.string().optional(),
  JWT_SECRET: z.string().min(32).default('01234567890123456789012345678901'),
  JWT_EXPIRES_IN: z.string().default('7200s'),
  WECOM_CORP_ID: z.string().default('ww-test-corp'),
  WECOM_AGENT_ID: z.string().default('1000001'),
  WECOM_AGENT_SECRET: z.string().default('test-agent-secret'),
  WECOM_REDIRECT_URI: z.string().url().default('https://example.com/auth'),
  WEB_PUBLIC_URL: z.string().url().default('https://example.com'),
  API_PUBLIC_URL: z.string().url().default('https://api.example.com'),
  APP_DOMAIN: z.string().default('example.com'),
  WECOM_SYSTEM_ADMIN_USER_IDS: z.string().optional(),
  WECOM_CALLBACK_TOKEN: z.string().default('test-callback-token'),
  WECOM_ENCODING_AES_KEY: z.string().optional(),
  WECOM_CALLBACK_ALLOWED_IP_RANGES: z
    .string()
    .optional()
    .transform((value) =>
      value
        ? value
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean)
        : [],
    ),
  WECOM_CALLBACK_SIGNATURE_REQUIRED: z
    .string()
    .optional()
    .transform((value) => value === 'true'),
  WECOM_CALLBACK_MAX_SKEW_SECONDS: z.coerce.number().default(300),
  OSS_REGION: z.string().default('oss-cn-hangzhou'),
  OSS_BUCKET: z.string().default('sunan-files'),
  OSS_ACCESS_KEY_ID: z.string().default('test-access-key-id'),
  OSS_ACCESS_KEY_SECRET: z.string().default('test-access-key-secret'),
  OSS_PRESIGN_EXPIRE: z.coerce.number().default(300),
  OSS_DOWNLOAD_EXPIRE: z.coerce.number().default(900),
});

export type AppEnv = z.infer<typeof envSchema>;

const envInput = {
  ...process.env,
  WECOM_CALLBACK_TOKEN: process.env.WECOM_CALLBACK_TOKEN ?? process.env.WECOM_TOKEN,
};

export const appEnv = envSchema.parse(envInput);
