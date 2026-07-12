import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileEntity } from 'src/database/entities/file.entity';
import { EvidenceRecordEntity } from 'src/database/entities/evidence-record.entity';
import { ExportJobEntity } from 'src/database/entities/export-job.entity';
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
import { FilesModule } from 'src/modules/files/files.module';
import { WecomModule } from 'src/modules/wecom/wecom.module';
import { WorkbenchApprovalController } from './workbench-approval.controller';
import { WorkbenchController } from './workbench.controller';
import { WorkbenchService } from './workbench.service';

@Module({
  imports: [
    FilesModule,
    WecomModule,
    TypeOrmModule.forFeature([
      WorkbenchModuleEntity,
      WorkbenchTemplateEntity,
      WorkbenchRecordEntity,
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
      FileEntity,
      EvidenceRecordEntity,
      ExportJobEntity,
    ]),
  ],
  controllers: [WorkbenchController, WorkbenchApprovalController],
  providers: [WorkbenchService],
})
export class WorkbenchModule {}
