import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CertificateReminderEntity } from 'src/database/entities/certificate-reminder.entity';
import { CertificateFileEntity } from 'src/database/entities/certificate-file.entity';
import { FileEntity } from 'src/database/entities/file.entity';
import { CertificateTypeEntity } from 'src/database/entities/certificate-type.entity';
import { CertificateEntity } from 'src/database/entities/certificate.entity';
import { PersonnelEntity } from 'src/database/entities/personnel.entity';
import { SafetyEquipmentEntity } from 'src/database/entities/safety-equipment.entity';
import { VesselEntity } from 'src/database/entities/vessel.entity';
import { VehicleEntity } from 'src/database/entities/vehicle.entity';
import { WecomUserEntity } from 'src/database/entities/wecom-user.entity';
import { WecomModule } from 'src/modules/wecom/wecom.module';

import { CertificateReminderEngineService } from './certificate-reminder-engine.service';
import { CertificateReminderJobService } from './certificate-reminder-job.service';
import { ReminderClockService } from './reminder-clock.service';
import { ReminderController } from './reminder.controller';
import { ReminderSchedulerService } from './reminder-scheduler.service';
import { ReminderService } from './reminder.service';

@Global()
@Module({
  imports: [
    WecomModule,
    TypeOrmModule.forFeature([
      CertificateReminderEntity,
      CertificateFileEntity,
      FileEntity,
      CertificateEntity,
      CertificateTypeEntity,
      VesselEntity,
      VehicleEntity,
      PersonnelEntity,
      SafetyEquipmentEntity,
      WecomUserEntity,
    ]),
  ],
  controllers: [ReminderController],
  providers: [
    ReminderClockService,
    CertificateReminderEngineService,
    CertificateReminderJobService,
    ReminderService,
    ReminderSchedulerService,
  ],
  exports: [
    ReminderClockService,
    CertificateReminderEngineService,
    CertificateReminderJobService,
    ReminderService,
  ],
})
export class ReminderModule {}
