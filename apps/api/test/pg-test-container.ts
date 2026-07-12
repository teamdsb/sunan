import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { ImagePullPolicy } from 'testcontainers';
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
import { EvidenceAuditEntity } from 'src/database/entities/evidence-audit.entity';
import { EvidenceRecordEntity } from 'src/database/entities/evidence-record.entity';
import { ExportJobEntity } from 'src/database/entities/export-job.entity';
import { MasterDataImportBatchEntity } from 'src/database/entities/master-data-import-batch.entity';
import { MasterDataImportRowEntity } from 'src/database/entities/master-data-import-row.entity';
import { OfficeCategoryEntity } from 'src/database/entities/office-category.entity';
import { OfficeEntryAuditEntity } from 'src/database/entities/office-entry-audit.entity';
import { OfficeEntryEntity } from 'src/database/entities/office-entry.entity';
import { PersonnelEntity } from 'src/database/entities/personnel.entity';
import { ProcurementOrderApprovalEntity } from 'src/database/entities/procurement-order-approval.entity';
import { ProcurementBudgetAuditEntity } from 'src/database/entities/procurement-budget-audit.entity';
import { ProcurementBudgetEntity } from 'src/database/entities/procurement-budget.entity';
import { ProcurementDimensionItemEntity } from 'src/database/entities/procurement-dimension-item.entity';
import { ProcurementOrderFileEntity } from 'src/database/entities/procurement-order-file.entity';
import { ProcurementOrderEntity } from 'src/database/entities/procurement-order.entity';
import { ProcurementReportApprovalEntity } from 'src/database/entities/procurement-report-approval.entity';
import { ProcurementReportEntity } from 'src/database/entities/procurement-report.entity';
import { ShipMonitorEntity } from 'src/database/entities/ship-monitor.entity';
import { SafetyEquipmentCategoryEntity } from 'src/database/entities/safety-equipment-category.entity';
import { SafetyEquipmentEntity } from 'src/database/entities/safety-equipment.entity';
import { UserSettingsEntity } from 'src/database/entities/user-settings.entity';
import { VehicleEntity } from 'src/database/entities/vehicle.entity';
import { VesselEntity } from 'src/database/entities/vessel.entity';
import { VesselPersonnelAssignmentEntity } from 'src/database/entities/vessel-personnel-assignment.entity';
import { WorkbenchMasterDataReferenceEntity } from 'src/database/entities/workbench-master-data-reference.entity';
import { WecomUserEntity } from 'src/database/entities/wecom-user.entity';
import { WecomApprovalCallbackEventEntity } from 'src/database/entities/wecom-approval-callback-event.entity';
import { WecomApprovalInstanceSyncEntity } from 'src/database/entities/wecom-approval-instance-sync.entity';
import { WecomApprovalTemplateBindingEntity } from 'src/database/entities/wecom-approval-template-binding.entity';
import { WorkbenchModuleEntity } from 'src/database/entities/workbench-module.entity';
import { WorkbenchPrintSnapshotEntity } from 'src/database/entities/workbench-print-snapshot.entity';
import { WorkbenchRecordActionLogEntity } from 'src/database/entities/workbench-record-action-log.entity';
import { WorkbenchRecordAttachmentEntity } from 'src/database/entities/workbench-record-attachment.entity';
import { WorkbenchRecordEntity } from 'src/database/entities/workbench-record.entity';
import { WorkbenchRecordParticipantEntity } from 'src/database/entities/workbench-record-participant.entity';
import { WorkbenchRecordStepEntity } from 'src/database/entities/workbench-record-step.entity';
import { WorkbenchRecordTransferEntity } from 'src/database/entities/workbench-record-transfer.entity';
import { WorkbenchDelegationEntity } from 'src/database/entities/workbench-delegation.entity';
import { WorkbenchTemplateEntity } from 'src/database/entities/workbench-template.entity';
import { BootstrapAuth1710000000000 } from 'src/database/migrations/1710000000000-bootstrap-auth';
import { Wave21710000001000 } from 'src/database/migrations/1710000001000-wave2-files-reference-data';
import { Wave31710000002000 } from 'src/database/migrations/1710000002000-wave3-enterprise-profile';
import { Wave31710000003000 } from 'src/database/migrations/1710000003000-wave3-enterprise-policy';
import { Wave31710000004000 } from 'src/database/migrations/1710000004000-wave3-monitor-settings';
import { Wave31710000005000 } from 'src/database/migrations/1710000005000-wave3-certificates';
import { Wave41710000006000 } from 'src/database/migrations/1710000006000-wave4-certificate-reminders';
import { Wave21710000007000 } from 'src/database/migrations/1710000007000-wave2-office-portal';
import { Wave31710000008000 } from 'src/database/migrations/1710000008000-wave3-procurement-core';
import { Wave31710000009000 } from 'src/database/migrations/1710000009000-wave3-procurement-reports';
import { Wave41710000010000 } from 'src/database/migrations/1710000010000-wave4-procurement-dimension-items';
import { Wave51710000011000 } from 'src/database/migrations/1710000011000-wave5-workbench-runtime';
import { Wave51710000012000 } from 'src/database/migrations/1710000012000-wave5-workbench-approval-ops';
import { Wave61710000013000 } from 'src/database/migrations/1710000013000-wave6-workbench-module-split';
import { ProcurementBudgets1710000014000 } from 'src/database/migrations/1710000014000-procurement-budgets';
import { Wave8WorkflowPermission1710000015000 } from 'src/database/migrations/1710000015000-wave8-workflow-permission';
import { Wave3EvidenceAudits1710000016000 } from 'src/database/migrations/1710000016000-wave3-evidence-audits';
import { Wave3EvidenceExport1710000017000 } from 'src/database/migrations/1710000017000-wave3-evidence-export';
import { Wave4MasterData1710000018000 } from 'src/database/migrations/1710000018000-wave4-master-data';
import {
  SafetyPlanEntity,
  SafetyPlanItemEntity,
  SafetyTaskActionLogEntity,
  SafetyTaskDelegationEntity,
  SafetyTaskEntity,
  SafetyTaskGenerationEntryEntity,
  SafetyTaskGenerationRunEntity,
  SafetyTaskNotificationDeliveryEntity,
  SafetyTaskParticipantEntity,
  SafetyTaskTransferEntity,
} from 'src/database/entities/safety-plan-task.entity';
import { Wave5PlanTask1710000019000 } from 'src/database/migrations/1710000019000-wave5-plan-task';
import { Wave6InspectionCapa1710000020000 } from 'src/database/migrations/1710000020000-wave6-inspection-capa';
import { Wave7LegacySafetyMigration1710000021000 } from 'src/database/migrations/1710000021000-wave7-legacy-safety-migration';
import {
  CapaActionEntity,
  CapaActionEvidenceEntity,
  CapaRootCauseEntity,
  CapaVerificationEntity,
  InspectionCapaActionLogEntity,
  InspectionEntity,
  InspectionPlanEntity,
  InspectionResultEntity,
  InspectionResultEvidenceEntity,
  InspectionTemplateEntity,
  InspectionTemplateItemEntity,
  InspectionTemplateScopeEntity,
  InspectionTemplateVersionEntity,
  IssueSourceEntity,
  IssueTransferJobEntity,
  SafetyCapaEntity,
  SafetyIssueEntity,
} from 'src/database/entities/safety-inspection-capa.entity';

