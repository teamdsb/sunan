import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OfficeCategoryEntity } from 'src/database/entities/office-category.entity';
import { OfficeEntryAuditEntity } from 'src/database/entities/office-entry-audit.entity';
import { OfficeEntryEntity } from 'src/database/entities/office-entry.entity';
import { OfficeController } from './office.controller';
import { OfficeService } from './office.service';

@Module({
  imports: [TypeOrmModule.forFeature([OfficeCategoryEntity, OfficeEntryEntity, OfficeEntryAuditEntity])],
  controllers: [OfficeController],
  providers: [OfficeService],
})
export class OfficeModule {}
