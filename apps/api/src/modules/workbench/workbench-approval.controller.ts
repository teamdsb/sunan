import { Body, Controller, Get, Headers, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUserDecorator } from 'src/common/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/interfaces/current-user.interface';
import { WorkbenchApprovalCallbackDto } from './dto/workbench-approval-callback.dto';
import { WorkbenchApprovalInstanceListQueryDto } from './dto/workbench-approval-instance-list-query.dto';
import { WorkbenchApprovalLaunchDto } from './dto/workbench-approval-launch.dto';
import { WorkbenchApprovalReconcileDto } from './dto/workbench-approval-reconcile.dto';
import { WorkbenchApprovalRetryDto } from './dto/workbench-approval-retry.dto';
import { WorkbenchService } from './workbench.service';

@Controller('/api/v1/wecom/approval')
export class WorkbenchApprovalController {
  constructor(private readonly service: WorkbenchService) {}

  @Post('launch')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async launchApproval(@Body() dto: WorkbenchApprovalLaunchDto, @CurrentUserDecorator() user: CurrentUser) {
    return { data: await this.service.launchApproval(dto, user) };
  }

  @Post('callback')
  @HttpCode(200)
  async handleCallback(
    @Body() dto: WorkbenchApprovalCallbackDto,
    @Headers('x-wecom-signature') xWecomSignature: string | undefined,
    @Query('msg_signature') msgSignature: string | undefined,
    @Headers('x-wecom-timestamp') xWecomTimestamp: string | undefined,
    @Query('timestamp') queryTimestamp: string | undefined,
    @Headers('x-wecom-nonce') xWecomNonce: string | undefined,
    @Query('nonce') queryNonce: string | undefined,
    @Headers('x-forwarded-for') xForwardedFor: string | undefined,
    @Headers('x-real-ip') xRealIp: string | undefined,
  ) {
    return {
      data: await this.service.handleApprovalCallback(dto, {
        signature: xWecomSignature ?? msgSignature ?? null,
        timestamp: xWecomTimestamp ?? queryTimestamp ?? null,
        nonce: xWecomNonce ?? queryNonce ?? null,
        requestIp: xForwardedFor?.split(',')[0]?.trim() ?? xRealIp?.trim() ?? null,
      }),
    };
  }

  @Get('instances')
  @UseGuards(JwtAuthGuard)
  async listInstances(@Query() query: WorkbenchApprovalInstanceListQueryDto, @CurrentUserDecorator() user: CurrentUser) {
    return this.service.listApprovalInstances(query, user);
  }

  @Get('instances/:processInstanceId')
  @UseGuards(JwtAuthGuard)
  async getInstance(@Param('processInstanceId') processInstanceId: string, @CurrentUserDecorator() user: CurrentUser) {
    return { data: await this.service.getApprovalInstance(processInstanceId, user) };
  }

  @Post('reconcile')
  @HttpCode(202)
  @UseGuards(JwtAuthGuard)
  async reconcile(@Body() dto: WorkbenchApprovalReconcileDto, @CurrentUserDecorator() user: CurrentUser) {
    return { data: await this.service.reconcileApprovals(dto, user) };
  }

  @Post('retry')
  @HttpCode(202)
  @UseGuards(JwtAuthGuard)
  async retryApproval(@Body() dto: WorkbenchApprovalRetryDto, @CurrentUserDecorator() user: CurrentUser) {
    return { data: await this.service.retryApproval(dto, user) };
  }
}
