import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

abstract class AuditedEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'created_by', type: 'varchar', length: 64 }) createdBy!: string;
  @Column({ name: 'updated_by', type: 'varchar', length: 64, nullable: true }) updatedBy!: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true }) deletedAt!: Date | null;
}

@Entity({ name: 'safety_plans' })
@Index('idx_safety_plans_owner_status', ['ownerUserId', 'status'], { where: 'deleted_at IS NULL' })
@Index('idx_safety_plans_vessel_status', ['vesselId', 'status'], { where: 'deleted_at IS NULL' })
export class SafetyPlanEntity extends AuditedEntity {
  @Column({ type: 'varchar', length: 200 }) title!: string;
  @Column({ type: 'text', nullable: true }) description!: string | null;
  @Column({ name: 'plan_type', type: 'varchar', length: 16 }) planType!: string;
  @Column({ type: 'varchar', length: 16, default: 'draft' }) status!: string;
  @Column({ name: 'owner_user_id', type: 'varchar', length: 64 }) ownerUserId!: string;
  @Column({ name: 'time_zone', type: 'varchar', length: 64, default: 'Asia/Shanghai' }) timeZone!: string;
  @Column({ name: 'vessel_id', type: 'uuid', nullable: true }) vesselId!: string | null;
  @Column({ name: 'scope_snapshot', type: 'jsonb', default: () => "'{}'::jsonb" }) scopeSnapshot!: Record<string, unknown>;
}

@Entity({ name: 'safety_plan_items' })
@Index('idx_safety_plan_items_plan_enabled', ['planId', 'enabled'], { where: 'deleted_at IS NULL' })
@Index('uq_safety_plan_items_plan_title', ['planId', 'title'], { unique: true, where: 'deleted_at IS NULL' })
export class SafetyPlanItemEntity extends AuditedEntity {
  @Column({ name: 'plan_id', type: 'uuid' }) planId!: string;
  @Column({ type: 'varchar', length: 200 }) title!: string;
  @Column({ type: 'text', nullable: true }) description!: string | null;
  @Column({ name: 'responsible_user_id', type: 'varchar', length: 64 }) responsibleUserId!: string;
  @Column({ name: 'participant_snapshot', type: 'jsonb', default: () => "'[]'::jsonb" }) participantSnapshot!: Array<{ userId: string; role: string }>;
  @Column({ name: 'completion_rule', type: 'varchar', length: 16, default: 'all' }) completionRule!: string;
  @Column({ name: 'quorum_count', type: 'integer', nullable: true }) quorumCount!: number | null;
  @Column({ type: 'jsonb' }) recurrence!: Record<string, unknown>;
  @Column({ name: 'due_offset_minutes', type: 'integer' }) dueOffsetMinutes!: number;
  @Column({ name: 'rule_version', type: 'integer', default: 1 }) ruleVersion!: number;
  @Column({ type: 'boolean', default: true }) enabled!: boolean;
}

@Entity({ name: 'safety_tasks' })
@Index('uq_safety_tasks_generation_key', ['generationKey'], { unique: true, where: 'deleted_at IS NULL' })
@Index('idx_safety_tasks_responsible_due', ['responsibleUserId', 'status', 'dueAt'], { where: 'deleted_at IS NULL' })
@Index('idx_safety_tasks_plan_scheduled', ['planId', 'scheduledAt'], { where: 'deleted_at IS NULL' })
@Index('idx_safety_tasks_item_scheduled', ['planItemId', 'scheduledAt'], { where: 'deleted_at IS NULL' })
@Index('idx_safety_tasks_vessel_due', ['vesselId', 'dueAt'], { where: 'deleted_at IS NULL' })
export class SafetyTaskEntity extends AuditedEntity {
  @Column({ name: 'plan_id', type: 'uuid' }) planId!: string;
  @Column({ name: 'plan_item_id', type: 'uuid' }) planItemId!: string;
  @Column({ name: 'generation_key', type: 'varchar', length: 128 }) generationKey!: string;
  @Column({ type: 'varchar', length: 200 }) title!: string;
  @Column({ type: 'varchar', length: 16, default: 'pending' }) status!: string;
  @Column({ name: 'responsible_user_id', type: 'varchar', length: 64 }) responsibleUserId!: string;
  @Column({ name: 'scheduled_at', type: 'timestamptz' }) scheduledAt!: Date;
  @Column({ name: 'due_at', type: 'timestamptz' }) dueAt!: Date;
  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true }) completedAt!: Date | null;
  @Column({ name: 'vessel_id', type: 'uuid', nullable: true }) vesselId!: string | null;
  @Column({ name: 'scope_snapshot', type: 'jsonb', default: () => "'{}'::jsonb" }) scopeSnapshot!: Record<string, unknown>;
  @Column({ name: 'rule_version', type: 'integer' }) ruleVersion!: number;
}

