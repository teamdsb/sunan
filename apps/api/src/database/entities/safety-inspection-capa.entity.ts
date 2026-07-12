import { Column, CreateDateColumn, DeleteDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

abstract class AuditedSafetyEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'created_by', type: 'varchar', length: 64 }) createdBy!: string;
  @Column({ name: 'updated_by', type: 'varchar', length: 64, nullable: true }) updatedBy!: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true }) deletedAt!: Date | null;
}

@Entity({ name: 'inspection_templates' })
@Index('uq_inspection_templates_code', ['code'], { unique: true, where: 'deleted_at IS NULL' })
export class InspectionTemplateEntity extends AuditedSafetyEntity {
  @Column({ type: 'varchar', length: 64 }) code!: string;
  @Column({ type: 'varchar', length: 200 }) name!: string;
  @Column({ name: 'source_type', type: 'varchar', length: 16 }) sourceType!: string;
  @Column({ name: 'current_version_id', type: 'uuid', nullable: true }) currentVersionId!: string | null;
}

@Entity({ name: 'inspection_template_versions' })
@Index('uq_inspection_template_versions_number', ['templateId', 'versionNo'], { unique: true })
@Index('uq_inspection_template_versions_draft', ['templateId'], { unique: true, where: "status = 'draft' AND deleted_at IS NULL" })
export class InspectionTemplateVersionEntity extends AuditedSafetyEntity {
  @Column({ name: 'template_id', type: 'uuid' }) templateId!: string;
  @Column({ name: 'version_no', type: 'integer' }) versionNo!: number;
  @Column({ type: 'varchar', length: 16, default: 'draft' }) status!: string;
  @Column({ name: 'import_source', type: 'varchar', length: 500, nullable: true }) importSource!: string | null;
  @Column({ name: 'published_at', type: 'timestamptz', nullable: true }) publishedAt!: Date | null;
  @Column({ name: 'published_by', type: 'varchar', length: 64, nullable: true }) publishedBy!: string | null;
}

@Entity({ name: 'inspection_template_items' })
@Index('uq_inspection_template_items_code', ['versionId', 'itemCode'], { unique: true, where: 'deleted_at IS NULL' })
@Index('uq_inspection_template_items_sequence', ['versionId', 'sequenceNo'], { unique: true, where: 'deleted_at IS NULL' })
export class InspectionTemplateItemEntity extends AuditedSafetyEntity {
  @Column({ name: 'version_id', type: 'uuid' }) versionId!: string;
  @Column({ name: 'item_code', type: 'varchar', length: 64 }) itemCode!: string;
  @Column({ type: 'varchar', length: 200 }) title!: string;
  @Column({ name: 'clause_ref', type: 'varchar', length: 200, nullable: true }) clauseRef!: string | null;
  @Column({ name: 'result_required', type: 'boolean', default: true }) resultRequired!: boolean;
  @Column({ name: 'evidence_required_on_failure', type: 'boolean', default: true }) evidenceRequiredOnFailure!: boolean;
  @Column({ name: 'sequence_no', type: 'integer' }) sequenceNo!: number;
}

@Entity({ name: 'inspection_template_scopes' })
@Index('idx_inspection_template_scopes_vessel', ['vesselId'])
export class InspectionTemplateScopeEntity extends AuditedSafetyEntity {
  @Column({ name: 'template_id', type: 'uuid' }) templateId!: string;
  @Column({ name: 'vessel_id', type: 'uuid', nullable: true }) vesselId!: string | null;
  @Column({ name: 'department_code', type: 'varchar', length: 64, nullable: true }) departmentCode!: string | null;
}

@Entity({ name: 'inspection_plans' })
@Index('uq_inspection_plans_plan_item', ['planItemId'], { unique: true, where: 'deleted_at IS NULL' })
export class InspectionPlanEntity extends AuditedSafetyEntity {
  @Column({ type: 'varchar', length: 200 }) title!: string;
  @Column({ name: 'plan_id', type: 'uuid' }) planId!: string;
  @Column({ name: 'plan_item_id', type: 'uuid' }) planItemId!: string;
  @Column({ name: 'template_version_id', type: 'uuid' }) templateVersionId!: string;
}

@Entity({ name: 'inspections' })
@Index('uq_inspections_task', ['taskId'], { unique: true, where: 'deleted_at IS NULL' })
@Index('idx_inspections_plan_status', ['inspectionPlanId', 'status'])
export class InspectionEntity extends AuditedSafetyEntity {
  @Column({ name: 'task_id', type: 'uuid' }) taskId!: string;
  @Column({ name: 'inspection_plan_id', type: 'uuid' }) inspectionPlanId!: string;
  @Column({ name: 'template_version_id', type: 'uuid' }) templateVersionId!: string;
  @Column({ name: 'template_snapshot', type: 'jsonb', default: () => "'{}'::jsonb" }) templateSnapshot!: Record<string, unknown>;
  @Column({ type: 'varchar', length: 16, default: 'pending' }) status!: string;
  @Column({ name: 'summary_snapshot', type: 'jsonb', nullable: true }) summarySnapshot!: Record<string, unknown> | null;
  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true }) completedAt!: Date | null;
}

