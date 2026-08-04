import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CertificateTypeEntity } from 'src/database/entities/certificate-type.entity';
import { CertificateEntity } from 'src/database/entities/certificate.entity';
import { CertificateFileEntity } from 'src/database/entities/certificate-file.entity';
import { FileEntity } from 'src/database/entities/file.entity';
import { PersonnelEntity } from 'src/database/entities/personnel.entity';
import { SafetyEquipmentEntity } from 'src/database/entities/safety-equipment.entity';
import { VesselEntity } from 'src/database/entities/vessel.entity';
import { VehicleEntity } from 'src/database/entities/vehicle.entity';
import { CertificateController } from './certificate.controller';
import { CertificateReferenceController } from './certificate-reference.controller';
import { CertificateService } from './certificate.service';
import { OssService } from 'src/modules/files/oss.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CertificateEntity,
      CertificateFileEntity,
      CertificateTypeEntity,
      FileEntity,
      VesselEntity,
      VehicleEntity,
      PersonnelEntity,
      SafetyEquipmentEntity,
    ]),
  ],
  controllers: [CertificateController, CertificateReferenceController],
  providers: [CertificateService, OssService],
  exports: [CertificateService],
})
export class CertificateModule {}
