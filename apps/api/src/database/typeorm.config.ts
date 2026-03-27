import type { TypeOrmModuleOptions } from '@nestjs/typeorm';

import { appEnv } from 'src/config/env';
import { CertificateTypeEntity } from 'src/database/entities/certificate-type.entity';
import { FileEntity } from 'src/database/entities/file.entity';
import { PersonnelEntity } from 'src/database/entities/personnel.entity';
import { VesselEntity } from 'src/database/entities/vessel.entity';
import { VehicleEntity } from 'src/database/entities/vehicle.entity';
import { WecomUserEntity } from 'src/database/entities/wecom-user.entity';
import { BootstrapAuth1710000000000 } from 'src/database/migrations/1710000000000-bootstrap-auth';
import { Wave21710000001000 } from 'src/database/migrations/1710000001000-wave2-files-reference-data';

export const buildTypeOrmOptions = (): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: appEnv.DB_HOST,
  port: appEnv.DB_PORT,
  username: appEnv.DB_USER,
  password: appEnv.DB_PASSWORD,
  database: appEnv.DB_NAME,
  ssl: appEnv.DB_SSL ? { rejectUnauthorized: false } : false,
  entities: [
    WecomUserEntity,
    FileEntity,
    VesselEntity,
    VehicleEntity,
    PersonnelEntity,
    CertificateTypeEntity,
  ],
  migrations: [BootstrapAuth1710000000000, Wave21710000001000],
  synchronize: false,
});
