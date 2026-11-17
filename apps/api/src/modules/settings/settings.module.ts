import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WecomUserEntity } from 'src/database/entities/wecom-user.entity';
import { WecomMessageDeliveryEntity } from 'src/database/entities/wecom-message-delivery.entity';
import { CertificateReminderEntity } from 'src/database/entities/certificate-reminder.entity';
import { SafetyTaskNotificationDeliveryEntity } from 'src/database/entities/safety-plan-task.entity';
import { AuthModule } from 'src/modules/auth/auth.module';
import { WecomModule } from 'src/modules/wecom/wecom.module';
import { ProcurementModule } from 'src/modules/procurement/procurement.module';
import { PlanTaskModule } from 'src/modules/plan-task/plan-task.module';
import { ReminderModule } from 'src/modules/reminder/reminder.module';
import { UserSettingsEntity } from 'src/database/entities/user-settings.entity';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

@Module({
  imports: [AuthModule, WecomModule, ProcurementModule, PlanTaskModule, ReminderModule, TypeOrmModule.forFeature([UserSettingsEntity, WecomUserEntity, WecomMessageDeliveryEntity, CertificateReminderEntity, SafetyTaskNotificationDeliveryEntity])],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}