@Entity({ name: 'safety_task_participants' })
@Index('idx_safety_task_participants_user_status', ['userId', 'status'])
@Index('idx_safety_task_participants_task', ['taskId'])
@Index('uq_safety_task_participants_active', ['taskId', 'userId', 'role'], { unique: true, where: "status = 'active' AND deleted_at IS NULL" })
export class SafetyTaskParticipantEntity extends AuditedEntity {
  @Column({ name: 'task_id', type: 'uuid' }) taskId!: string;
  @Column({ name: 'user_id', type: 'varchar', length: 64 }) userId!: string;
  @Column({ type: 'varchar', length: 16 }) role!: string;
  @Column({ type: 'varchar', length: 16, default: 'active' }) status!: string;
  @Column({ name: 'effective_from', type: 'timestamptz', nullable: true }) effectiveFrom!: Date | null;
  @Column({ name: 'effective_until', type: 'timestamptz', nullable: true }) effectiveUntil!: Date | null;
  @Column({ name: 'transferred_to_user_id', type: 'varchar', length: 64, nullable: true }) transferredToUserId!: string | null;
  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true }) completedAt!: Date | null;
}

@Entity({ name: 'safety_task_action_logs' })
@Index('idx_safety_task_action_logs_task_created', ['taskId', 'createdAt'])
@Index('uq_safety_task_action_request', ['operatorUserId', 'requestId'], { unique: true, where: 'request_id IS NOT NULL' })
export class SafetyTaskActionLogEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'task_id', type: 'uuid' }) taskId!: string;
  @Column({ name: 'action_type', type: 'varchar', length: 32 }) actionType!: string;
  @Column({ name: 'operator_user_id', type: 'varchar', length: 64 }) operatorUserId!: string;
  @Column({ type: 'text', nullable: true }) reason!: string | null;
  @Column({ name: 'from_status', type: 'varchar', length: 16, nullable: true }) fromStatus!: string | null;
  @Column({ name: 'to_status', type: 'varchar', length: 16, nullable: true }) toStatus!: string | null;
  @Column({ name: 'request_id', type: 'varchar', length: 128, nullable: true }) requestId!: string | null;
  @Column({ name: 'before_snapshot', type: 'jsonb', default: () => "'{}'::jsonb" }) beforeSnapshot!: Record<string, unknown>;
  @Column({ name: 'after_snapshot', type: 'jsonb', default: () => "'{}'::jsonb" }) afterSnapshot!: Record<string, unknown>;
  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" }) metadata!: Record<string, unknown>;
  @Column({ name: 'created_by', type: 'varchar', length: 64 }) createdBy!: string;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
}

@Entity({ name: 'safety_task_transfers' })
@Index('idx_safety_task_transfers_task_created', ['taskId', 'createdAt'])
export class SafetyTaskTransferEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'task_id', type: 'uuid' }) taskId!: string;
  @Column({ name: 'from_user_id', type: 'varchar', length: 64 }) fromUserId!: string;
  @Column({ name: 'to_user_id', type: 'varchar', length: 64 }) toUserId!: string;
  @Column({ type: 'text' }) reason!: string;
  @Column({ name: 'transferred_by', type: 'varchar', length: 64 }) transferredBy!: string;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
}

@Entity({ name: 'safety_task_delegations' })
@Index('idx_safety_task_delegations_delegate_period', ['delegateUserId', 'status', 'effectiveUntil'])
@Index('idx_safety_task_delegations_task', ['taskId'])
export class SafetyTaskDelegationEntity extends AuditedEntity {
  @Column({ name: 'task_id', type: 'uuid' }) taskId!: string;
  @Column({ name: 'delegator_user_id', type: 'varchar', length: 64 }) delegatorUserId!: string;
  @Column({ name: 'delegate_user_id', type: 'varchar', length: 64 }) delegateUserId!: string;
  @Column({ name: 'effective_from', type: 'timestamptz' }) effectiveFrom!: Date;
  @Column({ name: 'effective_until', type: 'timestamptz' }) effectiveUntil!: Date;
  @Column({ type: 'text' }) reason!: string;
  @Column({ type: 'varchar', length: 16, default: 'active' }) status!: string;
}

