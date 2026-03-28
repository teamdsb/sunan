import 'reflect-metadata';

import { DataSource } from 'typeorm';

import { buildTypeOrmOptions } from './typeorm.config';

export default new DataSource({
  ...buildTypeOrmOptions(),
  entities: buildTypeOrmOptions().entities,
  migrations: buildTypeOrmOptions().migrations,
} as never);
