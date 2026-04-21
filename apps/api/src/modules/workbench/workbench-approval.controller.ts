import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUserDecorator } from 'src/common/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/interfaces/current-user.interface';
import { WorkbenchApprovalCallbackDto } from './dto/workbench-approval-callback.dto';
import { WorkbenchApprovalLaunchDto } from './dto/workbench-approval-launch.dto';
import { WorkbenchApprovalReconcileDto } from './dto/workbench-approval-reconcile.dto';
import { WorkbenchService } from './workbench.service';

@Controller('/api/v1/wecom/approval')
export class WorkbenchApprovalController {
  constructor(private readonly service: WorkbenchService) {}

  @Post('launch')
  @UseGuards(JwtAuthGuard)
  async launchApproval(@Body() dto: WorkbenchApprovalLaunchDto, @CurrentUserDecorator() user: CurrentUser) {
    return { data: this.service.launchApproval(dto, user) };
  }

  @Post('callback')
  async handleCallback(@Body() dto: WorkbenchApprovalCallbackDto) {
    return { data: this.service.handleApprovalCallback(dto) };
  }

  @Get('instances/:processInstanceId')
  @UseGuards(JwtAuthGuard)
  async getInstance(@Param('processInstanceId') processInstanceId: string, @CurrentUserDecorator() user: CurrentUser) {
    return { data: this.service.getApprovalInstance(processInstanceId, user) };
  }

  @Post('reconcile')
  @UseGuards(JwtAuthGuard)
  async reconcile(@Body() dto: WorkbenchApprovalReconcileDto, @CurrentUserDecorator() user: CurrentUser) {
    return { data: this.service.reconcileApprovals(dto, user) };
  }
}
