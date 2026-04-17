import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUserDecorator } from 'src/common/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/interfaces/current-user.interface';
import { ProcurementApprovalActionDto } from './dto/procurement-approval-action.dto';
import { ProcurementApprovalListQueryDto } from './dto/procurement-approval-list-query.dto';
import { ProcurementOrderBindFilesDto } from './dto/procurement-order-bind-files.dto';
import { ProcurementOrderCreateDto } from './dto/procurement-order-create.dto';
import { ProcurementOrderListQueryDto } from './dto/procurement-order-list-query.dto';
import { ProcurementOrderUpdateDto } from './dto/procurement-order-update.dto';
import { ProcurementService } from './procurement.service';

@Controller('/api/v1/procurement')
@UseGuards(JwtAuthGuard)
export class ProcurementController {
  constructor(private readonly service: ProcurementService) {}

  @Get('orders')
  async listOrders(@Query() query: ProcurementOrderListQueryDto, @CurrentUserDecorator() user: CurrentUser) {
    return this.service.listOrders(query, user);
  }

  @Post('orders')
  async createOrder(@Body() dto: ProcurementOrderCreateDto, @CurrentUserDecorator() user: CurrentUser) {
    return { data: await this.service.createOrderDraft(dto, user) };
  }

  @Get('orders/:id')
  async getOrderDetail(@Param('id') id: string, @CurrentUserDecorator() user: CurrentUser) {
    return { data: await this.service.getOrderDetail(id, user) };
  }

  @Patch('orders/:id')
  async updateOrderDraft(@Param('id') id: string, @Body() dto: ProcurementOrderUpdateDto, @CurrentUserDecorator() user: CurrentUser) {
    return { data: await this.service.updateOrderDraft(id, dto, user) };
  }

  @Post('orders/:id/submit')
  async submitOrder(@Param('id') id: string, @CurrentUserDecorator() user: CurrentUser) {
    return { data: await this.service.submitOrder(id, user) };
  }

  @Post('orders/:id/resubmit')
  async resubmitOrder(@Param('id') id: string, @CurrentUserDecorator() user: CurrentUser) {
    return { data: await this.service.resubmitOrder(id, user) };
  }

  @Post('orders/:id/attachments')
  async bindOrderAttachments(@Param('id') id: string, @Body() dto: ProcurementOrderBindFilesDto, @CurrentUserDecorator() user: CurrentUser) {
    return { data: await this.service.bindOrderAttachments(id, dto, user) };
  }

  @Get('approvals/pending')
  async listPendingApprovals(@Query() query: ProcurementApprovalListQueryDto, @CurrentUserDecorator() user: CurrentUser) {
    return { data: await this.service.listPendingApprovals(query, user) };
  }

  @Get('orders/:id/approvals')
  async listOrderApprovals(@Param('id') id: string, @CurrentUserDecorator() user: CurrentUser) {
    return { data: await this.service.listOrderApprovals(id, user) };
  }

  @Post('orders/:id/approvals/actions')
  async actionOrderApproval(@Param('id') id: string, @Body() dto: ProcurementApprovalActionDto, @CurrentUserDecorator() user: CurrentUser) {
    return { data: await this.service.actionOrderApproval(id, dto, user) };
  }
}
