---
status: current-spec
owner: workbench
updated: 2026-05-04
replaces: []
replaced_by: []
---
# 工作平台运行时存储规格（M5）

## 1. 目标

本规格将 M4 的概念模型落实为 M5 的真实运行时存储边界，用于指导后续 TypeORM 实体、数据库迁移、索引设计、查询约束和集成测试。

本文件关注“运行时持久化”，不替代 `workbench-domain-model.md` 的概念说明。

## 2. 设计原则

- 工作平台运行时对象必须落地 PostgreSQL，不允许继续依赖内存 `Map` 作为真实状态来源。
- 审批类业务保持企业微信单真源，系统仅保留镜像、同步审计和业务上下文。
- 模块差异优先通过 JSON 列与模板绑定承接，避免为每个模块拆散私有表。
- 索引设计优先服务于列表查询、船舶检索、审批诊断、导出对账和打印归档。

## 3. 核心表

### 3.1 `workbench_modules`

用途：保存工作平台模块定义与启停状态。

关键字段：

- `id`：UUID，主键
- `module_code`：唯一编码
- `module_name`
- `department_code`
- `template_type`：`ledger_form | operation_flow | inspection_rectification | attendance_statistics | service_asset | wecom_approval`
- `requires_approval`
- `supports_print`
- `supports_statistics`
- `mobile_first`
- `sort_order`
- `enabled`
- `created_at`
- `updated_at`

索引建议：

- `uk_workbench_modules_module_code`
- `idx_workbench_modules_department_sort`

### 3.2 `workbench_templates`

用途：保存模块绑定的模板版本与字段/步骤 schema。

关键字段：

- `id`：UUID，主键
- `module_code`
- `template_code`
- `template_type`
- `schema_version`
- `field_schema`：JSONB
- `step_schema`：JSONB，可空
- `print_schema`：JSONB，可空
- `approval_template_code`：可空
- `enabled`
- `created_at`
- `updated_at`

索引建议：

- `uk_workbench_templates_template_code_version`
- `idx_workbench_templates_module_code_enabled`

### 3.3 `workbench_records`

用途：保存所有工作平台业务记录主表。

关键字段：

- `id`：UUID，主键
- `module_code`
- `template_code`
- `record_no`
- `record_source`：`manual | callback | reconcile`
- `status`
- `approval_channel`：`internal | wecom_native`
- `external_process_instance_id`：可空
- `external_status`：可空
- `title`
- `summary`
- `department_code`
- `vessel_id`：可空
- `owner_user_id`
- `applicant_user_id`
- `assignee_user_id`：可空
- `reviewer_user_id`：可空
- `occurred_at`
- `submitted_at`：可空
- `closed_at`：可空
- `payload`：JSONB
- `created_at`
- `updated_at`
- `deleted_at`：软删除，可空

索引建议：

- `uk_workbench_records_record_no`
- `idx_workbench_records_module_status_occurred_at`
- `idx_workbench_records_vessel_occurred_at`
- `idx_workbench_records_external_process_instance_id`
- `idx_workbench_records_owner_user_id`

### 3.4 `workbench_record_steps`

用途：保存多步骤业务或检查整改步骤明细。

关键字段：

- `id`：UUID，主键
- `business_record_id`
- `step_code`
- `step_name`
- `step_type`
- `sequence_no`
- `status`：`pending | in_progress | completed | skipped`
- `check_result`：可空
- `rectification_required`
- `rectification_status`：可空
- `completed_by`：可空
- `completed_at`：可空
- `step_payload`：JSONB
- `created_at`
- `updated_at`

索引建议：

- `uk_workbench_record_steps_record_step_code`
- `idx_workbench_record_steps_record_sequence`
- `idx_workbench_record_steps_status`

### 3.5 `workbench_record_attachments`

用途：保存业务附件、整改照片、会议照片、导出文件与打印文件。

关键字段：

- `id`：UUID，主键
- `business_record_id`
- `step_id`：可空
- `category`
- `file_id`
- `file_name`
- `mime_type`
- `storage_path`
- `uploaded_by`
- `uploaded_at`
- `remark`：可空
- `created_at`

索引建议：

- `idx_workbench_record_attachments_record_category`
- `idx_workbench_record_attachments_step_id`

分类约束建议：

- `before_rectification`
- `after_rectification`
- `meeting_photo`
- `evidence`
- `document`
- `print_export`
- `export_file`

### 3.6 `workbench_record_action_logs`

用途：保存业务动作审计和系统补偿动作。

关键字段：

