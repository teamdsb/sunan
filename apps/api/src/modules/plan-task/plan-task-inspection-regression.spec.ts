import { PlanTaskService } from './plan-task.service';
import { InspectionEntity, InspectionPlanEntity, InspectionTemplateEntity, InspectionTemplateItemEntity, InspectionTemplateScopeEntity, InspectionTemplateVersionEntity } from 'src/database/entities/safety-inspection-capa.entity';
import { SafetyPlanItemEntity, SafetyTaskEntity, SafetyTaskGenerationEntryEntity, SafetyTaskParticipantEntity } from 'src/database/entities/safety-plan-task.entity';

describe('Inspection task generation and completion', () => {
  function setup() {
    const service = Object.create(PlanTaskService.prototype) as Record<string, any>;
    const inspectionRows: Array<Record<string, unknown>> = [];
    const repositories = new Map<unknown, Record<string, unknown>>();
    const inspections = { findOneBy: jest.fn().mockImplementation(async ({ taskId }: { taskId: string }) => inspectionRows.find((row) => row.taskId === taskId) ?? null), create: <T>(value: T) => value, save: jest.fn().mockImplementation(async (value: Record<string, unknown>) => { const row = { id: 'inspection', ...value }; inspectionRows.push(row); return row; }) };
    repositories.set(InspectionEntity, inspections);
    repositories.set(InspectionPlanEntity, { findOneBy: jest.fn().mockResolvedValue({ id: 'inspection-plan', planItemId: 'item', templateVersionId: 'version' }) });
    repositories.set(InspectionTemplateVersionEntity, { findOneBy: jest.fn().mockResolvedValue({ id: 'version', templateId: 'template', versionNo: 2, status: 'published' }) });
    repositories.set(InspectionTemplateEntity, { findOneBy: jest.fn().mockResolvedValue({ sourceType: 'company' }) });
    repositories.set(InspectionTemplateItemEntity, { find: jest.fn().mockResolvedValue([{ itemCode: 'fire', title: '灭火器', resultRequired: true, evidenceRequiredOnFailure: true }]) });
    repositories.set(InspectionTemplateScopeEntity, { find: jest.fn().mockResolvedValue([]) });
    let task: Record<string, unknown> | undefined;
    repositories.set(SafetyTaskEntity, { findOneBy: jest.fn().mockImplementation(async () => task ?? null), create: <T>(value: T) => value, save: jest.fn().mockImplementation(async (value: Record<string, unknown>) => task = { id: 'task', ...value }) });
    const participant = { id: 'participant', role: 'executor', completedAt: null };
    repositories.set(SafetyTaskParticipantEntity, { count: jest.fn().mockResolvedValue(1), create: <T>(value: T) => value, save: jest.fn(), findOneBy: jest.fn().mockResolvedValue(participant), find: jest.fn().mockResolvedValue([participant]) });
    repositories.set(SafetyPlanItemEntity, { findOneByOrFail: jest.fn().mockResolvedValue({ completionRule: 'all' }) });
    repositories.set(SafetyTaskGenerationEntryEntity, { create: <T>(value: T) => value, save: jest.fn() });
    const manager = { query: jest.fn(), getRepository: (entity: unknown) => { const repository = repositories.get(entity); if (!repository) throw new Error('Unexpected repository'); return repository; } };
    service.dataSource = { manager, transaction: <T>(work: (value: typeof manager) => T): T => work(manager) };
    service.prepareDelivery = jest.fn().mockResolvedValue(null);
    return { service, manager, inspections, inspectionRows };
  }

  it('generates the executable snapshot in the generic task transaction and deduplicates reconciliation', async () => {
    const { service, inspections, inspectionRows } = setup();
    const plan = { id: 'plan', vesselId: null, scopeSnapshot: {} };
    const item = { id: 'item', title: '消防检查', ruleVersion: 1, dueOffsetMinutes: 60, responsibleUserId: 'inspector', participantSnapshot: [] };
    await expect(service.generateOccurrenceLocked(plan, item, { id: 'run', mode: 'generate' }, '2026-11-17T00:00:00.000Z', 'owner')).resolves.toBe('created');
    expect(inspectionRows).toEqual([expect.objectContaining({ taskId: 'task', status: 'pending', templateSnapshot: expect.objectContaining({ versionId: 'version', items: [expect.objectContaining({ snapshotKey: 'fire', title: '灭火器' })] }) })]);
    await expect(service.generateOccurrenceLocked(plan, item, { id: 'retry', mode: 'reconcile' }, '2026-11-17T00:00:00.000Z', 'owner')).resolves.toBe('skipped');
    expect(inspections.save).toHaveBeenCalledTimes(1);
  });

  it('rejects direct generic completion before modifying participant completion', async () => {
    const { service, manager } = setup();
    await expect(service.completeParticipant({ id: 'task', planItemId: 'item' }, 'inspector', manager)).rejects.toThrow('Inspection tasks must be completed through signed inspection results and summary');
    expect(manager.getRepository(SafetyTaskParticipantEntity).save).not.toHaveBeenCalled();
  });
});
