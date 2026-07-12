---
status: current-spec
owner: safety
updated: 2026-07-11
replaces: []
replaced_by: []
---
# Wave 5 计划任务数据库规格

## 表、关系与保留规则

Wave 5 新增表全部使用 UUID、`created_at`、`updated_at`、`deleted_at`、`created_by`、`updated_by`，并使用 PostgreSQL `TIMESTAMPTZ`。任务动作和转移是不可变记录；投递行只允许推进投递状态并向 `attempt_history` 追加尝试结果，不得删除既有错误历史。所有受控外键使用 `ON DELETE RESTRICT`，且外键列有索引。

| 表 | 核心字段 | 约束与索引 |
|---|---|---|
| `safety_plans` | `title`, `description`, `plan_type`, `status`, `owner_user_id`, `time_zone`, `vessel_id`, `scope_snapshot` | `plan_type in (annual,monthly,periodic,one_time)`；`status in (draft,active,paused,retired)`；时区固定 `Asia/Shanghai`；`vessel_id -> vessels.id`；按 `(owner_user_id,status)`、`(vessel_id,status)` 部分索引。 |
| `safety_plan_items` | `plan_id`, `title`, `responsible_user_id`, `participant_snapshot`, `completion_rule`, `quorum_count`, `recurrence`, `due_offset_minutes`, `rule_version`, `enabled` | `plan_id -> safety_plans.id`；`completion_rule in (all,any,quorum)`；quorum 仅在 `quorum` 时为正数；`recurrence` 为规范化 JSONB；同计划、未删除标题部分唯一；按 `(plan_id,enabled)` 索引。 |
| `safety_tasks` | `plan_id`, `plan_item_id`, `generation_key`, `title`, `status`, `responsible_user_id`, `scheduled_at`, `due_at`, `completed_at`, `vessel_id`, `scope_snapshot`, `rule_version` | `plan_id/plan_item_id` 分别 FK 到计划/计划项；`vessel_id -> vessels.id`；`generation_key` 不可空且未删除任务上唯一；`status in (pending,in_progress,blocked,completed,cancelled)`；`due_at >= scheduled_at`；按负责人/状态/期限、计划项/计划时间、船舶/期限索引。 |
| `safety_task_participants` | `task_id`, `user_id`, `role`, `status`, `effective_from`, `effective_until`, `transferred_to_user_id` | `task_id -> safety_tasks.id`；角色为 `executor/collaborator/reviewer/observer/delegate`；状态为 `active/transferred/withdrawn`；有效期合法；同任务、用户、角色的活跃关系部分唯一；按 `(user_id,status,effective_until)` 索引。 |
| `safety_task_action_logs` | `task_id`, `action_type`, `operator_user_id`, `request_id`, `reason`, `from_status`, `to_status`, `before_snapshot`, `after_snapshot` | `task_id -> safety_tasks.id`；不可变；`request_id` 与操作者、动作部分唯一，用于客户端动作幂等；按 `(task_id,created_at)` 索引。 |
| `safety_task_transfers` | `task_id`, `from_user_id`, `to_user_id`, `reason`, `transferred_by` | `task_id -> safety_tasks.id`；来源和目标不同；不可变；按 `(task_id,created_at)` 索引。 |
| `safety_task_delegations` | `task_id`, `delegator_user_id`, `delegate_user_id`, `effective_from`, `effective_until`, `reason`, `status` | `task_id -> safety_tasks.id`；委托与代理人不同；`status in (active,withdrawn,expired)`；仅有效期内的 `active` 关系授予执行权；按代理人、有效期和任务索引。 |
| `safety_task_generation_runs` | `plan_id`, `trigger_source`, `mode`, `status`, `window_start`, `window_end`, `created_count`, `skipped_count`, `failed_count`, `requested_by`, `requested_at`, `completed_at` | `plan_id -> safety_plans.id`；`mode in (generate,reconcile)`；`status in (queued,running,succeeded,failed)`；窗口开始早于结束；按 `(plan_id,requested_at)`、`(status,requested_at)` 索引。 |
| `safety_task_generation_entries` | `run_id`, `plan_item_id`, `generation_key`, `occurrence_at`, `status`, `task_id`, `attempt_count`, `failure_code`, `failure_message` | `run_id -> safety_task_generation_runs.id`、`plan_item_id -> safety_plan_items.id`、`task_id -> safety_tasks.id`；`(run_id,generation_key)` 唯一，使每次运行都能记录 created/skipped 结果；状态为 `queued/running/succeeded/failed/skipped`；按失败/重试和计划项/发生时点索引。 |
| `safety_task_notification_deliveries` | `task_id`, `recipient_user_id`, `message_type`, `dedupe_key`, `payload_snapshot`, `status`, `attempt_count`, `attempt_history`, `wecom_errcode`, `failure_reason`, `next_retry_at`, `sent_at` | `task_id -> safety_tasks.id`；消息类型 `assignment/reminder/escalation/transfer`；状态 `queued/dispatching/sent/failed/skipped`；`attempt_history` 追加保存每次尝试的时间、结果、errcode 和错误；`dedupe_key` 未删除记录上唯一；按 `(status,next_retry_at)` 供 worker 领取，按 `(task_id,created_at)` 供详情审计。 |

`scope_snapshot`、`participant_snapshot`、`recurrence` 和消息 payload 都是生成/发送当时的审计快照，不得被主数据后续改名、停用或任职变更覆盖。新计划、计划项和动作在服务端校验负责人、参与人和船舶均处于可用且被当前调用者授权的状态；历史任务读取快照仍可用。

## 幂等、并发与对账

生成键为 SHA-256：`plan_item_id + rule_version + canonical_occurrence_at_in_plan_timezone`。生成器先在同一数据库连接上按 generation key 获取事务级 advisory lock，再在同一事务内写任务、参与人、generation entry 和 assignment outbox；`safety_tasks.generation_key` 唯一约束继续作为最终防线。已有任务在本次运行 entry 中计为 `skipped`。任务唯一约束与每运行条目唯一约束共同保证重跑、并发运行、worker 崩溃恢复和手工重试不会生成第二个任务，同时每次对账均有独立结果证据。

运行失败在本次 generation entry 保存状态、次数和错误；新的 reconcile 运行沿用稳定 generation key，补建缺失任务或无参与关系的中断任务，并以 `created/skipped/failed` 汇总对账结果。对账不通过删除已有任务“修复”差异。

消息投递的去重键为 `task_id + recipient_user_id + message_type + business_cycle_key`。产生消息的任务动作、动作日志和投递 outbox 在同一事务提交；提交后才允许调用企业微信。成功、失败、重试和无效接收人均写入该行。重试重置为 `queued` 但不更换去重键，`attempt_count` 递增且每次结果追加进 `attempt_history`。

## 迁移与回滚

`up()` 按依赖顺序创建计划、计划项、任务、参与人、不可变动作/转移/代理、生成运行/条目与消息投递表，再创建约束、部分唯一索引和 worker 索引。迁移不回填、不修改或删除证书提醒、工作平台记录、主数据、文件或既有审计。

`down()` 只以相反依赖顺序删除 Wave 5 新增索引、约束和表；执行前须拒绝存在需要保留的 Wave 5 业务数据的生产回滚，并通过备份/只读窗口处理。PostgreSQL testcontainers 必须覆盖 migration up/down、唯一约束、并发生成、FK、软删除、转移轨迹和投递去重。
