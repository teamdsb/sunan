import type { TypeOrmModuleOptions } from '@nestjs/typeorm';

import { appEnv } from 'src/config/env';
import { WecomUserEntity } from 'src/database/entities/wecom-user.entity';
import { BootstrapAuth1710000000000 } from 'src/database/migrations/1710000000000-bootstrap-auth';

export const buildTypeOrmOptions = (): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: appEnv.DB_HOST,
  port: appEnv.DB_PORT,
  username: appEnv.DB_USER,
  password: appEnv.DB_PASSWORD,
  database: appEnv.DB_NAME,
  ssl: appEnv.DB_SSL ? { rejectUnauthorized: false } : false,
  entities: [WecomUserEntity],
  migrations: [BootstrapAuth1710000000000],
  synchronize: false,
});
