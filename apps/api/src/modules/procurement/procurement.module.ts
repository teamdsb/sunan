import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileEntity } from 'src/database/entities/file.entity';
import { ProcurementOrderApprovalEntity } from 'src/database/entities/procurement-order-approval.entity';
import { ProcurementOrderFileEntity } from 'src/database/entities/procurement-order-file.entity';
import { ProcurementOrderEntity } from 'src/database/entities/procurement-order.entity';
import { ProcurementReportApprovalEntity } from 'src/database/entities/procurement-report-approval.entity';
import { ProcurementReportEntity } from 'src/database/entities/procurement-report.entity';
import { ProcurementController } from './procurement.controller';
import { ProcurementService } from './procurement.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProcurementOrderEntity,
      ProcurementOrderApprovalEntity,
      ProcurementOrderFileEntity,
      ProcurementReportEntity,
      ProcurementReportApprovalEntity,
      FileEntity,
    ]),
  ],
  controllers: [ProcurementController],
  providers: [ProcurementService],
})
export class ProcurementModule {}
