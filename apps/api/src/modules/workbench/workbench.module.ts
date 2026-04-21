import { Module } from '@nestjs/common';
import { WorkbenchApprovalController } from './workbench-approval.controller';
import { WorkbenchController } from './workbench.controller';
import { WorkbenchService } from './workbench.service';

@Module({
  controllers: [WorkbenchController, WorkbenchApprovalController],
  providers: [WorkbenchService],
})
export class WorkbenchModule {}