- `id`：UUID，主键
- `business_record_id`
- `action_type`
- `source`：`manual | callback | reconcile | system`
- `operator_user_id`：可空
- `from_status`：可空
- `to_status`：可空
- `comment`：可空
- `payload_digest`：可空
- `created_at`

索引建议：

- `idx_workbench_record_action_logs_record_created_at`
- `idx_workbench_record_action_logs_action_type`
- `idx_workbench_record_action_logs_source`

### 3.7 `workbench_print_snapshots`

用途：保存打印快照和渲染结果文件，用于 A4/A3 归档与追溯。

关键字段：

- `id`：UUID，主键
- `business_record_id`
- `template_version`
- `snapshot_data`：JSONB
- `rendered_file_id`：可空
- `rendered_format`：`pdf | html_snapshot`
- `rendered_at`
- `rendered_by`
- `created_at`

索引建议：

- `idx_workbench_print_snapshots_record_rendered_at`

### 3.8 `wecom_approval_template_bindings`

用途：保存模块/模板与企业微信审批模板的绑定关系。

关键字段：

- `id`：UUID，主键
- `module_code`
- `template_code`
- `wecom_template_id`
- `approval_scene`
- `version`
- `visible_roles`：JSONB
- `enabled`
- `created_at`
- `updated_at`

索引建议：

- `uk_wecom_approval_template_bindings_scene_version`
- `idx_wecom_approval_template_bindings_module_template`

### 3.9 `wecom_approval_instance_syncs`

用途：保存审批发起、回调、镜像状态、重试与对账信息。

关键字段：

- `id`：UUID，主键
- `business_record_id`
- `module_code`
- `approval_channel`：固定 `wecom_native`
- `process_instance_id`
- `wecom_template_id`
- `external_status`
- `internal_mirror_status`
- `approval_sync_status`：`pending | callback_received | reconciled | retrying | failed`
- `started_by`
- `started_at`
- `last_callback_at`：可空
- `last_reconciled_at`：可空
- `callback_version`
- `retry_count`
- `last_retry_at`：可空
- `sync_error_code`：可空
- `sync_error_message`：可空
- `raw_payload_digest`：可空
- `created_at`
- `updated_at`

索引建议：

- `uk_wecom_approval_instance_syncs_process_instance_id`
- `idx_wecom_approval_instance_syncs_business_record_id`
- `idx_wecom_approval_instance_syncs_sync_status`
- `idx_wecom_approval_instance_syncs_external_status`
- `idx_wecom_approval_instance_syncs_last_reconciled_at`

## 4. 状态字段约束

### 4.1 `workbench_records.status`

按模板类型收敛到以下状态集合：

- `ledger_form`：`draft | submitted | archived`
- `operation_flow`：`draft | in_progress | completed | archived`
- `inspection_rectification`：`draft | assigned | checking | pending_review | rework_required | closed`
- `attendance_statistics`：`draft | submitted | approval_pending | approval_passed | approval_rejected | settled`
- `service_asset`：`draft | submitted | approval_pending | approval_passed | in_service | closed`
- `wecom_approval`：`draft | approval_pending | approval_passed | approval_rejected | approval_canceled | archived`

### 4.2 `wecom_approval_instance_syncs.internal_mirror_status`

- `approval_pending`
- `approval_passed`
- `approval_rejected`
- `approval_canceled`
- `approval_terminated`
- `approval_sync_failed`

## 5. 关系约束

- 一个 `workbench_record` 可关联多个 `workbench_record_steps`、`workbench_record_attachments`、`workbench_record_action_logs`、`workbench_print_snapshots`。
- 一个审批类 `workbench_record` 最多有一个活跃的 `wecom_approval_instance_syncs`。
- `step_id` 只能引用同一 `business_record_id` 下的步骤。
- `external_process_instance_id` 与 `process_instance_id` 必须一一对应。

## 6. 查询与留存要求

- 默认查询支持近 3 年数据。
- 船舶相关模块必须支持按 `vessel_id` 快速检索。
- 审批运维页面必须支持按 `process_instance_id`、`business_record_id`、`approval_sync_status`、`external_status` 检索。
- 打印快照和导出文件必须与业务记录长期关联，便于审计和归档。

## 7. 实现注意事项

- 所有表使用 UUID 主键、审计字段和软删除约定。
- JSONB 字段的键命名需与 OpenAPI 和前端状态规格保持一致。
- 运行时实体落地后，应以集成测试验证查询、动作、审批同步和打印快照链路。
- 本规格冻结的是表级边界；字段最终命名需与 migration 和 TypeORM 实体保持一一对应。
