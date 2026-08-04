import { z } from 'zod';

const baseEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  SUNAN_VERSION: z.string().default('0.0.5'),
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
  REDIS_USERNAME: z.string().optional(),
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
  WECOM_CALLBACK_ALLOWED_IP_RANGES_FILE: z.string().optional(),
  WECOM_CALLBACK_SIGNATURE_REQUIRED: z
    .string()
    .optional()
    .transform((value) => (value === undefined ? true : value === 'true')),
  WECOM_CALLBACK_MAX_SKEW_SECONDS: z.coerce.number().default(300),
  OSS_DRIVER: z.enum(['aliyun', 's3']).default('aliyun'),
  OSS_REGION: z.string().default('oss-cn-hangzhou'),
  OSS_BUCKET: z.string().default('sunan-files'),
  OSS_ACCESS_KEY_ID: z.string().default('test-access-key-id'),
  OSS_ACCESS_KEY_SECRET: z.string().default('test-access-key-secret'),
  OSS_ENDPOINT: z.string().url().optional(),
  OSS_PUBLIC_ENDPOINT: z.string().url().optional(),
  OSS_FORCE_PATH_STYLE: z
    .string()
    .optional()
    .transform((value) => (value === undefined ? true : value === 'true')),
  OSS_PRESIGN_EXPIRE: z.coerce.number().default(300),
  OSS_DOWNLOAD_EXPIRE: z.coerce.number().default(900),
});

const productionRequiredKeys = [
  'DB_PASSWORD',
  'REDIS_PASSWORD',
  'JWT_SECRET',
  'WECOM_CORP_ID',
  'WECOM_AGENT_ID',
  'WECOM_AGENT_SECRET',
  'WECOM_REDIRECT_URI',
  'WEB_PUBLIC_URL',
  'API_PUBLIC_URL',
  'APP_DOMAIN',
  'WECOM_SYSTEM_ADMIN_USER_IDS',
  'WECOM_CALLBACK_TOKEN',
  'WECOM_ENCODING_AES_KEY',
  'OSS_BUCKET',
  'OSS_ACCESS_KEY_ID',
  'OSS_ACCESS_KEY_SECRET',
] as const;

const productionSecretMinimums = {
  DB_PASSWORD: 16,
  REDIS_PASSWORD: 16,
  JWT_SECRET: 32,
  WECOM_AGENT_SECRET: 16,
  WECOM_CALLBACK_TOKEN: 16,
  OSS_ACCESS_KEY_SECRET: 16,
} as const;

const insecureProductionValues = new Set([
  'postgres',
  '01234567890123456789012345678901',
  'ww-test-corp',
  'test-agent-secret',
  'test-callback-token',
  'test-access-key-id',
  'test-access-key-secret',
  'example.com',
  'https://example.com',
  'https://api.example.com',
]);

const envSchema = baseEnvSchema.superRefine((env, context) => {
  if (env.NODE_ENV !== 'production') {
    return;
  }

  for (const key of productionRequiredKeys) {
    const value = env[key];
    if (typeof value !== 'string' || value.trim() === '') {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${key} is required in production`,
        path: [key],
      });
    }
  }

  for (const [key, minimum] of Object.entries(productionSecretMinimums)) {
    const value = env[key as keyof typeof productionSecretMinimums];
    if (typeof value === 'string' && value.length < minimum) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${key} must contain at least ${minimum} characters in production`,
        path: [key],
      });
    }
  }

  for (const key of productionRequiredKeys) {
    const value = env[key];
    if (
      typeof value === 'string' &&
      (insecureProductionValues.has(value) || /replace-(?:me|with)/i.test(value))
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${key} still contains a development placeholder`,
        path: [key],
      });
    }
  }

  for (const key of ['WEB_PUBLIC_URL', 'API_PUBLIC_URL', 'WECOM_REDIRECT_URI'] as const) {
    if (env[key] && new URL(env[key]).protocol !== 'https:') {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${key} must use HTTPS in production`,
        path: [key],
      });
    }
  }

  if (env.WECOM_ENCODING_AES_KEY && env.WECOM_ENCODING_AES_KEY.length !== 43) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'WECOM_ENCODING_AES_KEY must contain exactly 43 characters',
      path: ['WECOM_ENCODING_AES_KEY'],
    });
  }

  if (!env.WECOM_CALLBACK_SIGNATURE_REQUIRED) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'WECOM_CALLBACK_SIGNATURE_REQUIRED must be true in production',
      path: ['WECOM_CALLBACK_SIGNATURE_REQUIRED'],
    });
  }

  if (env.OSS_DRIVER === 's3') {
    if (!env.OSS_ENDPOINT) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'OSS_ENDPOINT is required when OSS_DRIVER=s3',
        path: ['OSS_ENDPOINT'],
      });
    }
    if (!env.OSS_PUBLIC_ENDPOINT) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'OSS_PUBLIC_ENDPOINT is required when OSS_DRIVER=s3',
        path: ['OSS_PUBLIC_ENDPOINT'],
      });
    } else if (new URL(env.OSS_PUBLIC_ENDPOINT).protocol !== 'https:') {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'OSS_PUBLIC_ENDPOINT must use HTTPS in production',
        path: ['OSS_PUBLIC_ENDPOINT'],
      });
    }
  }
});

export type AppEnv = z.infer<typeof envSchema>;

export function parseAppEnv(
  input: Record<string, string | undefined>,
): AppEnv {
  return envSchema.parse({
    ...input,
    WECOM_CALLBACK_TOKEN:
      input.WECOM_CALLBACK_TOKEN ?? input.WECOM_TOKEN,
  });
}

export const appEnv = parseAppEnv(process.env);
