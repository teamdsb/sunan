import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, Repository } from 'typeorm';

import type { CurrentUser } from 'src/common/interfaces/current-user.interface';
import { toBusinessDateTime } from 'src/common/date/business-date';
import { FileEntity } from 'src/database/entities/file.entity';
import { PersonnelEntity } from 'src/database/entities/personnel.entity';
import {
  CapaActionEntity, CapaActionEvidenceEntity, CapaRootCauseEntity, CapaVerificationEntity, InspectionCapaActionLogEntity, InspectionEntity, InspectionPlanEntity,
  InspectionResultEntity, InspectionResultEvidenceEntity, InspectionTemplateEntity, InspectionTemplateItemEntity, InspectionTemplateScopeEntity, InspectionTemplateVersionEntity,
  IssueSourceEntity, IssueTransferJobEntity, SafetyCapaEntity, SafetyIssueEntity,
} from 'src/database/entities/safety-inspection-capa.entity';
import { SafetyPlanItemEntity, SafetyTaskEntity, SafetyTaskParticipantEntity } from 'src/database/entities/safety-plan-task.entity';
import { WorkbenchRecordEntity } from 'src/database/entities/workbench-record.entity';
import { PlanTaskService } from 'src/modules/plan-task/plan-task.service';
import {
  AcceptCapaActionDto, CloseIssueDto, CreateCapaActionDto, CreateCapaDto, CreateInspectionPlanDto, CreateIssueDto, CreateTemplateDto, CreateTemplateVersionDto,
  InspectionGenerationDto, InspectionListQueryDto, IssueListQueryDto, RootCauseDto, SaveInspectionResultDto, SubmitCapaActionDto, SubmitInspectionDto, VerificationDto,
} from './dto/inspection-capa.dto';
import {
  buildIssueTransferKey,
  canCloseIssue,
  canSummarizeInspection,
  resolveCapaActionAvailableActions,
  resolveInspectionAvailableActions,
  resolveIssueAvailableActions,
  snapshotTemplateVersion,
  transitionVerification,
} from './inspection-capa-domain';

const SOURCE_MODULES = new Set(['goa_safety_hazard', 'shipping_self_inspection', 'shipping_vessel_inspection', 'shipping_maritime_safety_check']);
const MANAGER_ROLES = new Set(['system_admin', 'safety_manager', 'shipping']);

@Injectable()
export class InspectionCapaService {
  constructor(
    @InjectRepository(InspectionTemplateEntity) private readonly templates: Repository<InspectionTemplateEntity>,
    @InjectRepository(InspectionTemplateVersionEntity) private readonly versions: Repository<InspectionTemplateVersionEntity>,
    @InjectRepository(InspectionTemplateItemEntity) private readonly templateItems: Repository<InspectionTemplateItemEntity>,
    @InjectRepository(InspectionTemplateScopeEntity) private readonly templateScopes: Repository<InspectionTemplateScopeEntity>,
    @InjectRepository(InspectionPlanEntity) private readonly inspectionPlans: Repository<InspectionPlanEntity>,
    @InjectRepository(InspectionEntity) private readonly inspections: Repository<InspectionEntity>,
    @InjectRepository(InspectionResultEntity) private readonly results: Repository<InspectionResultEntity>,
    @InjectRepository(InspectionResultEvidenceEntity) private readonly resultEvidence: Repository<InspectionResultEvidenceEntity>,
    @InjectRepository(SafetyIssueEntity) private readonly issues: Repository<SafetyIssueEntity>,
    @InjectRepository(IssueSourceEntity) private readonly issueSources: Repository<IssueSourceEntity>,
    @InjectRepository(IssueTransferJobEntity) private readonly transferJobs: Repository<IssueTransferJobEntity>,
    @InjectRepository(SafetyCapaEntity) private readonly capas: Repository<SafetyCapaEntity>,
    @InjectRepository(CapaRootCauseEntity) private readonly rootCauses: Repository<CapaRootCauseEntity>,
    @InjectRepository(CapaActionEntity) private readonly capaActions: Repository<CapaActionEntity>,
    @InjectRepository(CapaActionEvidenceEntity) private readonly capaEvidence: Repository<CapaActionEvidenceEntity>,
    @InjectRepository(CapaVerificationEntity) private readonly verifications: Repository<CapaVerificationEntity>,
    @InjectRepository(InspectionCapaActionLogEntity) private readonly logs: Repository<InspectionCapaActionLogEntity>,
    @InjectRepository(SafetyTaskEntity) private readonly tasks: Repository<SafetyTaskEntity>,
    @InjectRepository(SafetyTaskParticipantEntity) private readonly participants: Repository<SafetyTaskParticipantEntity>,
    @InjectRepository(PersonnelEntity) private readonly personnel: Repository<PersonnelEntity>,
    @InjectRepository(FileEntity) private readonly files: Repository<FileEntity>,
    @InjectRepository(WorkbenchRecordEntity) private readonly workbenchRecords: Repository<WorkbenchRecordEntity>,
    private readonly planTasks: PlanTaskService,
    private readonly dataSource: DataSource,
  ) {}

  async listTemplates(user: CurrentUser) {
    this.assertManager(user);
    return { data: (await this.templates.find({ where: { deletedAt: IsNull() }, order: { createdAt: 'desc' } })).map((template) => this.templateDto(template)) };
  }

  async createTemplate(user: CurrentUser, input: CreateTemplateDto, requestId: string) {
    this.assertManager(user);
    const code = input.code.trim();
    if (await this.templates.exists({ where: { code, deletedAt: IsNull() } })) throw new ConflictException('Template code already exists');
    this.assertTemplateItems(input.items);
    const template = await this.templates.save(this.templates.create({ code, name: input.name.trim(), sourceType: input.sourceType, currentVersionId: null, createdBy: user.userId, updatedBy: user.userId, deletedAt: null }));
    const version = await this.versions.save(this.versions.create({ templateId: template.id, versionNo: 1, status: 'draft', importSource: input.importSource?.trim() || null, publishedAt: null, publishedBy: null, createdBy: user.userId, updatedBy: user.userId, deletedAt: null }));
    await this.saveTemplateItems(version.id, input.items, user.userId);
    for (const scope of input.scopes ?? []) {
      if (!scope.vesselId && !scope.departmentCode?.trim()) throw new UnprocessableEntityException('Template scope requires vessel or department');
      await this.templateScopes.save(this.templateScopes.create({ templateId: template.id, vesselId: scope.vesselId ?? null, departmentCode: scope.departmentCode?.trim() || null, createdBy: user.userId, updatedBy: user.userId, deletedAt: null }));
    }
    template.currentVersionId = version.id; template.updatedBy = user.userId; await this.templates.save(template);
    await this.audit('inspection_template', template.id, 'create', user.userId, requestId, null, this.templateDto(template));
    return this.templateDto(template);
  }

