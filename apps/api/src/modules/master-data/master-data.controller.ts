import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUserDecorator } from 'src/common/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/interfaces/current-user.interface';
import { AssignmentCreateDto, EquipmentMasterDataDto, MasterDataImportDto, MasterDataListQueryDto, NormalizeReferenceDto, PersonnelMasterDataDto, VesselMasterDataDto } from './dto/master-data.dto';
import { MasterDataService } from './master-data.service';

@Controller('/api/v1/master-data')
@UseGuards(JwtAuthGuard)
export class MasterDataController {
  constructor(private readonly service: MasterDataService) {}
  @Get('vessels') listVessels(@Query() query: MasterDataListQueryDto, @CurrentUserDecorator() user: CurrentUser) { return this.service.listVessels(query, user); }
  @Post('vessels') createVessel(@Body() dto: VesselMasterDataDto, @CurrentUserDecorator() user: CurrentUser) { return this.service.createVessel(dto, user); }
  @Get('vessels/:id') vessel(@Param('id') id: string, @CurrentUserDecorator() user: CurrentUser) { return this.service.getVessel(id, user); }
  @Patch('vessels/:id') updateVessel(@Param('id') id: string, @Body() dto: VesselMasterDataDto, @CurrentUserDecorator() user: CurrentUser) { return this.service.updateVessel(id, dto, user); }
  @Get('personnel') listPersonnel(@Query() query: MasterDataListQueryDto, @CurrentUserDecorator() user: CurrentUser) { return this.service.listPersonnel(query, user); }
  @Post('personnel') createPersonnel(@Body() dto: PersonnelMasterDataDto, @CurrentUserDecorator() user: CurrentUser) { return this.service.createPersonnel(dto, user); }
  @Get('personnel/:id') personnel(@Param('id') id: string, @CurrentUserDecorator() user: CurrentUser) { return this.service.getPersonnel(id, user); }
  @Patch('personnel/:id') updatePersonnel(@Param('id') id: string, @Body() dto: PersonnelMasterDataDto, @CurrentUserDecorator() user: CurrentUser) { return this.service.updatePersonnel(id, dto, user); }
  @Post('assignments') createAssignment(@Body() dto: AssignmentCreateDto, @CurrentUserDecorator() user: CurrentUser) { return this.service.createAssignment(dto, user); }
  @Get('equipment') listEquipment(@Query() query: MasterDataListQueryDto, @CurrentUserDecorator() user: CurrentUser) { return this.service.listEquipment(query, user); }
  @Post('equipment') createEquipment(@Body() dto: EquipmentMasterDataDto, @CurrentUserDecorator() user: CurrentUser) { return this.service.createEquipment(dto, user); }
  @Get('equipment/:id') equipment(@Param('id') id: string, @CurrentUserDecorator() user: CurrentUser) { return this.service.getEquipment(id, user); }
  @Patch('equipment/:id') updateEquipment(@Param('id') id: string, @Body() dto: EquipmentMasterDataDto, @CurrentUserDecorator() user: CurrentUser) { return this.service.updateEquipment(id, dto, user); }
  @Get('selectors/:type') selector(@Param('type') type: string, @Query() query: MasterDataListQueryDto, @CurrentUserDecorator() user: CurrentUser) { return this.service.selector(type, query, user); }
  @Post('imports') async import(@Body() dto: MasterDataImportDto, @CurrentUserDecorator() user: CurrentUser, @Res({ passthrough: true }) response: Response) { const result = await this.service.import(dto, user); response.status(result.replayed ? 200 : 201); return { data: result.data }; }
  @Get('imports/:id') importReport(@Param('id') id: string, @CurrentUserDecorator() user: CurrentUser) { return this.service.getImport(id, user); }
  @Post('references/normalize') @HttpCode(201) normalize(@Body() dto: NormalizeReferenceDto, @CurrentUserDecorator() user: CurrentUser) { return this.service.normalizeReference(dto, user); }
}
