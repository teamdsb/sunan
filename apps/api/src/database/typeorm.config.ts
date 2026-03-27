import type { TypeOrmModuleOptions } from '@nestjs/typeorm';

import { appEnv } from 'src/config/env';
import { CertificateTypeEntity } from 'src/database/entities/certificate-type.entity';
import { CertificateEntity } from 'src/database/entities/certificate.entity';
import { CertificateFileEntity } from 'src/database/entities/certificate-file.entity';
import { EnterprisePolicyEntity } from 'src/database/entities/enterprise-policy.entity';
import { EnterprisePolicyFileEntity } from 'src/database/entities/enterprise-policy-file.entity';
import { EnterpriseProfileEntity } from 'src/database/entities/enterprise-profile.entity';
import { EnterpriseProfileFileEntity } from 'src/database/entities/enterprise-profile-file.entity';
import { FileEntity } from 'src/database/entities/file.entity';
import { PersonnelEntity } from 'src/database/entities/personnel.entity';
import { ShipMonitorEntity } from 'src/database/entities/ship-monitor.entity';
import { UserSettingsEntity } from 'src/database/entities/user-settings.entity';
import { VesselEntity } from 'src/database/entities/vessel.entity';
import { VehicleEntity } from 'src/database/entities/vehicle.entity';
import { WecomUserEntity } from 'src/database/entities/wecom-user.entity';
import { BootstrapAuth1710000000000 } from 'src/database/migrations/1710000000000-bootstrap-auth';
import { Wave21710000001000 } from 'src/database/migrations/1710000001000-wave2-files-reference-data';
import { Wave31710000002000 } from 'src/database/migrations/1710000002000-wave3-enterprise-profile';
import { Wave31710000003000 } from 'src/database/migrations/1710000003000-wave3-enterprise-policy';
import { Wave31710000004000 } from 'src/database/migrations/1710000004000-wave3-monitor-settings';
import { Wave31710000005000 } from 'src/database/migrations/1710000005000-wave3-certificates';

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
    EnterpriseProfileEntity,
    EnterpriseProfileFileEntity,
    EnterprisePolicyEntity,
    EnterprisePolicyFileEntity,
    CertificateEntity,
    CertificateFileEntity,
    ShipMonitorEntity,
    UserSettingsEntity,
  ],
  migrations: [
    BootstrapAuth1710000000000,
    Wave21710000001000,
    Wave31710000002000,
    Wave31710000003000,
    Wave31710000004000,
    Wave31710000005000,
  ],
  synchronize: false,
});