  async listTemplateVersions(templateId: string, user: CurrentUser) {
    this.assertManager(user); await this.mustTemplate(templateId);
    const versions = await this.versions.find({ where: { templateId, deletedAt: IsNull() }, order: { versionNo: 'DESC' } });
    return { data: await Promise.all(versions.map((version) => this.versionDto(version))) };
  }

  async createTemplateVersion(templateId: string, user: CurrentUser, input: CreateTemplateVersionDto, requestId: string) {
    this.assertManager(user); await this.mustTemplate(templateId); this.assertTemplateItems(input.items);
    const existing = await this.versions.find({ where: { templateId, deletedAt: IsNull() }, order: { versionNo: 'DESC' } });
    if (existing.some((version) => version.status === 'draft')) throw new ConflictException('A draft version already exists');
    const version = await this.versions.save(this.versions.create({ templateId, versionNo: (existing[0]?.versionNo ?? 0) + 1, status: 'draft', importSource: input.importSource?.trim() || null, publishedAt: null, publishedBy: null, createdBy: user.userId, updatedBy: user.userId, deletedAt: null }));
    await this.saveTemplateItems(version.id, input.items, user.userId);
    await this.audit('inspection_template_version', version.id, 'create_version', user.userId, requestId, null, { templateId, versionNo: version.versionNo });
    return this.versionDto(version);
  }

  async publishTemplateVersion(versionId: string, user: CurrentUser, requestId: string) {
    this.assertManager(user); const version = await this.mustVersion(versionId);
    if (version.status === 'published') return this.versionDto(version);
    if (version.status !== 'draft') throw new ConflictException('Only a draft version can be published');
    if (!(await this.templateItems.count({ where: { versionId, deletedAt: IsNull() } }))) throw new UnprocessableEntityException('A template version requires items');
    const before = { status: version.status }; version.status = 'published'; version.publishedAt = new Date(); version.publishedBy = user.userId; version.updatedBy = user.userId; await this.versions.save(version);
    const template = await this.mustTemplate(version.templateId); template.currentVersionId = version.id; template.updatedBy = user.userId; await this.templates.save(template);
    await this.audit('inspection_template_version', version.id, 'publish', user.userId, requestId, before, { status: version.status });
    return this.versionDto(version);
  }

  async listInspectionPlans(user: CurrentUser) { this.assertManager(user); return { data: (await this.inspectionPlans.find({ where: { deletedAt: IsNull() }, order: { createdAt: 'desc' } })).map((plan) => this.inspectionPlanDto(plan)) }; }

  async createInspectionPlan(user: CurrentUser, input: CreateInspectionPlanDto, requestId: string) {
    this.assertManager(user); const version = await this.mustVersion(input.templateVersionId);
    if (version.status !== 'published') throw new UnprocessableEntityException('Inspection plans require a published template version');
    const plan = await this.planTasks.createPlan(user, { title: input.title, planType: input.recurrence.kind, timeZone: 'Asia/Shanghai', vesselId: input.vesselId });
    const item = await this.planTasks.addItem(plan.id, user, { title: input.title, responsibleUserId: input.responsibleUserId, participantUserIds: input.participantUserIds, completionRule: input.completionRule, quorumCount: input.quorumCount, recurrence: input.recurrence, dueOffsetMinutes: input.dueOffsetMinutes, enabled: true });
    await this.planTasks.changePlanStatus(plan.id, user, { actionType: 'activate' });
    const inspectionPlan = await this.inspectionPlans.save(this.inspectionPlans.create({ title: input.title.trim(), planId: plan.id, planItemId: item.id, templateVersionId: version.id, createdBy: user.userId, updatedBy: user.userId, deletedAt: null }));
    await this.audit('inspection_plan', inspectionPlan.id, 'create', user.userId, requestId, null, this.inspectionPlanDto(inspectionPlan));
    return this.inspectionPlanDto(inspectionPlan);
  }

  async generateInspectionPlan(inspectionPlanId: string, user: CurrentUser, input: InspectionGenerationDto, requestId: string) {
    const inspectionPlan = await this.mustInspectionPlan(inspectionPlanId); this.assertManager(user);
    const run = await this.planTasks.generate(inspectionPlan.planId, user, input, requestId, 'inspection');
    const tasks = await this.tasks.find({ where: { planItemId: inspectionPlan.planItemId, deletedAt: IsNull() } });
    for (const task of tasks) {
      if (await this.inspections.exists({ where: { taskId: task.id, deletedAt: IsNull() } })) continue;
      const snapshot = await this.templateSnapshot(inspectionPlan.templateVersionId);
      await this.inspections.save(this.inspections.create({ taskId: task.id, inspectionPlanId: inspectionPlan.id, templateVersionId: inspectionPlan.templateVersionId, templateSnapshot: snapshot, status: 'pending', summarySnapshot: null, completedAt: null, createdBy: user.userId, updatedBy: user.userId, deletedAt: null }));
    }
    return run;
  }

  async listInspections(user: CurrentUser, query: InspectionListQueryDto) {
    const rows = await this.inspections.find({ where: { deletedAt: IsNull() }, order: { createdAt: 'desc' } });
    const filtered = rows.filter((row) => (!query.status || row.status === query.status) && (!query.taskId || row.taskId === query.taskId));
    const visible = [] as InspectionEntity[];
    for (const row of filtered) if (await this.canReadInspection(row, user)) visible.push(row);
    return { data: await Promise.all(visible.map((row) => this.inspectionDto(row, user))) };
  }

  async getInspection(inspectionId: string, user: CurrentUser) { const inspection = await this.mustInspection(inspectionId); await this.assertReadInspection(inspection, user); return this.inspectionDto(inspection, user); }

