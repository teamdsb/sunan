import { BadRequestException, Body, Controller, Get, Headers, HttpCode, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CurrentUserDecorator } from 'src/common/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import type { CurrentUser } from 'src/common/interfaces/current-user.interface';
import {
  AcceptCapaActionDto, CloseIssueDto, CreateCapaActionDto, CreateCapaDto, CreateInspectionPlanDto, CreateIssueDto, CreateTemplateDto, CreateTemplateVersionDto,
  InspectionGenerationDto, InspectionListQueryDto, IssueListQueryDto, RootCauseDto, SaveInspectionResultDto, SubmitCapaActionDto, SubmitInspectionDto, VerificationDto,
} from './dto/inspection-capa.dto';
import { InspectionCapaService } from './inspection-capa.service';

@Controller('/api/v1')
@UseGuards(JwtAuthGuard)
export class InspectionCapaController {
  constructor(private readonly service: InspectionCapaService) {}

  @Get('inspection-templates') templates(@CurrentUserDecorator() user: CurrentUser) { return this.service.listTemplates(user); }
  @Post('inspection-templates') async createTemplate(@CurrentUserDecorator() user: CurrentUser, @Headers('idempotency-key') key: string | undefined, @Body() body: CreateTemplateDto) { return { data: await this.service.createTemplate(user, body, this.key(key)) }; }
  @Get('inspection-templates/:templateId/versions') versions(@Param('templateId') templateId: string, @CurrentUserDecorator() user: CurrentUser) { return this.service.listTemplateVersions(templateId, user); }
  @Post('inspection-templates/:templateId/versions') async createVersion(@Param('templateId') templateId: string, @CurrentUserDecorator() user: CurrentUser, @Headers('idempotency-key') key: string | undefined, @Body() body: CreateTemplateVersionDto) { return { data: await this.service.createTemplateVersion(templateId, user, body, this.key(key)) }; }
  @Post('inspection-template-versions/:versionId/publish') @HttpCode(200) async publish(@Param('versionId') versionId: string, @CurrentUserDecorator() user: CurrentUser, @Headers('idempotency-key') key: string | undefined) { return { data: await this.service.publishTemplateVersion(versionId, user, this.key(key)) }; }

  @Get('inspection-plans') plans(@CurrentUserDecorator() user: CurrentUser) { return this.service.listInspectionPlans(user); }
  @Post('inspection-plans') async createPlan(@CurrentUserDecorator() user: CurrentUser, @Headers('idempotency-key') key: string | undefined, @Body() body: CreateInspectionPlanDto) { return { data: await this.service.createInspectionPlan(user, body, this.key(key)) }; }
  @Post('inspection-plans/:inspectionPlanId/generation-runs') @HttpCode(202) async generate(@Param('inspectionPlanId') inspectionPlanId: string, @CurrentUserDecorator() user: CurrentUser, @Headers('idempotency-key') key: string | undefined, @Body() body: InspectionGenerationDto) { return { data: await this.service.generateInspectionPlan(inspectionPlanId, user, body, this.key(key)) }; }

  @Get('inspections') inspections(@CurrentUserDecorator() user: CurrentUser, @Query() query: InspectionListQueryDto) { return this.service.listInspections(user, query); }
  @Get('inspections/:inspectionId') async inspection(@Param('inspectionId') inspectionId: string, @CurrentUserDecorator() user: CurrentUser) { return { data: await this.service.getInspection(inspectionId, user) }; }
  @Post('inspections/:inspectionId/results') @HttpCode(200) async saveResult(@Param('inspectionId') inspectionId: string, @CurrentUserDecorator() user: CurrentUser, @Headers('idempotency-key') key: string | undefined, @Body() body: SaveInspectionResultDto) { return { data: await this.service.saveInspectionResult(inspectionId, user, body, this.key(key)) }; }
  @Post('inspections/:inspectionId/submit') @HttpCode(200) async submitInspection(@Param('inspectionId') inspectionId: string, @CurrentUserDecorator() user: CurrentUser, @Headers('idempotency-key') key: string | undefined, @Body() body: SubmitInspectionDto) { return { data: await this.service.submitInspection(inspectionId, user, body, this.key(key)) }; }
  @Post('inspections/:inspectionId/summaries') @HttpCode(200) async summarize(@Param('inspectionId') inspectionId: string, @CurrentUserDecorator() user: CurrentUser, @Headers('idempotency-key') key: string | undefined) { return { data: await this.service.summarizeInspection(inspectionId, user, this.key(key)) }; }

