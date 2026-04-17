import type { TypeOrmModuleOptions } from '@nestjs/typeorm';

import { appEnv } from '../config/env';
import { CertificateTypeEntity } from './entities/certificate-type.entity';
import { CertificateReminderEntity } from './entities/certificate-reminder.entity';
import { CertificateEntity } from './entities/certificate.entity';
import { CertificateFileEntity } from './entities/certificate-file.entity';
import { EnterprisePolicyEntity } from './entities/enterprise-policy.entity';
import { EnterprisePolicyFileEntity } from './entities/enterprise-policy-file.entity';
import { EnterpriseProfileEntity } from './entities/enterprise-profile.entity';
import { EnterpriseProfileFileEntity } from './entities/enterprise-profile-file.entity';
import { FileEntity } from './entities/file.entity';
import { OfficeCategoryEntity } from './entities/office-category.entity';
import { OfficeEntryAuditEntity } from './entities/office-entry-audit.entity';
import { OfficeEntryEntity } from './entities/office-entry.entity';
import { PersonnelEntity } from './entities/personnel.entity';
import { ProcurementOrderApprovalEntity } from './entities/procurement-order-approval.entity';
import { ProcurementOrderFileEntity } from './entities/procurement-order-file.entity';
import { ProcurementOrderEntity } from './entities/procurement-order.entity';
import { ShipMonitorEntity } from './entities/ship-monitor.entity';
import { UserSettingsEntity } from './entities/user-settings.entity';
import { VesselEntity } from './entities/vessel.entity';
import { VehicleEntity } from './entities/vehicle.entity';
import { WecomUserEntity } from './entities/wecom-user.entity';
import { BootstrapAuth1710000000000 } from './migrations/1710000000000-bootstrap-auth';
import { Wave21710000001000 } from './migrations/1710000001000-wave2-files-reference-data';
import { Wave31710000002000 } from './migrations/1710000002000-wave3-enterprise-profile';
import { Wave31710000003000 } from './migrations/1710000003000-wave3-enterprise-policy';
import { Wave31710000004000 } from './migrations/1710000004000-wave3-monitor-settings';
import { Wave31710000005000 } from './migrations/1710000005000-wave3-certificates';
import { Wave41710000006000 } from './migrations/1710000006000-wave4-certificate-reminders';
import { Wave21710000007000 } from './migrations/1710000007000-wave2-office-portal';
import { Wave31710000008000 } from './migrations/1710000008000-wave3-procurement-core';

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
    CertificateReminderEntity,
    EnterpriseProfileEntity,
    EnterpriseProfileFileEntity,
    EnterprisePolicyEntity,
    EnterprisePolicyFileEntity,
    CertificateEntity,
    CertificateFileEntity,
    OfficeCategoryEntity,
    OfficeEntryEntity,
    OfficeEntryAuditEntity,
    ProcurementOrderEntity,
    ProcurementOrderApprovalEntity,
    ProcurementOrderFileEntity,
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
    Wave41710000006000,
    Wave21710000007000,
    Wave31710000008000,
  ],
  synchronize: false,
});
