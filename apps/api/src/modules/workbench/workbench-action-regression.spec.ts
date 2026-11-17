import { ForbiddenException } from '@nestjs/common';
import { WorkbenchService } from './workbench.service';

describe('Workbench action boundaries', () => {
  const user = { userId: 'reader', roles: ['crew'], departments: ['vessel:one'] } as any;
  const record = { id: 'record', moduleCode: 'shipping_vessel_inspection', status: 'pending_review', ownerUserId: 'owner', applicantUserId: 'owner', assigneeUserId: null, reviewerUserId: null } as any;
  function service() {
    const service = Object.create(WorkbenchService.prototype) as Record<string, any>;
    service.assertRecordVisible = jest.fn().mockResolvedValue(undefined);
    service.canReadRecord = jest.fn().mockResolvedValue(true);
    service.participantRepository = { find: jest.fn().mockResolvedValue([]) };
    service.stepRepository = { findOne: jest.fn().mockResolvedValue(null) };
    return service;
  }

  it.each(['submit', 'assign', 'update_payload', 'archive', 'return_step', 'terminate', 'void', 'reopen', 'delegate', 'transfer'])('denies a read-only caller the %s endpoint action', async (action) => {
    await expect(service().assertActionAuthorized(record, action, undefined, user)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('does not give a legacy owner fallback when other active participants exist', async () => {
    const target = service();
    target.participantRepository.find.mockResolvedValue([{ userId: 'executor', role: 'executor' }]);
    await expect(target.getAvailableActions(record, { ...user, userId: 'owner' })).resolves.toEqual([]);
  });

  it('reconciles and opens the original approval without preparing a second instance', async () => {
    const target = service();
    const approvedRecord = { ...record, status: 'approval_pending', ownerUserId: user.userId, externalProcessInstanceId: 'original-third-no' };
    const instance = { businessRecordId: record.id, processInstanceId: 'original-third-no', wecomTemplateId: 'original-template', internalMirrorStatus: 'approval_pending' };
    target.mustGetRecord = jest.fn().mockResolvedValue(approvedRecord);
    target.mustGetModule = jest.fn().mockResolvedValue({ requiresApproval: true });
    target.approvalSyncRepository = { findOne: jest.fn().mockResolvedValue(instance), save: jest.fn(), create: jest.fn() };
    target.wecomTokenService = { getAccessToken: jest.fn().mockResolvedValue('test-token') };
    target.refreshApprovalInstanceFromWecom = jest.fn().mockResolvedValue(undefined);
    const result = await target.launchApproval({ businessRecordId: record.id, moduleCode: record.moduleCode }, user);
    expect(result.wecomLaunchConfig).toEqual(expect.objectContaining({ oaType: '10002', thirdNo: 'original-third-no', templateId: 'original-template' }));
    expect(target.refreshApprovalInstanceFromWecom).toHaveBeenCalledTimes(1);
    expect(target.approvalSyncRepository.create).not.toHaveBeenCalled();
  });

  it('keeps an uncertain approval pending and blocks SDK relaunch when reconciliation fails', async () => {
    const target = service();
    const approvedRecord = { ...record, status: 'approval_pending', ownerUserId: user.userId, externalProcessInstanceId: 'original-third-no' };
    const instance = { businessRecordId: record.id, processInstanceId: 'original-third-no', wecomTemplateId: 'original-template' };
    target.mustGetRecord = jest.fn().mockResolvedValue(approvedRecord);
    target.mustGetModule = jest.fn().mockResolvedValue({ requiresApproval: true });
    target.approvalSyncRepository = { findOne: jest.fn().mockResolvedValue(instance), save: jest.fn(), create: jest.fn() };
    target.wecomTokenService = { getAccessToken: jest.fn().mockRejectedValue(new Error('upstream timeout')) };
    await expect(target.launchApproval({ businessRecordId: record.id, moduleCode: record.moduleCode }, user)).rejects.toThrow('审批状态尚未核实');
    expect(instance).toEqual(expect.objectContaining({ approvalSyncStatus: 'pending_confirmation' }));
    expect(approvedRecord.status).toBe('approval_pending');
    expect(approvedRecord.externalProcessInstanceId).toBe('original-third-no');
    expect(target.approvalSyncRepository.create).not.toHaveBeenCalled();
  });

  it('reopens rectification and downstream review so a rejected inspection can complete again', async () => {
    const target = service();
    const currentRecord = { ...record };
    const steps = ['on_site_inspection', 'rectification', 'review_close'].map((stepCode, index) => ({ id: stepCode, stepCode, status: 'completed', sequenceNo: index + 1, completedBy: 'executor', completedAt: new Date() }));
    target.mustGetRecord = jest.fn().mockResolvedValue(currentRecord);
    target.assertActionAuthorized = jest.fn().mockResolvedValue(undefined);
    target.mustGetModule = jest.fn().mockResolvedValue({ templateType: 'inspection_rectification' });
    target.mustGetModuleTemplate = jest.fn().mockResolvedValue({ schemaDefinition: {} });
    target.stepRepository.find = jest.fn().mockResolvedValue(steps);
    target.stepRepository.save = jest.fn().mockImplementation(async (value: unknown) => value);
    target.recordRepository = { save: jest.fn().mockImplementation(async (value: unknown) => value) };
    target.appendActionLog = jest.fn().mockResolvedValue(undefined);
    await target.performRecordAction(record.id, { actionType: 'request_rework' }, user);
    expect(steps.map((step) => step.status)).toEqual(['completed', 'in_progress', 'pending']);
    expect(steps[1]!.completedAt).toBeNull();
    await target.performRecordAction(record.id, { actionType: 'complete_step', payload: { stepCode: 'rectification' } }, user);
    await target.performRecordAction(record.id, { actionType: 'complete_step', payload: { stepCode: 'review_close' } }, user);
    expect(currentRecord.status).toBe('pending_review');
    await target.performRecordAction(record.id, { actionType: 'close_record' }, user);
    expect(currentRecord.status).toBe('closed');
  });
});
