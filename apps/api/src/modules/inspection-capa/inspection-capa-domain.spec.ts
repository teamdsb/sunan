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

describe('inspection and CAPA domain rules', () => {
  const template = {
    id: 'version-1',
    versionNo: 3,
    sourceType: 'regulation',
    scopes: [{ vesselId: 'vessel-1' }],
    items: [{ itemCode: 'ISM-1', title: '救生设备', resultRequired: true }],
  };

  it('takes an immutable template-version snapshot for an issued inspection', () => {
    const snapshot = snapshotTemplateVersion(template);
    template.items[0]!.title = '被后续版本修改';
    template.scopes[0]!.vesselId = 'vessel-2';

    expect(snapshot).toEqual({
      versionId: 'version-1',
      versionNo: 3,
      sourceType: 'regulation',
      scopes: [{ vesselId: 'vessel-1' }],
      items: [{ snapshotKey: 'ISM-1', itemCode: 'ISM-1', title: '救生设备', resultRequired: true, evidenceRequiredOnFailure: true }],
    });
    expect(Object.isFrozen(snapshot)).toBe(true);
  });

  it.each([
    ['all', undefined, ['inspector-a'], false],
    ['all', undefined, ['inspector-a', 'inspector-b'], true],
    ['any', undefined, ['inspector-b'], true],
    ['quorum', 2, ['inspector-a'], false],
    ['quorum', 2, ['inspector-a', 'inspector-b'], true],
  ] as const)('enforces %s completion before inspection summary', (completionRule, quorumCount, submittedBy, expected) => {
    expect(canSummarizeInspection({
      completionRule,
      quorumCount,
      activeParticipantIds: ['inspector-a', 'inspector-b'],
      submittedBy,
    })).toBe(expected);
  });

  it('uses one stable issue-transfer key for repeated and concurrent nonconforming results', () => {
    const first = buildIssueTransferKey('inspection-1', 'ISM-1');
    const repeated = Array.from({ length: 8 }, () => buildIssueTransferKey('inspection-1', 'ISM-1'));

    expect(new Set(repeated)).toEqual(new Set([first]));
    expect(buildIssueTransferKey('inspection-1', 'ISM-2')).not.toBe(first);
    expect(buildIssueTransferKey('inspection-2', 'ISM-1')).not.toBe(first);
  });

  it('blocks close until required CAPA actions, evidence, passed verification and effectiveness are complete', () => {
    const complete = {
      severity: 'major' as const,
      actorRoles: ['verifier'],
      hasRootCause: true,
      corrective: { accepted: true, evidenceCount: 1 },
      preventive: { accepted: true, evidenceCount: 1 },
      latestVerification: 'passed' as const,
      effectivenessEvaluation: '三个月内无重复问题',
    };

    expect(canCloseIssue(complete)).toEqual({ allowed: true, reason: null });
    expect(canCloseIssue({ ...complete, corrective: { accepted: false, evidenceCount: 1 } }).reason).toBe('required_actions_not_accepted');
    expect(canCloseIssue({ ...complete, preventive: { accepted: true, evidenceCount: 0 } }).reason).toBe('required_evidence_missing');
    expect(canCloseIssue({ ...complete, latestVerification: 'failed' }).reason).toBe('verification_not_passed');
    expect(canCloseIssue({ ...complete, effectivenessEvaluation: '' }).reason).toBe('effectiveness_missing');
    expect(canCloseIssue({ ...complete, actorRoles: ['executor'] }).reason).toBe('major_close_requires_verifier');
  });

  it('returns CAPA to in progress when verification fails and preserves the rework reason', () => {
    expect(transitionVerification({ capaStatus: 'pending_verification', result: 'failed', reworkReason: '照片不清晰' })).toEqual({
      capaStatus: 'in_progress',
      verificationStatus: 'failed',
      reworkReason: '照片不清晰',
    });
    expect(() => transitionVerification({ capaStatus: 'pending_verification', result: 'failed', reworkReason: '' })).toThrow('rework reason is required');
    expect(transitionVerification({ capaStatus: 'pending_verification', result: 'passed', reworkReason: '' })).toEqual({
      capaStatus: 'verified',
      verificationStatus: 'passed',
      reworkReason: null,
    });
  });

  it('returns only issue actions that match authorization, responsibility and state', () => {
    const base = {
      canRead: true,
      canManage: false,
      issueStatus: 'action_in_progress',
      hasCapa: true,
      capaStatus: 'in_progress',
      verificationReady: false,
      canVerify: false,
      canClose: false,
    };

    expect(resolveIssueAvailableActions(base)).toEqual(['read']);
    expect(resolveIssueAvailableActions({
      ...base,
      canManage: true,
      verificationReady: true,
    })).toEqual([
      'read',
      'save_root_cause',
      'create_action',
      'request_verification',
    ]);
    expect(resolveIssueAvailableActions({
      ...base,
      capaStatus: 'pending_verification',
      canVerify: true,
    })).toEqual(['read', 'verify']);
    expect(resolveIssueAvailableActions({
      ...base,
      capaStatus: 'verified',
      canClose: true,
    })).toEqual(['read', 'close']);
    expect(resolveIssueAvailableActions({
      ...base,
      hasCapa: false,
      capaStatus: null,
      canManage: true,
    })).toEqual(['read', 'create_capa']);
  });

  it('makes an inspection read-only for a participant after personal submission', () => {
    const base = {
      canRead: true,
      canExecute: true,
      alreadySubmitted: false,
      status: 'in_progress',
      canSummarize: false,
    };

    expect(resolveInspectionAvailableActions(base)).toEqual([
      'read',
      'save_result',
      'submit',
    ]);
    expect(resolveInspectionAvailableActions({
      ...base,
      alreadySubmitted: true,
      status: 'submitted',
    })).toEqual(['read']);
    expect(resolveInspectionAvailableActions({
      ...base,
      canExecute: false,
      status: 'submitted',
      canSummarize: true,
    })).toEqual(['read', 'summarize']);
  });

  it('separates CAPA action submission from independent acceptance', () => {
    expect(resolveCapaActionAvailableActions({
      status: 'assigned',
      isResponsible: true,
      isAdmin: false,
      isVerifier: false,
      isReviewer: false,
    })).toEqual(['submit']);
    expect(resolveCapaActionAvailableActions({
      status: 'submitted',
      isResponsible: false,
      isAdmin: false,
      isVerifier: true,
      isReviewer: false,
    })).toEqual(['accept']);
    expect(resolveCapaActionAvailableActions({
      status: 'submitted',
      isResponsible: true,
      isAdmin: false,
      isVerifier: true,
      isReviewer: false,
    })).toEqual([]);
  });
});
