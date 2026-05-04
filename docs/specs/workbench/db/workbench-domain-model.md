---
status: current-spec
owner: workbench
updated: 2026-05-04
replaces: []
replaced_by: []
---
# 工作平台领域模型

## 1. 目标

本规格定义工作平台通用底座的数据对象、关系边界和状态机，为后续 API、前端状态和模块配置提供统一基础。

## 2. 核心实体

### WorkbenchModule

表示工作平台中的一个业务模块定义。

关键字段：

- `id`
- `moduleCode`
- `moduleName`
- `departmentCode`
- `templateType`
- `requiresApproval`
- `supportsPrint`
- `supportsStatistics`
- `mobileFirst`
- `sortOrder`
- `enabled`

### BusinessTemplate

表示通用业务模板或模块字段模板。

关键字段：

- `id`
- `templateCode`
- `templateType`
- `moduleCode`
- `name`
- `schemaVersion`
- `fieldSchema`（json）
- `stepSchema`（json）
- `printSchema`（json）
- `approvalTemplateCode`（nullable）
- `enabled`

### BusinessRecord

表示一张具体业务单据或记录。

关键字段：

- `id`
- `moduleCode`
- `templateCode`
- `recordNo`
- `status`
- `approvalChannel`
- `externalProcessInstanceId`（nullable）
- `externalStatus`（nullable）
- `title`
- `summary`
- `departmentCode`
- `vesselId`（nullable）
- `ownerUserId`
- `applicantUserId`
- `assigneeUserId`（nullable）
- `reviewerUserId`（nullable）
- `occurredAt`
- `submittedAt`（nullable）
- `closedAt`（nullable）
- `payload`（json）

### BusinessStep

表示多步骤流或检查项中的步骤明细。

关键字段：

- `id`
- `businessRecordId`
- `stepCode`
- `stepName`
- `stepType`
- `sequence`
- `status`
- `checkResult`
- `rectificationRequired`
- `rectificationStatus`
- `completedBy`
- `completedAt`
- `stepPayload`（json）

### BusinessAttachment

表示图片、文档、单证或打印导出文件。

关键字段：

- `id`
- `businessRecordId`
- `stepId`（nullable）
- `category`
- `fileId`
- `fileName`
- `mimeType`
- `storagePath`
- `uploadedBy`
- `uploadedAt`

### BusinessActionLog

表示业务动作审计记录。

关键字段：

- `id`
- `businessRecordId`
- `actionType`
- `source`
- `operatorUserId`
- `fromStatus`
- `toStatus`
- `comment`
- `payloadDigest`
- `createdAt`

### BusinessPrintSnapshot

表示打印快照，用于 A4/A3 归档追溯。

关键字段：

- `id`
- `businessRecordId`
- `templateVersion`
- `snapshotData`（json）
- `renderedFileId`
- `renderedAt`
- `renderedBy`

### WecomApprovalTemplateBinding

定义模块/模板与企业微信审批模板的映射。

### WecomApprovalInstanceSync

记录审批发起、回调、镜像状态与对账信息。

## 3. 模板与状态机

### `ledger_form`

建议状态：

- `draft`
- `submitted`
- `archived`

### `operation_flow`

建议状态：

- `draft`
- `in_progress`
- `completed`
- `archived`

### `inspection_rectification`

建议状态：

- `draft`
- `assigned`
- `checking`
- `pending_review`
- `rework_required`
- `closed`

### `attendance_statistics`

建议状态：

- `draft`
- `submitted`
- `approval_pending`
- `approval_passed`
- `approval_rejected`
- `settled`

### `service_asset`

建议状态：

- `draft`
- `submitted`
- `approval_pending`
- `approval_passed`
- `in_service`
- `closed`

### `wecom_approval`

建议状态：

- `draft`
- `approval_pending`
- `approval_passed`
- `approval_rejected`
- `approval_canceled`
- `archived`

## 4. 关系约束

- 一个 `WorkbenchModule` 可以绑定多个 `BusinessTemplate` 版本。
- 一个 `BusinessRecord` 只从属于一个 `moduleCode + templateCode`。
- 一个 `BusinessRecord` 可以有多个 `BusinessStep`、`BusinessAttachment`、`BusinessActionLog`、`BusinessPrintSnapshot`。
- 一个审批类 `BusinessRecord` 最多有一个活跃的 `WecomApprovalInstanceSync`。

## 5. 存储注意事项

- `payload`、`fieldSchema`、`stepSchema` 使用 JSON 列承接模块差异。
- 船舶相关模块必须能按 `vesselId` 检索。
- 统计类模块需保留原始记录与汇总记录之间的关联。
- 审批类模块需保留企业微信原始回调摘要，便于排障和对账。