  async saveInspectionResult(inspectionId: string, user: CurrentUser, input: SaveInspectionResultDto, requestId: string) {
    const inspection = await this.mustInspection(inspectionId); await this.assertInspectionExecutor(inspection, user);
    if (['completed', 'cancelled'].includes(inspection.status)) throw new ConflictException('Terminal inspections cannot be changed');
    const snapshot = inspection.templateSnapshot as { items?: Array<{ snapshotKey: string; evidenceRequiredOnFailure?: boolean }> };
    const item = snapshot.items?.find((candidate) => candidate.snapshotKey === input.templateItemSnapshotKey);
    if (!item) throw new UnprocessableEntityException('Snapshot item does not exist');
    if (input.conclusion === 'nonconforming' && item.evidenceRequiredOnFailure && !(input.evidenceFileIds?.length)) throw new UnprocessableEntityException('Nonconforming result requires evidence');
    let result = await this.results.findOne({ where: { inspectionId, templateItemSnapshotKey: input.templateItemSnapshotKey, inspectorUserId: user.userId, deletedAt: IsNull() } });
    if (result?.status === 'submitted') throw new ConflictException('Submitted results are immutable');
    if (!result) result = this.results.create({ inspectionId, templateItemSnapshotKey: input.templateItemSnapshotKey, inspectorUserId: user.userId, conclusion: input.conclusion, remark: input.remark?.trim() || null, status: 'draft', signatureFileId: null, signedAt: null, createdBy: user.userId, updatedBy: user.userId, deletedAt: null });
    else { result.conclusion = input.conclusion; result.remark = input.remark?.trim() || null; result.updatedBy = user.userId; }
    result = await this.results.save(result);
    for (const fileId of input.evidenceFileIds ?? []) { await this.assertFile(fileId); if (!(await this.resultEvidence.exists({ where: { resultId: result.id, fileId, deletedAt: IsNull() } }))) await this.resultEvidence.save(this.resultEvidence.create({ resultId: result.id, fileId, category: 'evidence', createdBy: user.userId, updatedBy: user.userId, deletedAt: null })); }
    inspection.status = inspection.status === 'pending' ? 'in_progress' : inspection.status; inspection.updatedBy = user.userId; await this.inspections.save(inspection);
    await this.audit('inspection_result', result.id, 'save', user.userId, requestId, null, { conclusion: result.conclusion });
    return this.resultDto(result);
  }

  async submitInspection(inspectionId: string, user: CurrentUser, input: SubmitInspectionDto, requestId: string) {
    const inspection = await this.mustInspection(inspectionId); await this.assertInspectionExecutor(inspection, user); await this.assertFile(input.signatureFileId);
    const requiredKeys = ((inspection.templateSnapshot as { items?: Array<{ snapshotKey: string; resultRequired: boolean }> }).items ?? []).filter((item) => item.resultRequired).map((item) => item.snapshotKey);
    const rows = await this.results.find({ where: { inspectionId, inspectorUserId: user.userId, deletedAt: IsNull() } });
    if (!requiredKeys.every((key) => rows.some((row) => row.templateItemSnapshotKey === key))) throw new UnprocessableEntityException('All required inspection results must be completed before signing');
    if (rows.some((row) => row.status === 'submitted')) throw new ConflictException('Inspection has already been submitted by this participant');
    const now = new Date(); for (const row of rows) { row.status = 'submitted'; row.signatureFileId = input.signatureFileId; row.signedAt = now; row.updatedBy = user.userId; } await this.results.save(rows);
    const participant = await this.participants.findOne({ where: { taskId: inspection.taskId, userId: user.userId, status: 'active', deletedAt: IsNull() } }); if (participant) { participant.completedAt = now; participant.updatedBy = user.userId; await this.participants.save(participant); }
    inspection.status = 'submitted'; inspection.updatedBy = user.userId; await this.inspections.save(inspection); await this.audit('inspection', inspection.id, 'submit', user.userId, requestId, null, { signatureFileId: input.signatureFileId });
    return this.inspectionDto(inspection, user);
  }