  @Get('issues/statistics') statistics(@CurrentUserDecorator() user: CurrentUser) { return this.service.issueStatistics(user); }
  @Post('issue-transfer-jobs/actions/reconcile') @HttpCode(202) async reconcileTransfers(@CurrentUserDecorator() user: CurrentUser, @Headers('idempotency-key') key: string | undefined) { return { data: await this.service.reconcileIssueTransfers(user, this.key(key)) }; }
  @Get('issues') issues(@CurrentUserDecorator() user: CurrentUser, @Query() query: IssueListQueryDto) { return this.service.listIssues(user, query); }
  @Post('issues') async createIssue(@CurrentUserDecorator() user: CurrentUser, @Headers('idempotency-key') key: string | undefined, @Body() body: CreateIssueDto) { return { data: await this.service.createIssue(user, body, this.key(key)) }; }
  @Get('issues/:issueId') async issue(@Param('issueId') issueId: string, @CurrentUserDecorator() user: CurrentUser) { return { data: await this.service.getIssue(issueId, user) }; }
  @Post('issues/:issueId/capa') async createCapa(@Param('issueId') issueId: string, @CurrentUserDecorator() user: CurrentUser, @Headers('idempotency-key') key: string | undefined, @Body() body: CreateCapaDto) { return { data: await this.service.createCapa(issueId, user, body, this.key(key)) }; }
  @Post('issues/:issueId/close') @HttpCode(200) async closeIssue(@Param('issueId') issueId: string, @CurrentUserDecorator() user: CurrentUser, @Headers('idempotency-key') key: string | undefined, @Body() body: CloseIssueDto) { return { data: await this.service.closeIssue(issueId, user, body, this.key(key)) }; }

  @Put('capas/:capaId/root-cause') async rootCause(@Param('capaId') capaId: string, @CurrentUserDecorator() user: CurrentUser, @Headers('idempotency-key') key: string | undefined, @Body() body: RootCauseDto) { return { data: await this.service.saveRootCause(capaId, user, body, this.key(key)) }; }
  @Post('capas/:capaId/actions') async createAction(@Param('capaId') capaId: string, @CurrentUserDecorator() user: CurrentUser, @Headers('idempotency-key') key: string | undefined, @Body() body: CreateCapaActionDto) { return { data: await this.service.createCapaAction(capaId, user, body, this.key(key)) }; }
  @Post('capas/:capaId/request-verification') @HttpCode(200) async requestVerification(@Param('capaId') capaId: string, @CurrentUserDecorator() user: CurrentUser, @Headers('idempotency-key') key: string | undefined) { return { data: await this.service.requestVerification(capaId, user, this.key(key)) }; }
  @Post('capas/:capaId/verifications') async verification(@Param('capaId') capaId: string, @CurrentUserDecorator() user: CurrentUser, @Headers('idempotency-key') key: string | undefined, @Body() body: VerificationDto) { return { data: await this.service.verifyCapa(capaId, user, body, this.key(key)) }; }
  @Post('capa-actions/:actionId/submit') @HttpCode(200) async submitAction(@Param('actionId') actionId: string, @CurrentUserDecorator() user: CurrentUser, @Headers('idempotency-key') key: string | undefined, @Body() body: SubmitCapaActionDto) { return { data: await this.service.submitCapaAction(actionId, user, body, this.key(key)) }; }
  @Post('capa-actions/:actionId/accept') @HttpCode(200) async acceptAction(@Param('actionId') actionId: string, @CurrentUserDecorator() user: CurrentUser, @Headers('idempotency-key') key: string | undefined, @Body() body: AcceptCapaActionDto) { return { data: await this.service.acceptCapaAction(actionId, user, body, this.key(key)) }; }
  @Get('workbench/records/:recordId/issues') recordIssues(@Param('recordId') recordId: string, @CurrentUserDecorator() user: CurrentUser) { return this.service.listRecordIssues(recordId, user); }

  private key(value?: string) { const normalized = value?.trim(); if (!normalized || normalized.length < 16 || normalized.length > 128) throw new BadRequestException('Idempotency-Key must contain 16 to 128 characters'); return normalized; }
}
