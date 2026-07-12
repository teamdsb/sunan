---
status: current-spec
owner: safety
updated: 2026-07-12
replaces: []
replaced_by: []
---
# Wave 6 检查、问题与 CAPA 数据库规格

## 通用规则

Wave 6 新表使用 UUID、`created_at`、`updated_at`、`deleted_at`、`created_by`、`updated_by` 与 PostgreSQL `TIMESTAMPTZ`；不可变审计、转单和验证记录不使用软删除。所有受控外键使用 `ON DELETE RESTRICT`，所有外键列建立索引。闭环对象不存入工作平台 `payload`，只保存可追溯来源关系。

## 模板、计划和检查

| 表 | 核心字段 | 约束与索引 |
|---|---|---|
| `inspection_templates` | `code`、`name`、`source_type`、`current_version_id` | `code` 活跃唯一；来源为 `regulation/company/vessel`；按来源与状态索引。 |
| `inspection_template_versions` | `template_id`、`version_no`、`status`、`import_source`、`published_at/by` | `(template_id,version_no)` 唯一；状态为 `draft/published/retired`；同模板至多一个 draft；已发布版本不可更新。 |
| `inspection_template_items` | `version_id`、`item_code`、`title`、`clause_ref`、`result_required`、`evidence_required_on_failure`、`sequence_no` | `(version_id,item_code)` 与 `(version_id,sequence_no)` 唯一；仅 draft 可增删改。 |
| `inspection_template_scopes` | `template_id`、`vessel_id`、`department_code` | 至少一个范围字段非空；按船舶/部门查询；活跃范围关系唯一。 |
| `inspection_plans` | `title`、`plan_id`、`plan_item_id`、`template_version_id` | `plan_id -> safety_plans`、`plan_item_id -> safety_plan_items`、`template_version_id -> inspection_template_versions`；`plan_item_id` 活跃唯一，避免一条任务生成两份检查。 |
| `inspections` | `task_id`、`inspection_plan_id`、`template_version_id`、`template_snapshot`、`status`、`summary_snapshot`、`completed_at` | `task_id` 活跃唯一；`task_id -> safety_tasks`；状态为 `pending/in_progress/submitted/completed/cancelled`；快照保存版本、项、适用范围与完成规则。 |
| `inspection_results` | `inspection_id`、`template_item_snapshot_key`、`inspector_user_id`、`conclusion`、`remark`、`status`、`signature_file_id`、`signed_at` | `(inspection_id,template_item_snapshot_key,inspector_user_id)` 活跃唯一；结论为 `conforming/nonconforming/not_applicable`，状态为 `draft/submitted`；按检查/检查人、失败项索引。 |
| `inspection_result_evidence` | `result_id`、`file_id`、`category` | `(result_id,file_id)` 唯一；`file_id -> files`；关联解除必须写审计且不得删除文件对象。 |

`template_snapshot` 在生成检查时一次写入，版本、项目、适用范围或人员主数据后续更新不得修改它。计划生成通过 Wave 5 任务生成键保持唯一；检查创建以 `task_id` 唯一约束为最终防线，并将快照创建记入生成 run metadata。

## 统一问题、转单与来源

| 表 | 核心字段 | 约束与索引 |
|---|---|---|
| `safety_issues` | `issue_no`、`title`、`issue_type`、`severity`、`status`、`vessel_id`、`responsibility_scope`、`responsible_user_id`、`due_at`、`idempotency_key`、`closed_at/by` | `issue_no` 与活跃 `idempotency_key` 唯一；类型为 `hazard/nonconformity/general/external`；等级为 `minor/major/critical`；状态为 `open/analyzing/action_in_progress/pending_verification/closed`；按状态/期限、船舶/等级、责任人/期限索引。 |
| `issue_sources` | `issue_id`、`source_type`、`source_id`、`source_item_key`、`source_snapshot` | `(issue_id,source_type,source_id,source_item_key)` 唯一；来源含 `inspection_result` 与 `workbench_record`；保存来源标题、模块和链接快照。 |
| `issue_transfer_jobs` | `dedupe_key`、`inspection_result_id`、`status`、`attempt_count`、`failure_code/message`、`issue_id` | `dedupe_key` 活跃唯一；状态为 `queued/running/succeeded/failed/skipped`；按 `(status,next_retry_at)` 供 worker 领取，按 `issue_id`/检查结果对账。 |

