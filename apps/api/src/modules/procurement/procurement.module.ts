import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileEntity } from 'src/database/entities/file.entity';
import { EvidenceAuditEntity } from 'src/database/entities/evidence-audit.entity';
import { ProcurementBudgetAuditEntity } from 'src/database/entities/procurement-budget-audit.entity';
import { ProcurementBudgetEntity } from 'src/database/entities/procurement-budget.entity';
import { ProcurementDimensionItemEntity } from 'src/database/entities/procurement-dimension-item.entity';
import { ProcurementOrderApprovalEntity } from 'src/database/entities/procurement-order-approval.entity';
import { ProcurementOrderFileEntity } from 'src/database/entities/procurement-order-file.entity';
import { ProcurementOrderEntity } from 'src/database/entities/procurement-order.entity';
import { ProcurementReportApprovalEntity } from 'src/database/entities/procurement-report-approval.entity';
import { ProcurementReportEntity } from 'src/database/entities/procurement-report.entity';
import { WecomUserEntity } from 'src/database/entities/wecom-user.entity';
import { FilesModule } from 'src/modules/files/files.module';
import { WecomModule } from 'src/modules/wecom/wecom.module';
import { ProcurementController } from './procurement.controller';
import { ProcurementService } from './procurement.service';

@Module({
  imports: [
    FilesModule,
    WecomModule,
    TypeOrmModule.forFeature([
      ProcurementBudgetEntity,
      ProcurementBudgetAuditEntity,
      ProcurementDimensionItemEntity,
      ProcurementOrderEntity,
      ProcurementOrderApprovalEntity,
      ProcurementOrderFileEntity,
      ProcurementReportEntity,
      ProcurementReportApprovalEntity,
      FileEntity,
      EvidenceAuditEntity,
      WecomUserEntity,
    ]),
  ],
  controllers: [ProcurementController],
  providers: [ProcurementService],
})
export class ProcurementModule {}