@Entity({ name: 'inspection_results' })
@Index('uq_inspection_results_slot', ['inspectionId', 'templateItemSnapshotKey', 'inspectorUserId'], { unique: true, where: 'deleted_at IS NULL' })
@Index('idx_inspection_results_failure', ['inspectionId', 'conclusion'])
export class InspectionResultEntity extends AuditedSafetyEntity {
  @Column({ name: 'inspection_id', type: 'uuid' }) inspectionId!: string;
  @Column({ name: 'template_item_snapshot_key', type: 'varchar', length: 128 }) templateItemSnapshotKey!: string;
  @Column({ name: 'inspector_user_id', type: 'varchar', length: 64 }) inspectorUserId!: string;
  @Column({ type: 'varchar', length: 20 }) conclusion!: string;
  @Column({ type: 'text', nullable: true }) remark!: string | null;
  @Column({ type: 'varchar', length: 16, default: 'draft' }) status!: string;
  @Column({ name: 'signature_file_id', type: 'uuid', nullable: true }) signatureFileId!: string | null;
  @Column({ name: 'signed_at', type: 'timestamptz', nullable: true }) signedAt!: Date | null;
}

@Entity({ name: 'inspection_result_evidence' })
@Index('uq_inspection_result_evidence', ['resultId', 'fileId'], { unique: true, where: 'deleted_at IS NULL' })
export class InspectionResultEvidenceEntity extends AuditedSafetyEntity {
  @Column({ name: 'result_id', type: 'uuid' }) resultId!: string;
  @Column({ name: 'file_id', type: 'uuid' }) fileId!: string;
  @Column({ type: 'varchar', length: 32, default: 'evidence' }) category!: string;
}

@Entity({ name: 'safety_issues' })
@Index('uq_safety_issues_no', ['issueNo'], { unique: true })
@Index('uq_safety_issues_idempotency', ['idempotencyKey'], { unique: true, where: 'idempotency_key IS NOT NULL AND deleted_at IS NULL' })
@Index('idx_safety_issues_status_due', ['status', 'dueAt'])
export class SafetyIssueEntity extends AuditedSafetyEntity {
  @Column({ name: 'issue_no', type: 'varchar', length: 32 }) issueNo!: string;
  @Column({ type: 'varchar', length: 200 }) title!: string;
  @Column({ name: 'issue_type', type: 'varchar', length: 20 }) issueType!: string;
  @Column({ type: 'varchar', length: 16 }) severity!: string;
  @Column({ type: 'varchar', length: 32, default: 'open' }) status!: string;
  @Column({ name: 'vessel_id', type: 'uuid', nullable: true }) vesselId!: string | null;
  @Column({ name: 'responsibility_scope', type: 'varchar', length: 16, nullable: true }) responsibilityScope!: string | null;
  @Column({ name: 'responsible_user_id', type: 'varchar', length: 64 }) responsibleUserId!: string;
  @Column({ name: 'due_at', type: 'timestamptz' }) dueAt!: Date;
  @Column({ name: 'idempotency_key', type: 'varchar', length: 128, nullable: true }) idempotencyKey!: string | null;
  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true }) closedAt!: Date | null;
  @Column({ name: 'closed_by', type: 'varchar', length: 64, nullable: true }) closedBy!: string | null;
}

@Entity({ name: 'issue_sources' })
@Index('uq_issue_sources_relation', ['issueId', 'sourceType', 'sourceId', 'sourceItemKey'], { unique: true })
@Index('idx_issue_sources_source', ['sourceType', 'sourceId'])
export class IssueSourceEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'issue_id', type: 'uuid' }) issueId!: string;
  @Column({ name: 'source_type', type: 'varchar', length: 32 }) sourceType!: string;
  @Column({ name: 'source_id', type: 'uuid' }) sourceId!: string;
  @Column({ name: 'source_item_key', type: 'varchar', length: 128, default: '' }) sourceItemKey!: string;
  @Column({ name: 'source_snapshot', type: 'jsonb', default: () => "'{}'::jsonb" }) sourceSnapshot!: Record<string, unknown>;
  @Column({ name: 'created_by', type: 'varchar', length: 64 }) createdBy!: string;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
}

@Entity({ name: 'issue_transfer_jobs' })
@Index('uq_issue_transfer_jobs_key', ['dedupeKey'], { unique: true })
@Index('idx_issue_transfer_jobs_worker', ['status', 'nextRetryAt'])
export class IssueTransferJobEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'dedupe_key', type: 'varchar', length: 128 }) dedupeKey!: string;
  @Column({ name: 'inspection_result_id', type: 'uuid' }) inspectionResultId!: string;
  @Column({ type: 'varchar', length: 16, default: 'queued' }) status!: string;
  @Column({ name: 'attempt_count', type: 'integer', default: 0 }) attemptCount!: number;
  @Column({ name: 'failure_code', type: 'varchar', length: 64, nullable: true }) failureCode!: string | null;
  @Column({ name: 'failure_message', type: 'text', nullable: true }) failureMessage!: string | null;
  @Column({ name: 'next_retry_at', type: 'timestamptz', nullable: true }) nextRetryAt!: Date | null;
  @Column({ name: 'issue_id', type: 'uuid', nullable: true }) issueId!: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
}

