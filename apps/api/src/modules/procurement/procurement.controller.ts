import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUserDecorator } from 'src/common/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/interfaces/current-user.interface';
import { ProcurementApprovalActionDto } from './dto/procurement-approval-action.dto';
import { ProcurementApprovalListQueryDto } from './dto/procurement-approval-list-query.dto';
import { ProcurementBudgetCreateDto } from './dto/procurement-budget-create.dto';
import { ProcurementBudgetListQueryDto } from './dto/procurement-budget-list-query.dto';
import { ProcurementBudgetSummaryQueryDto } from './dto/procurement-budget-summary-query.dto';
import { ProcurementBudgetUpdateDto } from './dto/procurement-budget-update.dto';
import { ProcurementDimensionCreateDto } from './dto/procurement-dimension-create.dto';
import { ProcurementDimensionListQueryDto } from './dto/procurement-dimension-list-query.dto';
import { ProcurementDimensionUpdateDto } from './dto/procurement-dimension-update.dto';
import { ProcurementOrderBindFilesDto } from './dto/procurement-order-bind-files.dto';
import { ProcurementOrderAttachmentUnlinkDto } from './dto/procurement-order-attachment-unlink.dto';
import { ProcurementOrderCreateDto } from './dto/procurement-order-create.dto';
import { ProcurementOrderListQueryDto } from './dto/procurement-order-list-query.dto';
import { ProcurementOrderUpdateDto } from './dto/procurement-order-update.dto';
import { ProcurementReportDepartmentDetailsQueryDto } from './dto/procurement-report-department-details-query.dto';
import { ProcurementReportDimensionDetailsQueryDto } from './dto/procurement-report-dimension-details-query.dto';
import { ProcurementReportMonthlyQueryDto } from './dto/procurement-report-monthly-query.dto';
import { ProcurementReportRequestCreateDto } from './dto/procurement-report-request-create.dto';
import { ProcurementReportRequestListQueryDto } from './dto/procurement-report-request-list-query.dto';
import { ProcurementReportYearlyQueryDto } from './dto/procurement-report-yearly-query.dto';
import { ProcurementService } from './procurement.service';

@Controller('/api/v1/procurement')
@UseGuards(JwtAuthGuard)
export class ProcurementController {
  constructor(private readonly service: ProcurementService) {}

  @Get('budgets/summary')
  async getBudgetSummary(
    @Query() query: ProcurementBudgetSummaryQueryDto,
    @CurrentUserDecorator() user: CurrentUser,
  ) {
    return { data: await this.service.getBudgetSummary(query.year, user) };
  }

  @Get('admin/budgets')
  async listBudgets(
    @Query() query: ProcurementBudgetListQueryDto,
    @CurrentUserDecorator() user: CurrentUser,
  ) {
    return { data: await this.service.listBudgets(query, user) };
  }

  @Post('admin/budgets')
  async createBudget(
    @Body() dto: ProcurementBudgetCreateDto,
    @CurrentUserDecorator() user: CurrentUser,
  ) {
    return { data: await this.service.createBudget(dto, user) };
  }

  @Patch('admin/budgets/:id')
  async updateBudget(
    @Param('id') id: string,
    @Body() dto: ProcurementBudgetUpdateDto,
    @CurrentUserDecorator() user: CurrentUser,
  ) {
    return { data: await this.service.updateBudget(id, dto, user) };
  }

  @Get('admin/budgets/:id/audits')
  async listBudgetAudits(
    @Param('id') id: string,
    @CurrentUserDecorator() user: CurrentUser,
  ) {
    return { data: await this.service.listBudgetAudits(id, user) };
  }

  @Get('dimensions')
  async listDimensionItems(
    @Query() query: ProcurementDimensionListQueryDto,
    @CurrentUserDecorator() user: CurrentUser,
  ) {
    return { data: await this.service.listDimensionItems(query, user) };
  }

  @Post('admin/dimensions')
  async createDimensionItem(
    @Body() dto: ProcurementDimensionCreateDto,
    @CurrentUserDecorator() user: CurrentUser,
  ) {
    return { data: await this.service.createDimensionItem(dto, user) };
  }

  @Patch('admin/dimensions/:id')
  async updateDimensionItem(
    @Param('id') id: string,
    @Body() dto: ProcurementDimensionUpdateDto,
    @CurrentUserDecorator() user: CurrentUser,
  ) {
    return { data: await this.service.updateDimensionItem(id, dto, user) };
  }

  @Delete('admin/dimensions/:id')
  @HttpCode(204)
  async disableDimensionItem(
    @Param('id') id: string,
    @CurrentUserDecorator() user: CurrentUser,
  ) {
    await this.service.disableDimensionItem(id, user);
  }

  @Get('orders')
  async listOrders(
    @Query() query: ProcurementOrderListQueryDto,
    @CurrentUserDecorator() user: CurrentUser,
  ) {
    return this.service.listOrders(query, user);
  }

  @Post('orders')
  async createOrder(
    @Body() dto: ProcurementOrderCreateDto,
    @CurrentUserDecorator() user: CurrentUser,
  ) {
    return { data: await this.service.createOrderDraft(dto, user) };
  }

  @Get('orders/:id')
  async getOrderDetail(
    @Param('id') id: string,
    @CurrentUserDecorator() user: CurrentUser,
  ) {
    return { data: await this.service.getOrderDetail(id, user) };
  }

  @Patch('orders/:id')
  async updateOrderDraft(
    @Param('id') id: string,
    @Body() dto: ProcurementOrderUpdateDto,
    @CurrentUserDecorator() user: CurrentUser,
  ) {
    return { data: await this.service.updateOrderDraft(id, dto, user) };
  }

