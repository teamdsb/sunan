import { ForbiddenException } from '@nestjs/common';
import { InspectionCapaService } from './inspection-capa.service';

describe('Inspection and CAPA workflow boundaries', () => {
  const manager = { userId: 'manager', roles: ['shipping'] } as any;
  it('keeps a newly created draft out of the current published version pointer', async () => {
    const service = Object.create(InspectionCapaService.prototype) as Record<string, any>;
    service.templates = { exists: jest.fn().mockResolvedValue(false), create: (value: unknown) => value, save: jest.fn().mockImplementation(async (value: Record<string, unknown>) => ({ id: 'template', ...value })) };
    service.versions = { create: (value: unknown) => value, save: jest.fn().mockImplementation(async (value: Record<string, unknown>) => ({ id: 'draft', ...value })) };
    service.saveTemplateItems = jest.fn().mockResolvedValue(undefined);
    service.audit = jest.fn().mockResolvedValue(undefined);
    const result = await service.createTemplate(manager, { code: 'one', name: 'One', sourceType: 'company', items: [{ itemCode: 'a', sequenceNo: 1 }] }, 'request');
    expect(result.currentVersionId).toBeNull();
  });

  it('lets an assigned CAPA action owner discover and read the issue without granting management', async () => {
    const service = Object.create(InspectionCapaService.prototype) as Record<string, any>;
    const issue = { id: 'issue', createdBy: 'creator', responsibleUserId: 'responsible' };
    service.capas = { exists: jest.fn().mockResolvedValue(false), find: jest.fn().mockResolvedValue([{ id: 'capa', issueId: issue.id, verifierUserId: 'verifier' }]) };
    service.capaActions = { exists: jest.fn().mockResolvedValue(true), find: jest.fn().mockResolvedValue([{ capaId: 'capa', responsibleUserId: 'action-owner' }]) };
    const user = { userId: 'action-owner', roles: ['crew'] } as any;
    await expect(service.assertReadIssue(issue, user)).resolves.toBeUndefined();
    await expect(service.visibleIssueIds([issue], user)).resolves.toEqual(new Set(['issue']));
    expect(() => { service.assertIssueManager(issue, user); }).toThrow(ForbiddenException);
  });

  it('does not allow signing a cancelled inspection', async () => {
    const service = Object.create(InspectionCapaService.prototype) as Record<string, any>;
    service.mustInspection = jest.fn().mockResolvedValue({ status: 'cancelled', templateSnapshot: { items: [] } });
    service.assertInspectionExecutor = jest.fn().mockResolvedValue(undefined);
    service.assertFile = jest.fn().mockResolvedValue(undefined);
    service.results = { find: jest.fn().mockResolvedValue([]), save: jest.fn() };
    service.participants = { findOne: jest.fn().mockResolvedValue(null) };
    service.inspections = { save: jest.fn() };
    service.audit = jest.fn();
    service.inspectionDto = jest.fn().mockResolvedValue({});
    await expect(service.submitInspection('inspection', manager, { signatureFileId: 'signature' }, 'request')).rejects.toThrow('Terminal inspections cannot be changed');
  });
});