@Entity({ name: 'safety_capas' })
@Index('uq_safety_capas_issue', ['issueId'], { unique: true, where: 'deleted_at IS NULL' })
export class SafetyCapaEntity extends AuditedSafetyEntity {
  @Column({ name: 'issue_id', type: 'uuid' }) issueId!: string;
  @Column({ type: 'varchar', length: 24, default: 'draft' }) status!: string;
  @Column({ name: 'verifier_user_id', type: 'varchar', length: 64 }) verifierUserId!: string;
  @Column({ name: 'effectiveness_required', type: 'boolean', default: true }) effectivenessRequired!: boolean;
  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true }) closedAt!: Date | null;
  @Column({ name: 'closed_by', type: 'varchar', length: 64, nullable: true }) closedBy!: string | null;
}

@Entity({ name: 'capa_root_causes' })
@Index('uq_capa_root_causes_capa', ['capaId'], { unique: true, where: 'deleted_at IS NULL' })
export class CapaRootCauseEntity extends AuditedSafetyEntity {
  @Column({ name: 'capa_id', type: 'uuid' }) capaId!: string;
  @Column({ type: 'varchar', length: 16 }) method!: string;
  @Column({ type: 'text' }) conclusion!: string;
  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" }) analysis!: Record<string, unknown>;
}

@Entity({ name: 'capa_actions' })
@Index('idx_capa_actions_responsible_due', ['responsibleUserId', 'status', 'dueAt'])
export class CapaActionEntity extends AuditedSafetyEntity {
  @Column({ name: 'capa_id', type: 'uuid' }) capaId!: string;
  @Column({ name: 'action_type', type: 'varchar', length: 16 }) actionType!: string;
  @Column({ type: 'varchar', length: 500 }) title!: string;
  @Column({ name: 'responsible_user_id', type: 'varchar', length: 64 }) responsibleUserId!: string;
  @Column({ name: 'due_at', type: 'timestamptz' }) dueAt!: Date;
  @Column({ type: 'varchar', length: 16, default: 'draft' }) status!: string;
  @Column({ name: 'completion_statement', type: 'text', nullable: true }) completionStatement!: string | null;
  @Column({ name: 'submitted_at', type: 'timestamptz', nullable: true }) submittedAt!: Date | null;
}

@Entity({ name: 'capa_action_evidence' })
@Index('uq_capa_action_evidence', ['capaActionId', 'fileId'], { unique: true, where: 'deleted_at IS NULL' })
export class CapaActionEvidenceEntity extends AuditedSafetyEntity {
  @Column({ name: 'capa_action_id', type: 'uuid' }) capaActionId!: string;
  @Column({ name: 'file_id', type: 'uuid' }) fileId!: string;
  @Column({ type: 'varchar', length: 16, default: 'active' }) status!: string;
  @Column({ name: 'withdraw_reason', type: 'text', nullable: true }) withdrawReason!: string | null;
}

@Entity({ name: 'capa_verifications' })
@Index('idx_capa_verifications_capa_created', ['capaId', 'createdAt'])
export class CapaVerificationEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'capa_id', type: 'uuid' }) capaId!: string;
  @Column({ name: 'verifier_user_id', type: 'varchar', length: 64 }) verifierUserId!: string;
  @Column({ type: 'varchar', length: 16 }) result!: string;
  @Column({ type: 'text' }) conclusion!: string;
  @Column({ name: 'effectiveness_evaluation', type: 'text', nullable: true }) effectivenessEvaluation!: string | null;
  @Column({ name: 'rework_reason', type: 'text', nullable: true }) reworkReason!: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
}

@Entity({ name: 'inspection_capa_action_logs' })
@Index('uq_inspection_capa_action_request', ['objectType', 'operatorUserId', 'requestId'], { unique: true, where: 'request_id IS NOT NULL' })
export class InspectionCapaActionLogEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'object_type', type: 'varchar', length: 32 }) objectType!: string;
  @Column({ name: 'object_id', type: 'uuid' }) objectId!: string;
  @Column({ name: 'action_type', type: 'varchar', length: 32 }) actionType!: string;
  @Column({ name: 'request_id', type: 'varchar', length: 128, nullable: true }) requestId!: string | null;
  @Column({ name: 'operator_user_id', type: 'varchar', length: 64 }) operatorUserId!: string;
  @Column({ type: 'text', nullable: true }) reason!: string | null;
  @Column({ name: 'before_snapshot', type: 'jsonb', default: () => "'{}'::jsonb" }) beforeSnapshot!: Record<string, unknown>;
  @Column({ name: 'after_snapshot', type: 'jsonb', default: () => "'{}'::jsonb" }) afterSnapshot!: Record<string, unknown>;
  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" }) metadata!: Record<string, unknown>;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
}