转单键固定为 SHA-256：`inspection_id + template_item_snapshot_key`。保存不符合结果、`issue_transfer_jobs` 和审计在同一事务；worker 在同一事务内锁定 job、按唯一键查找/创建问题并写 `issue_sources`。失败只更新 job 的尝试和诊断；reconcile 从失败或缺少 issue 的 job 补偿，不删除检查结果、来源或已存在问题。

工作平台来源只允许四个 `inspection_rectification` 模块：`goa_safety_hazard`、`shipping_self_inspection`、`shipping_vessel_inspection`、`shipping_maritime_safety_check`。建立来源关联前同时验证来源记录 ABAC 和创建者的船舶/部门范围；读取反向链接时也必须同时验证问题与原记录的读取权限。

## CAPA、证据与审计

| 表 | 核心字段 | 约束与索引 |
|---|---|---|
| `safety_capas` | `issue_id`、`status`、`verifier_user_id`、`effectiveness_required`、`closed_at/by` | `issue_id` 活跃唯一；状态为 `draft/in_progress/pending_verification/verified/closed`；验证人与动作责任人职责隔离。 |
| `capa_root_causes` | `capa_id`、`method`、`conclusion`、`analysis` | `capa_id` 活跃唯一；方法为 `five_whys/fishbone/category/other`。 |
| `capa_actions` | `capa_id`、`action_type`、`title`、`responsible_user_id`、`due_at`、`status`、`completion_statement`、`submitted_at` | 类型为 `corrective/preventive`；状态为 `draft/assigned/in_progress/submitted/returned/accepted/cancelled`；按责任人/状态/期限索引。 |
| `capa_action_evidence` | `capa_action_id`、`file_id`、`linked_by/at`、`status` | `(capa_action_id,file_id)` 活跃唯一；状态 `active/superseded/withdrawn`；替换或解除写原因与审计。 |
| `capa_verifications` | `capa_id`、`verifier_user_id`、`result`、`conclusion`、`effectiveness_evaluation`、`rework_reason` | 结果为 `passed/failed`；失败必须有返工原因；按 CAPA/创建时间索引，不可变。 |
| `inspection_capa_action_logs` | `object_type/id`、`action_type`、`request_id`、`operator_user_id`、`reason`、`before_snapshot`、`after_snapshot`、`metadata` | `(object_type,operator_user_id,request_id)` 部分唯一；追加式不可变日志，记录模板发布、签认、汇总、转单、措施、验证、返工和关闭。 |

关闭事务锁定 issue、CAPA、措施、证据和最近验证。它必须确认：CAPA 已 `verified`，根因存在，至少一个纠正措施和一个预防措施均 `accepted` 且各有 active 证据，最新验证为 `passed`，有效性评价已填写；`major/critical` 问题还要求 verifier/reviewer/system_admin 角色。任何前置缺失返回 422，状态不变。

## 迁移与回滚

`up()` 按模板、计划/检查、结果/证据、问题/来源/转单、CAPA/措施/验证/审计顺序创建表、外键、检查约束、部分唯一索引与 worker 索引。迁移不重写既有 `workbench_records`、`safety_tasks`、附件或文件数据；存量四类模块仅在用户操作或后续迁移 Wave 建立来源链接。

`down()` 以反向依赖顺序删除 Wave 6 索引、约束与表；生产回滚前拒绝存在需保留的检查、问题或 CAPA 数据。PostgreSQL testcontainers 必须覆盖 up/down、快照不可变、唯一转单键、并发转单、外键、来源双向链接、关闭门槛和验证返工。
