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
import { ProcurementDimensionItemEntity } from './entities/procurement-dimension-item.entity';
import { ProcurementOrderFileEntity } from './entities/procurement-order-file.entity';
import { ProcurementOrderEntity } from './entities/procurement-order.entity';
import { ProcurementReportApprovalEntity } from './entities/procurement-report-approval.entity';
import { ProcurementReportEntity } from './entities/procurement-report.entity';
import { ShipMonitorEntity } from './entities/ship-monitor.entity';
import { UserSettingsEntity } from './entities/user-settings.entity';
import { VesselEntity } from './entities/vessel.entity';
import { VehicleEntity } from './entities/vehicle.entity';
import { WecomApprovalCallbackEventEntity } from './entities/wecom-approval-callback-event.entity';
import { WecomApprovalInstanceSyncEntity } from './entities/wecom-approval-instance-sync.entity';
import { WecomApprovalTemplateBindingEntity } from './entities/wecom-approval-template-binding.entity';
import { WorkbenchModuleEntity } from './entities/workbench-module.entity';
import { WorkbenchPrintSnapshotEntity } from './entities/workbench-print-snapshot.entity';
import { WorkbenchRecordActionLogEntity } from './entities/workbench-record-action-log.entity';
import { WorkbenchRecordAttachmentEntity } from './entities/workbench-record-attachment.entity';
import { WorkbenchRecordEntity } from './entities/workbench-record.entity';
import { WorkbenchRecordStepEntity } from './entities/workbench-record-step.entity';
import { WorkbenchTemplateEntity } from './entities/workbench-template.entity';
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
import { Wave31710000009000 } from './migrations/1710000009000-wave3-procurement-reports';
import { Wave41710000010000 } from './migrations/1710000010000-wave4-procurement-dimension-items';
import { Wave51710000011000 } from './migrations/1710000011000-wave5-workbench-runtime';
import { Wave51710000012000 } from './migrations/1710000012000-wave5-workbench-approval-ops';
import { Wave61710000013000 } from './migrations/1710000013000-wave6-workbench-module-split';

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
    ProcurementDimensionItemEntity,
    ProcurementOrderEntity,
    ProcurementOrderApprovalEntity,
    ProcurementOrderFileEntity,
    ProcurementReportEntity,
    ProcurementReportApprovalEntity,
    ShipMonitorEntity,
    UserSettingsEntity,
    WorkbenchModuleEntity,
    WorkbenchTemplateEntity,
    WorkbenchRecordEntity,
    WorkbenchRecordStepEntity,
    WorkbenchRecordAttachmentEntity,
    WorkbenchRecordActionLogEntity,
    WorkbenchPrintSnapshotEntity,
    WecomApprovalTemplateBindingEntity,
    WecomApprovalInstanceSyncEntity,
    WecomApprovalCallbackEventEntity,
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
    Wave31710000009000,
    Wave41710000010000,
    Wave51710000011000,
    Wave51710000012000,
    Wave61710000013000,
  ],
  synchronize: false,
});
