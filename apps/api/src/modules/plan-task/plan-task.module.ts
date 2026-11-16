import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
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
import { PersonnelEntity } from 'src/database/entities/personnel.entity';
import { VesselEntity } from 'src/database/entities/vessel.entity';
import { PlanTaskController } from './plan-task.controller';
import { PlanTaskService } from './plan-task.service';
import { PlanTaskSchedulerService } from './plan-task-scheduler.service';
import { WecomModule } from 'src/modules/wecom/wecom.module';
import { AuthModule } from 'src/modules/auth/auth.module';
import { WecomUserEntity } from 'src/database/entities/wecom-user.entity';

@Module({
  imports: [
    WecomModule,
    AuthModule,
    TypeOrmModule.forFeature([
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
      PersonnelEntity,
      VesselEntity,
      WecomUserEntity,
    ]),
  ],
  controllers: [PlanTaskController],
  providers: [PlanTaskService, PlanTaskSchedulerService],
  exports: [PlanTaskService],
})
export class PlanTaskModule {}
