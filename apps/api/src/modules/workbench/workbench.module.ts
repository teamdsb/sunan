import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileEntity } from 'src/database/entities/file.entity';
import { WecomApprovalCallbackEventEntity } from 'src/database/entities/wecom-approval-callback-event.entity';
import { WecomApprovalInstanceSyncEntity } from 'src/database/entities/wecom-approval-instance-sync.entity';
import { WecomApprovalTemplateBindingEntity } from 'src/database/entities/wecom-approval-template-binding.entity';
import { WorkbenchModuleEntity } from 'src/database/entities/workbench-module.entity';
import { WorkbenchPrintSnapshotEntity } from 'src/database/entities/workbench-print-snapshot.entity';
import { WorkbenchRecordActionLogEntity } from 'src/database/entities/workbench-record-action-log.entity';
import { WorkbenchRecordAttachmentEntity } from 'src/database/entities/workbench-record-attachment.entity';
import { WorkbenchRecordEntity } from 'src/database/entities/workbench-record.entity';
import { WorkbenchRecordStepEntity } from 'src/database/entities/workbench-record-step.entity';
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
      WorkbenchRecordStepEntity,
      WorkbenchRecordAttachmentEntity,
      WorkbenchRecordActionLogEntity,
      WorkbenchPrintSnapshotEntity,
      WecomApprovalTemplateBindingEntity,
      WecomApprovalInstanceSyncEntity,
      WecomApprovalCallbackEventEntity,
      FileEntity,
    ]),
  ],
  controllers: [WorkbenchController, WorkbenchApprovalController],
  providers: [WorkbenchService],
})
export class WorkbenchModule {}
