import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';

import { CertificateFileEntity } from 'src/database/entities/certificate-file.entity';
import { CertificateReminderEntity } from 'src/database/entities/certificate-reminder.entity';
import { CertificateTypeEntity } from 'src/database/entities/certificate-type.entity';
import { CertificateEntity } from 'src/database/entities/certificate.entity';
import { EnterprisePolicyFileEntity } from 'src/database/entities/enterprise-policy-file.entity';
import { EnterprisePolicyEntity } from 'src/database/entities/enterprise-policy.entity';
import { EnterpriseProfileFileEntity } from 'src/database/entities/enterprise-profile-file.entity';
import { EnterpriseProfileEntity } from 'src/database/entities/enterprise-profile.entity';
import { FileEntity } from 'src/database/entities/file.entity';
import { PersonnelEntity } from 'src/database/entities/personnel.entity';
import { ShipMonitorEntity } from 'src/database/entities/ship-monitor.entity';
import { UserSettingsEntity } from 'src/database/entities/user-settings.entity';
import { VehicleEntity } from 'src/database/entities/vehicle.entity';
import { VesselEntity } from 'src/database/entities/vessel.entity';
import { WecomUserEntity } from 'src/database/entities/wecom-user.entity';
import { BootstrapAuth1710000000000 } from 'src/database/migrations/1710000000000-bootstrap-auth';
import { Wave21710000001000 } from 'src/database/migrations/1710000001000-wave2-files-reference-data';
import { Wave31710000002000 } from 'src/database/migrations/1710000002000-wave3-enterprise-profile';
import { Wave31710000003000 } from 'src/database/migrations/1710000003000-wave3-enterprise-policy';
import { Wave31710000004000 } from 'src/database/migrations/1710000004000-wave3-monitor-settings';
import { Wave31710000005000 } from 'src/database/migrations/1710000005000-wave3-certificates';
import { Wave41710000006000 } from 'src/database/migrations/1710000006000-wave4-certificate-reminders';

const ALL_TEST_ENTITIES = [
  WecomUserEntity,
  FileEntity,
  VesselEntity,
  VehicleEntity,
  PersonnelEntity,
  CertificateTypeEntity,
  CertificateReminderEntity,
  EnterpriseProfileEntity,
  EnterpriseProfileFileEntity,
  EnterprisePolicyEntity,
  EnterprisePolicyFileEntity,
  CertificateEntity,
  CertificateFileEntity,
  ShipMonitorEntity,
  UserSettingsEntity,
];

const ALL_TEST_MIGRATIONS = [
  BootstrapAuth1710000000000,
  Wave21710000001000,
  Wave31710000002000,
  Wave31710000003000,
  Wave31710000004000,
  Wave31710000005000,
  Wave41710000006000,
];

type StartedPgContainer = Awaited<ReturnType<PostgreSqlContainer['start']>>;

let container: StartedPgContainer | null = null;

const buildDataSourceOptions = () => {
  if (!container) {
    throw new Error('PostgreSQL test container has not been started.');
  }

  return {
    type: 'postgres' as const,
    host: container.getHost(),
    port: container.getPort(),
    username: container.getUsername(),
    password: container.getPassword(),
    database: container.getDatabase(),
    synchronize: false,
    logging: false,
    entities: ALL_TEST_ENTITIES,
    migrations: ALL_TEST_MIGRATIONS,
  };
};

export const bootstrapPgTestDatabase = async (): Promise<void> => {
  if (container) {
    return;
  }

  container = await new PostgreSqlContainer('postgres:16-alpine').start();

  const migrationDataSource = new DataSource(buildDataSourceOptions());
  await migrationDataSource.initialize();

  try {
    await migrationDataSource.runMigrations();
  } finally {
    await migrationDataSource.destroy();
  }
};

export const buildPgTypeOrmOptions = (): TypeOrmModuleOptions =>
  buildDataSourceOptions();

export const shutdownPgTestDatabase = async (): Promise<void> => {
  if (!container) {
    return;
  }

  await container.stop();
  container = null;
};