const ALL_TEST_ENTITIES = [
  WecomUserEntity,
  FileEntity,
  EvidenceAuditEntity,
  EvidenceRecordEntity, ExportJobEntity,
  MasterDataImportBatchEntity, MasterDataImportRowEntity,
  VesselEntity,
  VesselPersonnelAssignmentEntity,
  SafetyEquipmentCategoryEntity,
  SafetyEquipmentEntity,
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
  ProcurementBudgetEntity,
  ProcurementBudgetAuditEntity,
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
  WorkbenchMasterDataReferenceEntity,
  WorkbenchRecordParticipantEntity,
  WorkbenchRecordStepEntity,
  WorkbenchRecordTransferEntity,
  WorkbenchDelegationEntity,
  WorkbenchRecordAttachmentEntity,
  WorkbenchRecordActionLogEntity,
  WorkbenchPrintSnapshotEntity,
  WecomApprovalTemplateBindingEntity,
  WecomApprovalInstanceSyncEntity,
  WecomApprovalCallbackEventEntity,
  SafetyPlanEntity,
  SafetyPlanItemEntity,
  SafetyTaskEntity,
  SafetyTaskParticipantEntity,
  SafetyTaskActionLogEntity,
  SafetyTaskTransferEntity,
  SafetyTaskDelegationEntity,
  SafetyTaskGenerationRunEntity,
  SafetyTaskGenerationEntryEntity,
  SafetyTaskNotificationDeliveryEntity,
  InspectionTemplateEntity,
  InspectionTemplateVersionEntity,
  InspectionTemplateItemEntity,
  InspectionTemplateScopeEntity,
  InspectionPlanEntity,
  InspectionEntity,
  InspectionResultEntity,
  InspectionResultEvidenceEntity,
  SafetyIssueEntity,
  IssueSourceEntity,
  IssueTransferJobEntity,
  SafetyCapaEntity,
  CapaRootCauseEntity,
  CapaActionEntity,
  CapaActionEvidenceEntity,
  CapaVerificationEntity,
  InspectionCapaActionLogEntity,
];

const ALL_TEST_MIGRATIONS = [
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
  ProcurementBudgets1710000014000,
  Wave8WorkflowPermission1710000015000,
  Wave3EvidenceAudits1710000016000,
  Wave3EvidenceExport1710000017000,
  Wave4MasterData1710000018000,
  Wave5PlanTask1710000019000,
  Wave6InspectionCapa1710000020000,
  Wave7LegacySafetyMigration1710000021000,
];

type StartedPgContainer = Awaited<ReturnType<PostgreSqlContainer['start']>>;

let container: StartedPgContainer | null = null;

const neverPullPolicy: ImagePullPolicy = {
  shouldPull: () => false,
};

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

  const pgContainer = new PostgreSqlContainer(
    process.env.TEST_POSTGRES_IMAGE ?? 'postgres:16-alpine',
  ).withStartupTimeout(60_000);
  if (process.env.TEST_POSTGRES_PULL !== 'true') {
    pgContainer.withPullPolicy(neverPullPolicy);
  }
  container = await pgContainer.start();

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