  @Post('orders/:id/submit')
  async submitOrder(
    @Param('id') id: string,
    @CurrentUserDecorator() user: CurrentUser,
  ) {
    return { data: await this.service.submitOrder(id, user) };
  }

  @Post('orders/:id/resubmit')
  async resubmitOrder(
    @Param('id') id: string,
    @CurrentUserDecorator() user: CurrentUser,
  ) {
    return { data: await this.service.resubmitOrder(id, user) };
  }

  @Post('orders/:id/attachments')
  async bindOrderAttachments(
    @Param('id') id: string,
    @Body() dto: ProcurementOrderBindFilesDto,
    @CurrentUserDecorator() user: CurrentUser,
  ) {
    return { data: await this.service.bindOrderAttachments(id, dto, user) };
  }

  @Delete('orders/:id/attachments/:fileId')
  @HttpCode(204)
  async unlinkOrderAttachment(
    @Param('id') id: string,
    @Param('fileId') fileId: string,
    @Body() dto: ProcurementOrderAttachmentUnlinkDto,
    @CurrentUserDecorator() user: CurrentUser,
  ) {
    await this.service.unlinkOrderAttachment(id, fileId, dto.reason, user);
  }

  @Get('orders/:id/attachments/:fileId/download-url')
  async getOrderAttachmentDownloadUrl(
    @Param('id') id: string,
    @Param('fileId') fileId: string,
    @CurrentUserDecorator() user: CurrentUser,
  ) {
    return {
      data: await this.service.getOrderAttachmentDownloadUrl(id, fileId, user),
    };
  }

  @Post('orders/:id/print')
  async printOrder(
    @Param('id') id: string,
    @CurrentUserDecorator() user: CurrentUser,
  ) {
    return { data: await this.service.printOrder(id, user) };
  }

  @Get('approvals/pending')
  async listPendingApprovals(
    @Query() query: ProcurementApprovalListQueryDto,
    @CurrentUserDecorator() user: CurrentUser,
  ) {
    return { data: await this.service.listPendingApprovals(query, user) };
  }

  @Get('orders/:id/approvals')
  async listOrderApprovals(
    @Param('id') id: string,
    @CurrentUserDecorator() user: CurrentUser,
  ) {
    return { data: await this.service.listOrderApprovals(id, user) };
  }

  @Post('orders/:id/approvals/actions')
  async actionOrderApproval(
    @Param('id') id: string,
    @Body() dto: ProcurementApprovalActionDto,
    @CurrentUserDecorator() user: CurrentUser,
  ) {
    return { data: await this.service.actionOrderApproval(id, dto, user) };
  }

  @Get('reports/monthly')
  async getMonthlyReport(
    @Query() query: ProcurementReportMonthlyQueryDto,
    @CurrentUserDecorator() user: CurrentUser,
  ) {
    return { data: await this.service.getMonthlyReport(query, user) };
  }

  @Get('reports/yearly')
  async getYearlyReport(
    @Query() query: ProcurementReportYearlyQueryDto,
    @CurrentUserDecorator() user: CurrentUser,
  ) {
    return { data: await this.service.getYearlyReport(query, user) };
  }

  @Get('reports/department-details')
  async getDepartmentDetails(
    @Query() query: ProcurementReportDepartmentDetailsQueryDto,
    @CurrentUserDecorator() user: CurrentUser,
  ) {
    return { data: await this.service.getDepartmentDetails(query, user) };
  }

  @Get('reports/dimension-details')
  async getDimensionDetails(
    @Query() query: ProcurementReportDimensionDetailsQueryDto,
    @CurrentUserDecorator() user: CurrentUser,
  ) {
    return { data: await this.service.getDimensionDetails(query, user) };
  }

  @Get('report-requests')
  async listReportRequests(
    @Query() query: ProcurementReportRequestListQueryDto,
    @CurrentUserDecorator() user: CurrentUser,
  ) {
    return this.service.listReportRequests(query, user);
  }

  @Post('report-requests')
  async createReportRequest(
    @Body() dto: ProcurementReportRequestCreateDto,
    @CurrentUserDecorator() user: CurrentUser,
  ) {
    return { data: await this.service.createReportRequestDraft(dto, user) };
  }

  @Get('report-requests/:id')
  async getReportRequestDetail(
    @Param('id') id: string,
    @CurrentUserDecorator() user: CurrentUser,
  ) {
    return { data: await this.service.getReportRequestDetail(id, user) };
  }

  @Post('report-requests/:id/submit')
  async submitReportRequest(
    @Param('id') id: string,
    @CurrentUserDecorator() user: CurrentUser,
  ) {
    return { data: await this.service.submitReportRequest(id, user) };
  }

  @Post('report-requests/:id/print')
  async printReportRequest(
    @Param('id') id: string,
    @CurrentUserDecorator() user: CurrentUser,
  ) {
    return { data: await this.service.printReportRequest(id, user) };
  }

  @Get('reports/:id/approvals')
  async listReportApprovals(
    @Param('id') id: string,
    @CurrentUserDecorator() user: CurrentUser,
  ) {
    return { data: await this.service.listReportApprovals(id, user) };
  }

  @Post('reports/:id/approvals/actions')
  async actionReportApproval(
    @Param('id') id: string,
    @Body() dto: ProcurementApprovalActionDto,
    @CurrentUserDecorator() user: CurrentUser,
  ) {
    return { data: await this.service.actionReportApproval(id, dto, user) };
  }
}
