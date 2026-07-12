import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileEntity } from 'src/database/entities/file.entity';
import { PersonnelEntity } from 'src/database/entities/personnel.entity';
import {
  CapaActionEntity, CapaActionEvidenceEntity, CapaRootCauseEntity, CapaVerificationEntity, InspectionCapaActionLogEntity, InspectionEntity, InspectionPlanEntity,
  InspectionResultEntity, InspectionResultEvidenceEntity, InspectionTemplateEntity, InspectionTemplateItemEntity, InspectionTemplateScopeEntity, InspectionTemplateVersionEntity,
  IssueSourceEntity, IssueTransferJobEntity, SafetyCapaEntity, SafetyIssueEntity,
} from 'src/database/entities/safety-inspection-capa.entity';
import { SafetyPlanItemEntity, SafetyTaskEntity, SafetyTaskParticipantEntity } from 'src/database/entities/safety-plan-task.entity';
import { WorkbenchRecordEntity } from 'src/database/entities/workbench-record.entity';
import { PlanTaskModule } from 'src/modules/plan-task/plan-task.module';
import { InspectionCapaController } from './inspection-capa.controller';
import { InspectionCapaService } from './inspection-capa.service';

@Module({
  imports: [PlanTaskModule, TypeOrmModule.forFeature([
    InspectionTemplateEntity, InspectionTemplateVersionEntity, InspectionTemplateItemEntity, InspectionTemplateScopeEntity, InspectionPlanEntity, InspectionEntity,
    InspectionResultEntity, InspectionResultEvidenceEntity, SafetyIssueEntity, IssueSourceEntity, IssueTransferJobEntity, SafetyCapaEntity, CapaRootCauseEntity,
    CapaActionEntity, CapaActionEvidenceEntity, CapaVerificationEntity, InspectionCapaActionLogEntity, SafetyPlanItemEntity, SafetyTaskEntity, SafetyTaskParticipantEntity,
    PersonnelEntity, FileEntity, WorkbenchRecordEntity,
  ])],
  controllers: [InspectionCapaController],
  providers: [InspectionCapaService],
  exports: [InspectionCapaService],
})
export class InspectionCapaModule {}
