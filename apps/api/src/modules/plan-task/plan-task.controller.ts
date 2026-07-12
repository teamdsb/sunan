import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { CurrentUserDecorator } from 'src/common/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import type { CurrentUser } from 'src/common/interfaces/current-user.interface';

import {
  GenerationRequestDto,
  PlanActionDto,
  PlanInputDto,
  PlanItemInputDto,
  PlanListQueryDto,
  PaginationQueryDto,
  TaskActionDto,
  TaskListQueryDto,
} from './dto/plan-task.dto';
import { PlanTaskService } from './plan-task.service';

@Controller('/api/v1')
@UseGuards(JwtAuthGuard)
export class PlanTaskController {
  constructor(private readonly service: PlanTaskService) {}

  @Post('plans')
  async create(@CurrentUserDecorator() user: CurrentUser, @Body() body: PlanInputDto) {
    return { data: await this.service.createPlan(user, body) };
  }

  @Get('plans')
  plans(@CurrentUserDecorator() user: CurrentUser, @Query() query: PlanListQueryDto) {
    return this.service.listPlans(user, query);
  }

  @Get('plans/:planId')
  async plan(@Param('planId') planId: string, @CurrentUserDecorator() user: CurrentUser) {
    return { data: await this.service.getPlan(planId, user) };
  }

  @Patch('plans/:planId')
  async updatePlan(
    @Param('planId') planId: string,
    @CurrentUserDecorator() user: CurrentUser,
    @Body() body: PlanInputDto,
  ) {
    return { data: await this.service.updatePlan(planId, user, body) };
  }

  @Post('plans/:planId/actions')
  @HttpCode(200)
  async planAction(
    @Param('planId') planId: string,
    @CurrentUserDecorator() user: CurrentUser,
    @Body() body: PlanActionDto,
  ) {
    return { data: await this.service.changePlanStatus(planId, user, body) };
  }

  @Get('plans/:planId/items')
  async listItems(@Param('planId') planId: string, @CurrentUserDecorator() user: CurrentUser) {
    return { data: await this.service.listItems(planId, user) };
  }

  @Post('plans/:planId/items')
  async addItem(
    @Param('planId') planId: string,
    @CurrentUserDecorator() user: CurrentUser,
    @Body() body: PlanItemInputDto,
  ) {
    return { data: await this.service.addItem(planId, user, body) };
  }

  @Patch('plans/:planId/items/:itemId')
  async updateItem(
    @Param('planId') planId: string,
    @Param('itemId') itemId: string,
    @CurrentUserDecorator() user: CurrentUser,
    @Body() body: PlanItemInputDto,
  ) {
    return { data: await this.service.updateItem(planId, itemId, user, body) };
  }

  @Get('plans/:planId/generation-runs')
  generationRuns(
    @Param('planId') planId: string,
    @CurrentUserDecorator() user: CurrentUser,
    @Query() query: PaginationQueryDto,
  ) {
    return this.service.listGenerationRuns(planId, user, query);
  }

  @Post('plans/:planId/generation-runs')
  @HttpCode(202)
  async generate(
    @Param('planId') planId: string,
    @CurrentUserDecorator() user: CurrentUser,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: GenerationRequestDto,
  ) {
    return {
      data: await this.service.generate(planId, user, body, this.requireIdempotencyKey(idempotencyKey)),
    };
  }

  @Get('tasks')
  list(@CurrentUserDecorator() user: CurrentUser, @Query() query: TaskListQueryDto) {
    return this.service.listTasks(user, query);
  }

  @Get('tasks/:taskId')
  async detail(@Param('taskId') taskId: string, @CurrentUserDecorator() user: CurrentUser) {
    return { data: await this.service.getTask(taskId, user) };
  }

  @Post('tasks/:taskId/actions')
  @HttpCode(200)
  async action(
    @Param('taskId') taskId: string,
    @CurrentUserDecorator() user: CurrentUser,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: TaskActionDto,
  ) {
    return {
      data: await this.service.act(taskId, user, body, this.requireIdempotencyKey(idempotencyKey)),
    };
  }

  @Get('tasks/:taskId/notification-deliveries')
  async deliveries(@Param('taskId') taskId: string, @CurrentUserDecorator() user: CurrentUser) {
    return { data: await this.service.listDeliveries(taskId, user) };
  }

  @Post('tasks/:taskId/notification-deliveries/:deliveryId/retry')
  @HttpCode(202)
  async retry(
    @Param('taskId') taskId: string,
    @Param('deliveryId') deliveryId: string,
    @CurrentUserDecorator() user: CurrentUser,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
  ) {
    return {
      data: await this.service.retryDelivery(
        taskId,
        deliveryId,
        user,
        this.requireIdempotencyKey(idempotencyKey),
      ),
    };
  }

  @Post('task-notification-deliveries/actions/process')
  @HttpCode(202)
  async processDeliveryQueue(@CurrentUserDecorator() user: CurrentUser) {
    return { data: await this.service.processDueDeliveries(user) };
  }

  @Post('plan-task-jobs/actions/run')
  @HttpCode(202)
  async runScheduledCycle(@CurrentUserDecorator() user: CurrentUser) {
    if (!user.isAdmin && !user.roles.includes('system_admin')) {
      throw new ForbiddenException('System administrator permission is required');
    }
    return { data: await this.service.runScheduledCycle() };
  }

  private requireIdempotencyKey(value?: string) {
    const key = value?.trim();
    if (!key) throw new BadRequestException('Idempotency-Key is required');
    if (key.length < 16 || key.length > 128) throw new BadRequestException('Idempotency-Key must contain 16 to 128 characters');
    return key;
  }
}
