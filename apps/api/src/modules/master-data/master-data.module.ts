import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MasterDataImportBatchEntity } from 'src/database/entities/master-data-import-batch.entity';
import { CertificateEntity } from 'src/database/entities/certificate.entity';
import { MasterDataImportRowEntity } from 'src/database/entities/master-data-import-row.entity';
import { PersonnelEntity } from 'src/database/entities/personnel.entity';
import { SafetyEquipmentCategoryEntity } from 'src/database/entities/safety-equipment-category.entity';
import { SafetyEquipmentEntity } from 'src/database/entities/safety-equipment.entity';
import { VesselEntity } from 'src/database/entities/vessel.entity';
import { VesselPersonnelAssignmentEntity } from 'src/database/entities/vessel-personnel-assignment.entity';
import { WorkbenchMasterDataReferenceEntity } from 'src/database/entities/workbench-master-data-reference.entity';
import { WorkbenchRecordEntity } from 'src/database/entities/workbench-record.entity';
import { VehicleEntity } from 'src/database/entities/vehicle.entity';
import { MasterDataController } from './master-data.controller';
import { MasterDataService } from './master-data.service';

@Module({ imports: [TypeOrmModule.forFeature([VesselEntity, PersonnelEntity, VehicleEntity, CertificateEntity, SafetyEquipmentCategoryEntity, SafetyEquipmentEntity, VesselPersonnelAssignmentEntity, MasterDataImportBatchEntity, MasterDataImportRowEntity, WorkbenchMasterDataReferenceEntity, WorkbenchRecordEntity])], controllers: [MasterDataController], providers: [MasterDataService], exports: [MasterDataService] })
export class MasterDataModule {}
