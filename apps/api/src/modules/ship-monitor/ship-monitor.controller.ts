import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUserDecorator } from 'src/common/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/interfaces/current-user.interface';
import { ShipMonitorCreateDto } from './dto/ship-monitor-create.dto';
import { ShipMonitorListQueryDto } from './dto/ship-monitor-list-query.dto';
import { ShipMonitorUpdateDto } from './dto/ship-monitor-update.dto';
import { ShipMonitorService } from './ship-monitor.service';

@Controller('/api/v1/ship-monitors')
@UseGuards(JwtAuthGuard)
export class ShipMonitorController {
  constructor(private readonly service: ShipMonitorService) {}

  @Get()
  async list(@Query() query: ShipMonitorListQueryDto, @CurrentUserDecorator() user: CurrentUser) {
    return { data: await this.service.list(query, user) };
  }

  @Get('vessels/:vesselId')
  async listByVessel(@Param('vesselId') vesselId: string, @CurrentUserDecorator() user: CurrentUser) {
    return { data: await this.service.listByVessel(vesselId, user) };
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return { data: await this.service.getById(id) };
  }

  @Post()
  async create(@Body() dto: ShipMonitorCreateDto, @CurrentUserDecorator() user: CurrentUser) {
    return { data: await this.service.create(dto, user) };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: ShipMonitorUpdateDto, @CurrentUserDecorator() user: CurrentUser) {
    return { data: await this.service.update(id, dto, user) };
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string, @CurrentUserDecorator() user: CurrentUser) {
    await this.service.remove(id, user);
  }
}