@Entity({ name: 'safety_task_generation_runs' })
@Index('idx_safety_task_generation_runs_plan_requested', ['planId', 'requestedAt'])
@Index('uq_safety_task_generation_request', ['requestedBy', 'requestId'], { unique: true })
export class SafetyTaskGenerationRunEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'plan_id', type: 'uuid' }) planId!: string;
  @Column({ name: 'trigger_source', type: 'varchar', length: 16 }) triggerSource!: string;
  @Column({ type: 'varchar', length: 16 }) mode!: string;
  @Column({ type: 'varchar', length: 16, default: 'queued' }) status!: string;
  @Column({ name: 'window_start', type: 'timestamptz' }) windowStart!: Date;
  @Column({ name: 'window_end', type: 'timestamptz' }) windowEnd!: Date;
  @Column({ name: 'created_count', type: 'integer', default: 0 }) createdCount!: number;
  @Column({ name: 'skipped_count', type: 'integer', default: 0 }) skippedCount!: number;
  @Column({ name: 'failed_count', type: 'integer', default: 0 }) failedCount!: number;
  @Column({ name: 'requested_by', type: 'varchar', length: 64 }) requestedBy!: string;
  @Column({ name: 'request_id', type: 'varchar', length: 128 }) requestId!: string;
  @CreateDateColumn({ name: 'requested_at', type: 'timestamptz' }) requestedAt!: Date;
  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true }) completedAt!: Date | null;
  @Column({ name: 'failure_message', type: 'text', nullable: true }) failureMessage!: string | null;
}

@Entity({ name: 'safety_task_generation_entries' })
@Index('uq_safety_task_generation_entries_key', ['runId', 'generationKey'], { unique: true })
@Index('idx_safety_task_generation_entries_run', ['runId', 'status'])
@Index('idx_safety_task_generation_entries_item_occurrence', ['planItemId', 'occurrenceAt'])
@Index('idx_safety_task_generation_entries_task', ['taskId'])
export class SafetyTaskGenerationEntryEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'run_id', type: 'uuid' }) runId!: string;
  @Column({ name: 'plan_item_id', type: 'uuid' }) planItemId!: string;
  @Column({ name: 'generation_key', type: 'varchar', length: 128 }) generationKey!: string;
  @Column({ name: 'occurrence_at', type: 'timestamptz' }) occurrenceAt!: Date;
  @Column({ type: 'varchar', length: 16, default: 'queued' }) status!: string;
  @Column({ name: 'task_id', type: 'uuid', nullable: true }) taskId!: string | null;
  @Column({ name: 'attempt_count', type: 'integer', default: 0 }) attemptCount!: number;
  @Column({ name: 'failure_code', type: 'varchar', length: 64, nullable: true }) failureCode!: string | null;
  @Column({ name: 'failure_message', type: 'text', nullable: true }) failureMessage!: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
}

@Entity({ name: 'safety_task_notification_deliveries' })
@Index('uq_safety_task_notification_dedupe', ['dedupeKey'], { unique: true, where: 'deleted_at IS NULL' })
@Index('idx_safety_task_delivery_worker', ['status', 'nextRetryAt'], { where: 'deleted_at IS NULL' })
@Index('idx_safety_task_delivery_task_created', ['taskId', 'createdAt'], { where: 'deleted_at IS NULL' })
export class SafetyTaskNotificationDeliveryEntity extends AuditedEntity {
  @Column({ name: 'task_id', type: 'uuid' }) taskId!: string;
  @Column({ name: 'recipient_user_id', type: 'varchar', length: 64 }) recipientUserId!: string;
  @Column({ name: 'message_type', type: 'varchar', length: 16 }) messageType!: string;
  @Column({ name: 'dedupe_key', type: 'varchar', length: 255 }) dedupeKey!: string;
  @Column({ name: 'payload_snapshot', type: 'jsonb', default: () => "'{}'::jsonb" }) payloadSnapshot!: Record<string, unknown>;
  @Column({ type: 'varchar', length: 16, default: 'queued' }) status!: string;
  @Column({ name: 'attempt_count', type: 'integer', default: 0 }) attemptCount!: number;
  @Column({ name: 'attempt_history', type: 'jsonb', default: () => "'[]'::jsonb" }) attemptHistory!: Array<Record<string, unknown>>;
  @Column({ name: 'wecom_errcode', type: 'integer', nullable: true }) wecomErrcode!: number | null;
  @Column({ name: 'failure_reason', type: 'text', nullable: true }) failureReason!: string | null;
  @Column({ name: 'next_retry_at', type: 'timestamptz', nullable: true }) nextRetryAt!: Date | null;
  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true }) sentAt!: Date | null;
}