  async summarizeInspection(inspectionId: string, user: CurrentUser, requestId: string) {
    this.assertManager(user); const jobIds = await this.dataSource.transaction(async (manager) => {
      await manager.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`inspection:${inspectionId}`]);
      const inspections = manager.getRepository(InspectionEntity); const results = manager.getRepository(InspectionResultEntity); const jobs = manager.getRepository(IssueTransferJobEntity);
      const inspection = await inspections.findOneBy({ id: inspectionId, deletedAt: IsNull() }); if (!inspection) throw new NotFoundException('Inspection not found');
      if (inspection.status === 'completed') return [] as string[];
      const participants = await manager.getRepository(SafetyTaskParticipantEntity).find({ where: { taskId: inspection.taskId, status: 'active', deletedAt: IsNull() } });
      const submittedRows = await results.find({ where: { inspectionId, status: 'submitted', deletedAt: IsNull() } });
      const submittedBy = [...new Set(submittedRows.map((row) => row.inspectorUserId))];
      const task = await manager.getRepository(SafetyTaskEntity).findOneBy({ id: inspection.taskId, deletedAt: IsNull() }); if (!task) throw new NotFoundException('Task not found');
      const inspectionPlan = await manager.getRepository(InspectionPlanEntity).findOneBy({ id: inspection.inspectionPlanId, deletedAt: IsNull() }); if (!inspectionPlan) throw new NotFoundException('Inspection plan not found');
      const planItem = await manager.getRepository(SafetyPlanItemEntity).findOneBy({ id: inspectionPlan.planItemId, deletedAt: IsNull() }); if (!planItem) throw new NotFoundException('Plan item not found');
      const taskParticipants = participants.length ? participants.map((row) => row.userId) : [task.responsibleUserId];
      const completionRule = planItem.completionRule as 'all' | 'any' | 'quorum';
      const quorumCount = planItem.quorumCount ?? undefined;
      if (!canSummarizeInspection({ completionRule, quorumCount, activeParticipantIds: taskParticipants, submittedBy })) throw new UnprocessableEntityException('Inspection completion threshold has not been met');
      inspection.status = 'completed'; inspection.completedAt = new Date(); inspection.updatedBy = user.userId; inspection.summarySnapshot = { submittedBy, completionRule, quorumCount }; await inspections.save(inspection);
      task.status = 'completed'; task.completedAt = inspection.completedAt; task.updatedBy = user.userId; await manager.getRepository(SafetyTaskEntity).save(task);
      const failed = new Map<string, InspectionResultEntity>(); for (const row of submittedRows.filter((row) => row.conclusion === 'nonconforming')) if (!failed.has(row.templateItemSnapshotKey)) failed.set(row.templateItemSnapshotKey, row);
      const jobIds: string[] = [];
      for (const [itemKey, result] of failed) { const dedupeKey = buildIssueTransferKey(inspection.id, itemKey); let job = await jobs.findOneBy({ dedupeKey }); if (!job) job = await jobs.save(jobs.create({ dedupeKey, inspectionResultId: result.id, status: 'queued', attemptCount: 0, failureCode: null, failureMessage: null, nextRetryAt: null, issueId: null })); jobIds.push(job.id); }
      return jobIds;
    });
    for (const jobId of jobIds) await this.processIssueTransfer(jobId, user.userId);
    const inspection = await this.mustInspection(inspectionId); await this.audit('inspection', inspectionId, 'summarize', user.userId, requestId, null, { jobIds }); return this.inspectionDto(inspection, user);
  }

  async listIssues(user: CurrentUser, query: IssueListQueryDto) {
    const candidates = await this.issues.find({ where: { deletedAt: IsNull() }, order: { dueAt: 'asc' } });
    const visibleIssueIds = await this.visibleIssueIds(candidates, user);
    const visible = candidates.filter((issue) => visibleIssueIds.has(issue.id)).filter((issue) => (!query.status || issue.status === query.status) && (!query.issueType || issue.issueType === query.issueType) && (!query.severity || issue.severity === query.severity) && (!query.vesselId || issue.vesselId === query.vesselId));
    return { data: await Promise.all(visible.map((issue) => this.issueDto(issue, user))) };
  }

  async createIssue(user: CurrentUser, input: CreateIssueDto, requestId: string) {
    if (await this.issues.exists({ where: { idempotencyKey: requestId, deletedAt: IsNull() } })) { const replay = await this.issues.findOneBy({ idempotencyKey: requestId, deletedAt: IsNull() }); if (replay) return this.issueDto(replay, user); }
    await this.assertActivePersonnel(input.responsibleUserId); if (input.source) await this.assertSource(input.source.sourceType, input.source.sourceId, user);
    const issue = await this.issues.save(this.issues.create({ issueNo: this.issueNo(), title: input.title.trim(), issueType: input.issueType, severity: input.severity, status: 'open', vesselId: input.vesselId ?? null, responsibilityScope: input.responsibilityScope ?? null, responsibleUserId: input.responsibleUserId, dueAt: toBusinessDateTime(input.dueAt), idempotencyKey: requestId, closedAt: null, closedBy: null, createdBy: user.userId, updatedBy: user.userId, deletedAt: null }));
    if (input.source) await this.issueSources.save(this.issueSources.create({ issueId: issue.id, sourceType: input.source.sourceType, sourceId: input.source.sourceId, sourceItemKey: input.source.sourceItemKey ?? '', sourceSnapshot: { sourceType: input.source.sourceType }, createdBy: user.userId }));
    await this.audit('issue', issue.id, 'create', user.userId, requestId, null, { title: issue.title }); return this.issueDto(issue, user);
  }

  async getIssue(issueId: string, user: CurrentUser) { const issue = await this.mustIssue(issueId); await this.assertReadIssue(issue, user); return this.issueDto(issue, user); }
  async issueStatistics(user: CurrentUser) { const data = (await this.listIssues(user, {})).data; return { data: { total: data.length, bySeverity: data.reduce<Record<string, number>>((sum, issue: { severity: string }) => ({ ...sum, [issue.severity]: (sum[issue.severity] ?? 0) + 1 }), {}), drillDown: data } }; }
  async reconcileIssueTransfers(user: CurrentUser, requestId: string) { this.assertManager(user); const jobs = await this.transferJobs.find({ where: { status: In(['queued', 'failed']) }, order: { createdAt: 'ASC' } }); let succeeded = 0; for (const job of jobs) { await this.processIssueTransfer(job.id, user.userId); const refreshed = await this.transferJobs.findOneBy({ id: job.id }); if (refreshed?.status === 'succeeded') succeeded += 1; } await this.audit('issue_transfer_job', jobs[0]?.id ?? '00000000-0000-0000-0000-000000000000', 'reconcile', user.userId, requestId, null, { processed: jobs.length, succeeded }); return { processed: jobs.length, succeeded, failed: jobs.length - succeeded }; }

  async createCapa(issueId: string, user: CurrentUser, input: CreateCapaDto, requestId: string) {
    const issue = await this.mustIssue(issueId); this.assertIssueManager(issue, user); if (issue.status === 'closed') throw new ConflictException('Closed issue cannot create CAPA'); if (await this.capas.exists({ where: { issueId, deletedAt: IsNull() } })) throw new ConflictException('Issue already has CAPA'); await this.assertActivePersonnel(input.verifierUserId);
    const capa = await this.capas.save(this.capas.create({ issueId, status: 'in_progress', verifierUserId: input.verifierUserId, effectivenessRequired: input.effectivenessRequired, closedAt: null, closedBy: null, createdBy: user.userId, updatedBy: user.userId, deletedAt: null })); issue.status = 'analyzing'; issue.updatedBy = user.userId; await this.issues.save(issue); await this.audit('capa', capa.id, 'create', user.userId, requestId, null, { issueId }); return this.capaDto(capa, user);
  }

  async saveRootCause(capaId: string, user: CurrentUser, input: RootCauseDto, requestId: string) {
    const capa = await this.mustCapa(capaId); const issue = await this.mustIssue(capa.issueId); this.assertIssueManager(issue, user); this.assertCapaInProgress(capa, issue); let rootCause = await this.rootCauses.findOne({ where: { capaId, deletedAt: IsNull() } });
    if (!rootCause) rootCause = this.rootCauses.create({ capaId, method: input.method, conclusion: input.conclusion.trim(), analysis: input.analysis ?? {}, createdBy: user.userId, updatedBy: user.userId, deletedAt: null }); else { rootCause.method = input.method; rootCause.conclusion = input.conclusion.trim(); rootCause.analysis = input.analysis ?? {}; rootCause.updatedBy = user.userId; }
    await this.rootCauses.save(rootCause); capa.updatedBy = user.userId; await this.capas.save(capa); await this.audit('capa', capa.id, 'root_cause', user.userId, requestId, null, { method: rootCause.method }); return this.capaDto(capa, user);
  }

  async createCapaAction(capaId: string, user: CurrentUser, input: CreateCapaActionDto, requestId: string) {
    const capa = await this.mustCapa(capaId); const issue = await this.mustIssue(capa.issueId); this.assertIssueManager(issue, user); this.assertCapaInProgress(capa, issue); await this.assertActivePersonnel(input.responsibleUserId);
    const action = await this.capaActions.save(this.capaActions.create({ capaId, actionType: input.actionType, title: input.title.trim(), responsibleUserId: input.responsibleUserId, dueAt: toBusinessDateTime(input.dueAt), status: 'assigned', completionStatement: null, submittedAt: null, createdBy: user.userId, updatedBy: user.userId, deletedAt: null })); capa.updatedBy = user.userId; await this.capas.save(capa); issue.status = 'action_in_progress'; issue.updatedBy = user.userId; await this.issues.save(issue); await this.audit('capa_action', action.id, 'create', user.userId, requestId, null, { actionType: action.actionType }); return this.capaActionDto(action, user, capa);
  }

  async submitCapaAction(actionId: string, user: CurrentUser, input: SubmitCapaActionDto, requestId: string) {
    const action = await this.mustAction(actionId); if (action.responsibleUserId !== user.userId && !this.isAdmin(user)) throw new ForbiddenException('Only the action owner may submit completion'); if (!['draft', 'assigned', 'in_progress', 'returned'].includes(action.status)) throw new ConflictException('Action cannot be submitted');
    for (const fileId of input.evidenceFileIds) { await this.assertFile(fileId); if (!(await this.capaEvidence.exists({ where: { capaActionId: action.id, fileId, deletedAt: IsNull() } }))) await this.capaEvidence.save(this.capaEvidence.create({ capaActionId: action.id, fileId, status: 'active', withdrawReason: null, createdBy: user.userId, updatedBy: user.userId, deletedAt: null })); }
    action.status = 'submitted'; action.completionStatement = input.completionStatement.trim(); action.submittedAt = new Date(); action.updatedBy = user.userId; await this.capaActions.save(action); await this.audit('capa_action', action.id, 'submit', user.userId, requestId, null, { evidenceCount: input.evidenceFileIds.length }); return this.capaActionDto(action, user, await this.mustCapa(action.capaId));
  }

  async acceptCapaAction(actionId: string, user: CurrentUser, input: AcceptCapaActionDto, requestId: string) {
    const action = await this.mustAction(actionId); const capa = await this.mustCapa(action.capaId); if (action.responsibleUserId === user.userId) throw new ForbiddenException('Action owner cannot accept their own action'); if (capa.verifierUserId !== user.userId && !this.isAdmin(user) && !user.roles.includes('reviewer')) throw new ForbiddenException('Only the verifier may accept an action'); if (action.status !== 'submitted') throw new ConflictException('Only submitted actions can be accepted');
    const evidence = await this.capaEvidence.count({ where: { capaActionId: action.id, status: 'active', deletedAt: IsNull() } }); if (!evidence) throw new UnprocessableEntityException('Submitted action requires evidence'); action.status = 'accepted'; action.updatedBy = user.userId; await this.capaActions.save(action); await this.updateVerificationReadiness(capa, user.userId); await this.audit('capa_action', action.id, 'accept', user.userId, requestId, null, { comment: input.comment.trim() }); return this.capaActionDto(action, user, capa);
  }

  async requestVerification(capaId: string, user: CurrentUser, requestId: string) {
    const capa = await this.mustCapa(capaId); const issue = await this.mustIssue(capa.issueId); this.assertIssueManager(issue, user); this.assertCapaInProgress(capa, issue); await this.ensureVerificationReady(capa); capa.status = 'pending_verification'; capa.updatedBy = user.userId; await this.capas.save(capa); issue.status = 'pending_verification'; issue.updatedBy = user.userId; await this.issues.save(issue); await this.audit('capa', capa.id, 'request_verification', user.userId, requestId, null, { status: capa.status }); return this.capaDto(capa, user);
  }

  async verifyCapa(capaId: string, user: CurrentUser, input: VerificationDto, requestId: string) {
    const capa = await this.mustCapa(capaId); if (capa.verifierUserId !== user.userId && !this.isAdmin(user)) throw new ForbiddenException('Only the assigned verifier may verify CAPA'); if (capa.status !== 'pending_verification') throw new ConflictException('CAPA is not awaiting verification'); if (await this.capaActions.exists({ where: { capaId, responsibleUserId: user.userId, deletedAt: IsNull() } })) throw new ForbiddenException('Verifier cannot verify their own action');
    const transition = transitionVerification({ capaStatus: 'pending_verification', result: input.result as 'passed' | 'failed', reworkReason: input.reworkReason ?? '' });
    const verification = await this.verifications.save(this.verifications.create({ capaId, verifierUserId: user.userId, result: transition.verificationStatus, conclusion: input.conclusion.trim(), effectivenessEvaluation: input.effectivenessEvaluation.trim() || null, reworkReason: transition.reworkReason }));
    capa.status = transition.capaStatus; capa.updatedBy = user.userId; await this.capas.save(capa); const issue = await this.mustIssue(capa.issueId); issue.status = transition.verificationStatus === 'passed' ? 'pending_verification' : 'action_in_progress'; issue.updatedBy = user.userId; await this.issues.save(issue); await this.audit('capa', capa.id, 'verify', user.userId, requestId, null, { result: transition.verificationStatus }); return this.verificationDto(verification);
  }

  async closeIssue(issueId: string, user: CurrentUser, input: CloseIssueDto, requestId: string) {
    const issue = await this.mustIssue(issueId); const capa = await this.capas.findOne({ where: { issueId, deletedAt: IsNull() } }); if (!capa) throw new UnprocessableEntityException('Issue requires CAPA before closure');
    if (!this.canReadIssue(issue, user) && capa.verifierUserId !== user.userId && !this.isAdmin(user)) throw new ForbiddenException('Issue is not visible');
    const rootCause = await this.rootCauses.findOne({ where: { capaId: capa.id, deletedAt: IsNull() } }); const actions = await this.capaActions.find({ where: { capaId: capa.id, deletedAt: IsNull() } }); const latest = await this.verifications.findOne({ where: { capaId: capa.id }, order: { createdAt: 'DESC' } });
    const closure = canCloseIssue({ severity: issue.severity as 'minor' | 'major' | 'critical', actorRoles: [...user.roles, ...(capa.verifierUserId === user.userId ? ['verifier'] : [])], hasRootCause: Boolean(rootCause), corrective: await this.closureAction(actions, 'corrective'), preventive: await this.closureAction(actions, 'preventive'), latestVerification: latest?.result === 'passed' ? 'passed' : latest?.result === 'failed' ? 'failed' : null, effectivenessEvaluation: latest?.effectivenessEvaluation ?? '' });
    if (!closure.allowed) { if (closure.reason?.includes('requires_verifier')) throw new ForbiddenException(closure.reason); throw new UnprocessableEntityException(closure.reason ?? 'Issue cannot be closed'); }
    if (capa.status !== 'verified') throw new UnprocessableEntityException('CAPA must be verified before closure'); const now = new Date(); issue.status = 'closed'; issue.closedAt = now; issue.closedBy = user.userId; issue.updatedBy = user.userId; capa.status = 'closed'; capa.closedAt = now; capa.closedBy = user.userId; capa.updatedBy = user.userId; await this.issues.save(issue); await this.capas.save(capa); await this.audit('issue', issue.id, 'close', user.userId, requestId, null, { comment: input.comment.trim() }); return this.issueDto(issue, user);
  }

  async listRecordIssues(recordId: string, user: CurrentUser) {
    const record = await this.workbenchRecords.findOne({ where: { id: recordId, deletedAt: IsNull() } }); if (!record) throw new NotFoundException('Workbench record not found'); if (record.ownerUserId !== user.userId && !this.isManager(user)) throw new ForbiddenException('Workbench record is not visible'); if (!SOURCE_MODULES.has(record.moduleCode)) return { data: [] };
    const links = await this.issueSources.find({ where: { sourceType: 'workbench_record', sourceId: recordId } }); const issues = await this.issues.find({ where: { id: In(links.map((link) => link.issueId)), deletedAt: IsNull() } }); const visibleIssueIds = await this.visibleIssueIds(issues, user); return { data: await Promise.all(issues.filter((issue) => visibleIssueIds.has(issue.id)).map((issue) => this.issueDto(issue, user))) };
  }

  private async processIssueTransfer(jobId: string, actorUserId: string) {
    try {
      await this.dataSource.transaction(async (manager) => {
        await manager.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`issue-transfer:${jobId}`]); const jobs = manager.getRepository(IssueTransferJobEntity); const job = await jobs.findOneBy({ id: jobId }); if (!job || job.status === 'succeeded') return;
        const result = await manager.getRepository(InspectionResultEntity).findOneBy({ id: job.inspectionResultId, deletedAt: IsNull() }); if (!result) throw new NotFoundException('Inspection result not found'); const inspection = await manager.getRepository(InspectionEntity).findOneBy({ id: result.inspectionId, deletedAt: IsNull() }); if (!inspection) throw new NotFoundException('Inspection not found'); const task = await manager.getRepository(SafetyTaskEntity).findOneBy({ id: inspection.taskId, deletedAt: IsNull() }); if (!task) throw new NotFoundException('Task not found');
        let issue = await manager.getRepository(SafetyIssueEntity).findOneBy({ idempotencyKey: job.dedupeKey, deletedAt: IsNull() }); if (!issue) issue = await manager.getRepository(SafetyIssueEntity).save(manager.getRepository(SafetyIssueEntity).create({ issueNo: this.issueNo(), title: `检查不符合：${result.templateItemSnapshotKey}`, issueType: 'nonconformity', severity: 'major', status: 'open', vesselId: task.vesselId, responsibilityScope: 'vessel', responsibleUserId: task.responsibleUserId, dueAt: task.dueAt, idempotencyKey: job.dedupeKey, closedAt: null, closedBy: null, createdBy: actorUserId, updatedBy: actorUserId, deletedAt: null }));
        const sources = manager.getRepository(IssueSourceEntity); if (!(await sources.exists({ where: { issueId: issue.id, sourceType: 'inspection_result', sourceId: result.id, sourceItemKey: result.templateItemSnapshotKey } }))) await sources.save(sources.create({ issueId: issue.id, sourceType: 'inspection_result', sourceId: result.id, sourceItemKey: result.templateItemSnapshotKey, sourceSnapshot: { inspectionId: inspection.id, conclusion: result.conclusion }, createdBy: actorUserId }));
        job.status = 'succeeded'; job.issueId = issue.id; job.attemptCount += 1; job.failureCode = null; job.failureMessage = null; job.nextRetryAt = null; await jobs.save(job);
      });
    } catch (error) { const job = await this.transferJobs.findOneBy({ id: jobId }); if (job) { job.status = 'failed'; job.attemptCount += 1; job.failureCode = 'transfer_failed'; job.failureMessage = error instanceof Error ? error.message : 'transfer failed'; job.nextRetryAt = new Date(Date.now() + 60_000); await this.transferJobs.save(job); } }
  }

  private async updateVerificationReadiness(capa: SafetyCapaEntity, actorUserId: string) { if (!(await this.isVerificationReady(capa))) return; capa.status = 'pending_verification'; capa.updatedBy = actorUserId; await this.capas.save(capa); const issue = await this.mustIssue(capa.issueId); issue.status = 'pending_verification'; issue.updatedBy = actorUserId; await this.issues.save(issue); }
  private async ensureVerificationReady(capa: SafetyCapaEntity) { if (!(await this.isVerificationReady(capa))) throw new UnprocessableEntityException('CAPA needs accepted corrective and preventive actions with evidence'); }
  private async isVerificationReady(capa: SafetyCapaEntity) { const root = await this.rootCauses.exists({ where: { capaId: capa.id, deletedAt: IsNull() } }); const actions = await this.capaActions.find({ where: { capaId: capa.id, deletedAt: IsNull() } }); const corrective = await this.closureAction(actions, 'corrective'); const preventive = await this.closureAction(actions, 'preventive'); return root && Boolean(corrective?.accepted && corrective.evidenceCount > 0 && preventive?.accepted && preventive.evidenceCount > 0); }
  private async closureAction(actions: CapaActionEntity[], type: 'corrective' | 'preventive') { const action = actions.find((candidate) => candidate.actionType === type); if (!action) return null; return { accepted: action.status === 'accepted', evidenceCount: await this.capaEvidence.count({ where: { capaActionId: action.id, status: 'active', deletedAt: IsNull() } }) }; }
  private async templateSnapshot(versionId: string) { const version = await this.mustVersion(versionId); const items = await this.templateItems.find({ where: { versionId, deletedAt: IsNull() }, order: { sequenceNo: 'ASC' } }); const scopes = await this.templateScopes.find({ where: { templateId: version.templateId, deletedAt: IsNull() } }); return snapshotTemplateVersion({ id: version.id, versionNo: version.versionNo, sourceType: (await this.mustTemplate(version.templateId)).sourceType, scopes: scopes.map((scope) => ({ vesselId: scope.vesselId, departmentCode: scope.departmentCode })), items: items.map((item) => ({ itemCode: item.itemCode, title: item.title, resultRequired: item.resultRequired, evidenceRequiredOnFailure: item.evidenceRequiredOnFailure })) } as never); }
  private assertTemplateItems(items: Array<{ itemCode: string; sequenceNo: number }>) { if (new Set(items.map((item) => item.itemCode)).size !== items.length || new Set(items.map((item) => item.sequenceNo)).size !== items.length) throw new UnprocessableEntityException('Template item code and sequence must be unique'); }
  private async saveTemplateItems(versionId: string, items: CreateTemplateDto['items'], actorUserId: string) { await this.templateItems.save(items.map((item) => this.templateItems.create({ versionId, itemCode: item.itemCode.trim(), title: item.title.trim(), clauseRef: item.clauseRef?.trim() || null, resultRequired: item.resultRequired, evidenceRequiredOnFailure: item.evidenceRequiredOnFailure ?? true, sequenceNo: item.sequenceNo, createdBy: actorUserId, updatedBy: actorUserId, deletedAt: null }))); }
  private async mustTemplate(id: string) { const row = await this.templates.findOneBy({ id, deletedAt: IsNull() }); if (!row) throw new NotFoundException('Inspection template not found'); return row; }
  private async mustVersion(id: string) { const row = await this.versions.findOneBy({ id, deletedAt: IsNull() }); if (!row) throw new NotFoundException('Inspection template version not found'); return row; }
  private async mustInspectionPlan(id: string) { const row = await this.inspectionPlans.findOneBy({ id, deletedAt: IsNull() }); if (!row) throw new NotFoundException('Inspection plan not found'); return row; }
  private async mustInspection(id: string) { const row = await this.inspections.findOneBy({ id, deletedAt: IsNull() }); if (!row) throw new NotFoundException('Inspection not found'); return row; }
  private async mustIssue(id: string) { const row = await this.issues.findOneBy({ id, deletedAt: IsNull() }); if (!row) throw new NotFoundException('Issue not found'); return row; }
  private async mustCapa(id: string) { const row = await this.capas.findOneBy({ id, deletedAt: IsNull() }); if (!row) throw new NotFoundException('CAPA not found'); return row; }
  private async mustAction(id: string) { const row = await this.capaActions.findOneBy({ id, deletedAt: IsNull() }); if (!row) throw new NotFoundException('CAPA action not found'); return row; }
  private async assertFile(id: string) { if (!(await this.files.exists({ where: { id } }))) throw new UnprocessableEntityException('Evidence file not found'); }
  private async assertActivePersonnel(userId: string) { const person = await this.personnel.findOne({ where: { wecomUserId: userId, deletedAt: IsNull() } }); if (!person || person.employmentStatus !== 'active') throw new UnprocessableEntityException('Active personnel not found'); }
  private async assertSource(type: string, id: string, user: CurrentUser) { if (type !== 'workbench_record') throw new UnprocessableEntityException('Only authorized workbench sources may be linked manually'); const record = await this.workbenchRecords.findOne({ where: { id, deletedAt: IsNull() } }); if (!record || !SOURCE_MODULES.has(record.moduleCode)) throw new UnprocessableEntityException('Unsupported workbench inspection source'); if (record.ownerUserId !== user.userId && !this.isManager(user)) throw new ForbiddenException('Source record is not visible'); }
  private async canReadInspection(inspection: InspectionEntity, user: CurrentUser) { if (this.isManager(user)) return true; const task = await this.tasks.findOneBy({ id: inspection.taskId, deletedAt: IsNull() }); if (!task) return false; if (task.responsibleUserId === user.userId) return true; return this.participants.exists({ where: { taskId: inspection.taskId, userId: user.userId, status: 'active', deletedAt: IsNull() } }); }
  private async assertReadInspection(inspection: InspectionEntity, user: CurrentUser) { if (!(await this.canReadInspection(inspection, user))) throw new ForbiddenException('Inspection is not visible'); }
  private async assertInspectionExecutor(inspection: InspectionEntity, user: CurrentUser) { const task = await this.tasks.findOneBy({ id: inspection.taskId, deletedAt: IsNull() }); if (!task) throw new NotFoundException('Task not found'); if (task.responsibleUserId === user.userId) return; const participant = await this.participants.findOne({ where: { taskId: task.id, userId: user.userId, status: 'active', deletedAt: IsNull() } }); if (!participant || !['executor', 'collaborator'].includes(participant.role)) throw new ForbiddenException('Only an active inspection participant may submit results'); }
  private canReadIssue(issue: SafetyIssueEntity, user: CurrentUser) { return this.isManager(user) || issue.createdBy === user.userId || issue.responsibleUserId === user.userId; }
  private async assertReadIssue(issue: SafetyIssueEntity, user: CurrentUser) { if (this.canReadIssue(issue, user)) return; const isVerifier = await this.capas.exists({ where: { issueId: issue.id, verifierUserId: user.userId, deletedAt: IsNull() } }); if (!isVerifier) throw new ForbiddenException('Issue is not visible'); }
  private async visibleIssueIds(issues: SafetyIssueEntity[], user: CurrentUser) { const visible = new Set(issues.filter((issue) => this.canReadIssue(issue, user)).map((issue) => issue.id)); const hiddenIds = issues.filter((issue) => !visible.has(issue.id)).map((issue) => issue.id); if (hiddenIds.length) { const verified = await this.capas.find({ where: { issueId: In(hiddenIds), verifierUserId: user.userId, deletedAt: IsNull() } }); verified.forEach((capa) => visible.add(capa.issueId)); } return visible; }
  private assertIssueManager(issue: SafetyIssueEntity, user: CurrentUser) { if (!this.isManager(user) && issue.createdBy !== user.userId && issue.responsibleUserId !== user.userId) throw new ForbiddenException('Issue cannot be managed by caller'); }
  private assertCapaInProgress(capa: SafetyCapaEntity, issue: SafetyIssueEntity) { if (issue.status === 'closed' || capa.status !== 'in_progress') throw new ConflictException('CAPA is not editable in its current state'); }
  private assertManager(user: CurrentUser) { if (!this.isManager(user)) throw new ForbiddenException('Safety management permission is required'); }
  private isManager(user: CurrentUser) { return this.isAdmin(user) || user.roles.some((role) => MANAGER_ROLES.has(role)); }
  private isAdmin(user: CurrentUser) { return user.isAdmin || user.roles.includes('system_admin'); }
  private issueNo() { return `ISS-${crypto.randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`; }
  private async audit(objectType: string, objectId: string, actionType: string, actor: string, requestId: string | null, before: Record<string, unknown> | null, after: Record<string, unknown>) { if (requestId && await this.logs.exists({ where: { objectType, operatorUserId: actor, requestId } })) return; await this.logs.save(this.logs.create({ objectType, objectId, actionType, requestId, operatorUserId: actor, reason: null, beforeSnapshot: before ?? {}, afterSnapshot: after, metadata: {} })); }
  private templateDto(template: InspectionTemplateEntity) { return { id: template.id, code: template.code, name: template.name, sourceType: template.sourceType, currentVersionId: template.currentVersionId }; }
  private async versionDto(version: InspectionTemplateVersionEntity) { const items = await this.templateItems.find({ where: { versionId: version.id, deletedAt: IsNull() }, order: { sequenceNo: 'ASC' } }); return { id: version.id, templateId: version.templateId, versionNo: version.versionNo, status: version.status, importSource: version.importSource, items: items.map((item) => ({ itemCode: item.itemCode, title: item.title, clauseRef: item.clauseRef, resultRequired: item.resultRequired, evidenceRequiredOnFailure: item.evidenceRequiredOnFailure, sequenceNo: item.sequenceNo })) }; }
  private inspectionPlanDto(plan: InspectionPlanEntity) { return { id: plan.id, title: plan.title, planId: plan.planId, planItemId: plan.planItemId, templateVersionId: plan.templateVersionId }; }
  private resultDto(row: InspectionResultEntity) { return { id: row.id, inspectorUserId: row.inspectorUserId, templateItemSnapshotKey: row.templateItemSnapshotKey, conclusion: row.conclusion, remark: row.remark, status: row.status, signedAt: row.signedAt }; }
  private async inspectionDto(inspection: InspectionEntity, user: CurrentUser) { const results = await this.results.find({ where: { inspectionId: inspection.id, deletedAt: IsNull() }, order: { createdAt: 'ASC' } }); return { id: inspection.id, taskId: inspection.taskId, status: inspection.status, templateVersionId: inspection.templateVersionId, templateSnapshot: inspection.templateSnapshot, results: results.map((row) => this.resultDto(row)), availableActions: await this.inspectionActions(inspection, user, results) }; }
  private async inspectionActions(
    inspection: InspectionEntity,
    user: CurrentUser,
    results: InspectionResultEntity[],
  ) {
    const canRead = await this.canReadInspection(inspection, user);
    let canExecute = false;
    try {
      await this.assertInspectionExecutor(inspection, user);
      canExecute = true;
    } catch (error) {
      if (!(error instanceof ForbiddenException) && !(error instanceof NotFoundException)) {
        throw error;
      }
    }

    return resolveInspectionAvailableActions({
      canRead,
      canExecute,
      alreadySubmitted: results.some(
        (result) =>
          result.inspectorUserId === user.userId && result.status === 'submitted',
      ),
      status: inspection.status,
      canSummarize: this.isManager(user),
    });
  }
  private async issueDto(issue: SafetyIssueEntity, user: CurrentUser) {
    const sources = await this.issueSources.find({ where: { issueId: issue.id } });
    const capa = await this.capas.findOne({ where: { issueId: issue.id, deletedAt: IsNull() } });
    const capaDetail = capa ? await this.capaDto(capa, user) : null;
    return {
      id: issue.id,
      title: issue.title,
      issueType: issue.issueType,
      severity: issue.severity,
      status: issue.status,
      vesselId: issue.vesselId,
      responsibleUserId: issue.responsibleUserId,
      dueAt: issue.dueAt,
      sources: sources.map((source) => {
        const inspectionId = typeof source.sourceSnapshot.inspectionId === 'string' ? source.sourceSnapshot.inspectionId : source.sourceId;
        return { sourceType: source.sourceType, sourceId: source.sourceId, sourceItemKey: source.sourceItemKey, sourceHref: source.sourceType === 'workbench_record' ? `/workbench/records/${source.sourceId}` : `/workbench/inspections/${inspectionId}` };
      }),
      capa: capaDetail,
      availableActions: await this.issueActions(issue, capa, capaDetail, user),
    };
  }

  private async issueActions(
    issue: SafetyIssueEntity,
    capa: SafetyCapaEntity | null,
    capaDetail: {
      rootCause: { conclusion: string } | null;
      actions: Array<{
        actionType: string;
        responsibleUserId: string;
        status: string;
        evidenceFileIds: string[];
      }>;
    } | null,
    user: CurrentUser,
  ) {
    const canRead = this.canReadIssue(issue, user) || capa?.verifierUserId === user.userId;
    const canManage = this.isManager(user) || issue.createdBy === user.userId || issue.responsibleUserId === user.userId;
    const corrective = capaDetail?.actions.find((action) => action.actionType === 'corrective');
    const preventive = capaDetail?.actions.find((action) => action.actionType === 'preventive');
    const verificationReady = Boolean(
      capaDetail?.rootCause &&
      corrective?.status === 'accepted' && corrective.evidenceFileIds.length > 0 &&
      preventive?.status === 'accepted' && preventive.evidenceFileIds.length > 0,
    );
    const canVerify = Boolean(
      capa &&
      (capa.verifierUserId === user.userId || this.isAdmin(user)) &&
      !capaDetail?.actions.some((action) => action.responsibleUserId === user.userId),
    );
    let canClose = false;
    if (capa?.status === 'verified' && capaDetail) {
      const latest = await this.verifications.findOne({ where: { capaId: capa.id }, order: { createdAt: 'DESC' } });
      canClose = canCloseIssue({
        severity: issue.severity as 'minor' | 'major' | 'critical',
        actorRoles: [...user.roles, ...(capa.verifierUserId === user.userId ? ['verifier'] : [])],
        hasRootCause: Boolean(capaDetail.rootCause),
        corrective: corrective ? { accepted: corrective.status === 'accepted', evidenceCount: corrective.evidenceFileIds.length } : null,
        preventive: preventive ? { accepted: preventive.status === 'accepted', evidenceCount: preventive.evidenceFileIds.length } : null,
        latestVerification: latest?.result === 'passed' ? 'passed' : latest?.result === 'failed' ? 'failed' : null,
        effectivenessEvaluation: latest?.effectivenessEvaluation ?? '',
      }).allowed;
    }
    return resolveIssueAvailableActions({
      canRead,
      canManage,
      issueStatus: issue.status,
      hasCapa: Boolean(capa),
      capaStatus: capa?.status ?? null,
      verificationReady,
      canVerify,
      canClose,
    });
  }

  private async capaDto(capa: SafetyCapaEntity, user: CurrentUser) {
    const root = await this.rootCauses.findOne({ where: { capaId: capa.id, deletedAt: IsNull() } });
    const actions = await this.capaActions.find({ where: { capaId: capa.id, deletedAt: IsNull() }, order: { createdAt: 'ASC' } });
    return {
      id: capa.id,
      issueId: capa.issueId,
      status: capa.status,
      verifierUserId: capa.verifierUserId,
      rootCause: root ? { method: root.method, conclusion: root.conclusion, analysis: root.analysis } : null,
      actions: await Promise.all(actions.map((action) => this.capaActionDto(action, user, capa))),
    };
  }

  private async capaActionDto(action: CapaActionEntity, user: CurrentUser, capa: SafetyCapaEntity) {
    const evidence = await this.capaEvidence.find({ where: { capaActionId: action.id, status: 'active', deletedAt: IsNull() } });
    return {
      id: action.id,
      actionType: action.actionType,
      title: action.title,
      responsibleUserId: action.responsibleUserId,
      dueAt: action.dueAt,
      status: action.status,
      evidenceFileIds: evidence.map((row) => row.fileId),
      availableActions: resolveCapaActionAvailableActions({
        status: action.status,
        isResponsible: action.responsibleUserId === user.userId,
        isAdmin: this.isAdmin(user),
        isVerifier: capa.verifierUserId === user.userId,
        isReviewer: user.roles.includes('reviewer'),
      }),
    };
  }
  private verificationDto(verification: CapaVerificationEntity) { return { id: verification.id, result: verification.result, verifierUserId: verification.verifierUserId, conclusion: verification.conclusion, effectivenessEvaluation: verification.effectivenessEvaluation }; }
}
