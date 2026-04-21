import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WecomApprovalCallbackEventEntity } from 'src/database/entities/wecom-approval-callback-event.entity';
import { WecomApprovalInstanceSyncEntity } from 'src/database/entities/wecom-approval-instance-sync.entity';
import { WorkbenchPrintSnapshotEntity } from 'src/database/entities/workbench-print-snapshot.entity';
import { WorkbenchRecordActionLogEntity } from 'src/database/entities/workbench-record-action-log.entity';
import { WorkbenchRecordAttachmentEntity } from 'src/database/entities/workbench-record-attachment.entity';
import { WorkbenchRecordEntity } from 'src/database/entities/workbench-record.entity';
import { WorkbenchRecordStepEntity } from 'src/database/entities/workbench-record-step.entity';
import { WorkbenchApprovalController } from './workbench-approval.controller';
import { WorkbenchController } from './workbench.controller';
import { WorkbenchService } from './workbench.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkbenchRecordEntity,
      WorkbenchRecordStepEntity,
      WorkbenchRecordAttachmentEntity,
      WorkbenchRecordActionLogEntity,
      WorkbenchPrintSnapshotEntity,
      WecomApprovalInstanceSyncEntity,
      WecomApprovalCallbackEventEntity,
    ]),
  ],
  controllers: [WorkbenchController, WorkbenchApprovalController],
  providers: [WorkbenchService],
})
export class WorkbenchModule {}
