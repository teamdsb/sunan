import { createHash } from 'node:crypto';

export type CompletionRule = 'all' | 'any' | 'quorum';

type TemplateVersionInput = {
  id: string;
  versionNo: number;
  sourceType: string;
  scopes: Array<Record<string, unknown>>;
  items: Array<{ itemCode: string; title: string; resultRequired: boolean; evidenceRequiredOnFailure?: boolean }>;
};

export type TemplateSnapshot = {
  versionId: string;
  versionNo: number;
  sourceType: string;
  scopes: Array<Record<string, unknown>>;
  items: Array<{ snapshotKey: string; itemCode: string; title: string; resultRequired: boolean; evidenceRequiredOnFailure: boolean }>;
};

export function snapshotTemplateVersion(version: TemplateVersionInput): Readonly<TemplateSnapshot> {
  return Object.freeze({
    versionId: version.id,
    versionNo: version.versionNo,
    sourceType: version.sourceType,
    scopes: version.scopes.map((scope) => ({ ...scope })),
    items: version.items.map((item) => ({
      snapshotKey: item.itemCode,
      itemCode: item.itemCode,
      title: item.title,
      resultRequired: item.resultRequired,
      evidenceRequiredOnFailure: item.evidenceRequiredOnFailure ?? true,
    })),
  });
}

export function canSummarizeInspection(input: {
  completionRule: CompletionRule;
  quorumCount?: number;
  activeParticipantIds: readonly string[];
  submittedBy: readonly string[];
}): boolean {
  const submitted = new Set(input.submittedBy.filter((id) => input.activeParticipantIds.includes(id)));
  if (input.completionRule === 'all') {
    return input.activeParticipantIds.length > 0 && input.activeParticipantIds.every((id) => submitted.has(id));
  }
  if (input.completionRule === 'any') return submitted.size > 0;
  return Boolean(input.quorumCount && submitted.size >= input.quorumCount);
}

export function buildIssueTransferKey(inspectionId: string, templateItemSnapshotKey: string): string {
  return createHash('sha256').update(`${inspectionId}:${templateItemSnapshotKey}`).digest('hex');
}

type ClosureAction = { accepted: boolean; evidenceCount: number };

export function canCloseIssue(input: {
  severity: 'minor' | 'major' | 'critical';
  actorRoles: string[];
  hasRootCause: boolean;
  corrective: ClosureAction | null;
  preventive: ClosureAction | null;
  latestVerification: 'passed' | 'failed' | null;
  effectivenessEvaluation: string;
}): { allowed: boolean; reason: string | null } {
  const privileged = input.actorRoles.some((role) => ['verifier', 'reviewer', 'system_admin'].includes(role));
  if (input.severity === 'major' && !privileged) return { allowed: false, reason: 'major_close_requires_verifier' };
  if (input.severity === 'critical' && !privileged) return { allowed: false, reason: 'critical_close_requires_verifier' };
  if (!input.hasRootCause) return { allowed: false, reason: 'root_cause_missing' };
  if (!input.corrective?.accepted || !input.preventive?.accepted) return { allowed: false, reason: 'required_actions_not_accepted' };
  if (input.corrective.evidenceCount < 1 || input.preventive.evidenceCount < 1) return { allowed: false, reason: 'required_evidence_missing' };
  if (input.latestVerification !== 'passed') return { allowed: false, reason: 'verification_not_passed' };
  if (!input.effectivenessEvaluation.trim()) return { allowed: false, reason: 'effectiveness_missing' };
  return { allowed: true, reason: null };
}

export function transitionVerification(input: {
  capaStatus: 'pending_verification';
  result: 'passed' | 'failed';
  reworkReason: string;
}): { capaStatus: 'verified' | 'in_progress'; verificationStatus: 'passed' | 'failed'; reworkReason: string | null } {
  if (input.result === 'failed') {
    const reworkReason = input.reworkReason.trim();
    if (!reworkReason) throw new Error('rework reason is required');
    return { capaStatus: 'in_progress', verificationStatus: 'failed', reworkReason };
  }
  return { capaStatus: 'verified', verificationStatus: 'passed', reworkReason: null };
}

export function resolveInspectionAvailableActions(input: {
  canRead: boolean;
  canExecute: boolean;
  alreadySubmitted: boolean;
  status: string;
  canSummarize: boolean;
}): string[] {
  if (!input.canRead) return [];

  const actions = ['read'];
  const isTerminal = ['completed', 'cancelled'].includes(input.status);
  if (input.canExecute && !input.alreadySubmitted && !isTerminal) {
    actions.push('save_result', 'submit');
  }
  if (input.canSummarize && input.status === 'submitted') {
    actions.push('summarize');
  }

  return actions;
}

export function resolveIssueAvailableActions(input: {
  canRead: boolean;
  canManage: boolean;
  issueStatus: string;
  hasCapa: boolean;
  capaStatus: string | null;
  verificationReady: boolean;
  canVerify: boolean;
  canClose: boolean;
}): string[] {
  if (!input.canRead) return [];

  const actions = ['read'];
  if (input.issueStatus === 'closed') return actions;

  if (!input.hasCapa) {
    if (input.canManage) actions.push('create_capa');
    return actions;
  }

  if (input.canManage && input.capaStatus === 'in_progress') {
    actions.push('save_root_cause', 'create_action');
    if (input.verificationReady) actions.push('request_verification');
  }
  if (input.canVerify && input.capaStatus === 'pending_verification') {
    actions.push('verify');
  }
  if (input.canClose && input.capaStatus === 'verified') {
    actions.push('close');
  }

  return actions;
}

export function resolveCapaActionAvailableActions(input: {
  status: string;
  isResponsible: boolean;
  isAdmin: boolean;
  isVerifier: boolean;
  isReviewer: boolean;
}): string[] {
  const actions: string[] = [];
  if (
    (input.isResponsible || input.isAdmin) &&
    ['draft', 'assigned', 'in_progress', 'returned'].includes(input.status)
  ) {
    actions.push('submit');
  }
  if (
    input.status === 'submitted' &&
    !input.isResponsible &&
    (input.isVerifier || input.isAdmin || input.isReviewer)
  ) {
    actions.push('accept');
  }
  return actions;
}
