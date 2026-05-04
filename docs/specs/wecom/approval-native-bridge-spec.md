# 企业微信原生审批桥接规格（M4 通用）

## 文档定位

本规格定义工作平台中“审批类业务”接入企业微信原生审批的通用桥接契约。

- M3 中本文件仅用于采购域的预留。
- 从 M4 起，本文件升级为工作平台通用审批桥规格。
- 采购域原有预留仍兼容，但后续审批桥设计以本文件为准。

## 适用范围

以下模板或模块在 M4 中可以使用企业微信原生审批作为业务真源：

- `wecom_approval`
- `attendance_statistics` 中需要审批的子流程
- `service_asset` 中需要审批的申请单
- `inspection_rectification` 中要求管理员审批关闭的场景

优先覆盖模块：

- 航次计划审批
- 燃油加注
- 船员考勤审批
- 船舶设施设备保养审批
- 密闭空间作业审批
- 海事安检整改关闭审批

## 真源规则

### 1. 单真源原则

- 审批类业务的最终审批结果以企业微信审批实例状态为真源。
- 系统内仅保存：
  - 业务上下文
  - 审批镜像状态
  - 同步日志
  - 展示与检索数据
- 系统不得在企业微信审批结论之外单独判定“已通过/已拒绝”。

### 2. 非审批类业务

- 非审批类业务仍使用系统内状态机。
- 如需消息提醒，可复用企业微信应用消息，但不复用审批真源。

## 核心对象

### WecomApprovalTemplateBinding

用于描述内部业务模板与企业微信审批模板的绑定关系：

- `moduleCode`
- `templateCode`
- `wecomTemplateId`
- `approvalScene`
- `visibleRoles`
- `enabled`
- `version`

### WecomApprovalInstanceSync

用于描述单个业务单据与审批实例的同步状态：

- `businessRecordId`
- `moduleCode`
- `approvalChannel` = `wecom_native`
- `processInstanceId`
- `wecomTemplateId`
- `externalStatus`
- `internalMirrorStatus`
- `startedBy`
- `startedAt`
- `lastCallbackAt`
- `lastReconciledAt`
- `callbackVersion`
- `syncError`

## 通用桥接接口

### 1. 发起审批

- `POST /api/v1/wecom/approval/launch`

请求体需包含：

- `moduleCode`
- `businessRecordId`
- `templateCode`
- `title`
- `applicantUserId`
- `summary`
- `payload`

响应体需返回：

- `processInstanceId`
- `launchStatus`
- `approvalChannel`
- `mirrorStatus`

### 2. 审批回调

- `POST /api/v1/wecom/approval/callback`

用途：

- 接收企业微信审批状态事件。
- 完成验签、幂等、状态映射和审计落库。
- 更新业务镜像状态和待办/消息联动。

### 3. 实例查询

- `GET /api/v1/wecom/approval/instances/:processInstanceId`

用途：

- 查询审批实例当前镜像状态。
- 供业务详情页、审批状态页和排障使用。

### 4. 状态对账

- `POST /api/v1/wecom/approval/reconcile`

用途：

- 对账未完成或回调缺失的审批实例。
- 对账属于系统维护能力，不对普通业务用户开放。

## 状态映射

### 外部状态

审批桥至少识别以下外部状态：

- `pending`
- `approved`
- `rejected`
- `canceled`
- `terminated`

### 内部镜像状态

系统内统一收敛为：

- `approval_pending`
- `approval_passed`
- `approval_rejected`
- `approval_canceled`
- `approval_terminated`
- `approval_sync_failed`

### 映射约束

- 外部状态变更必须可重放、可幂等。
- 同一 `processInstanceId` 的重复回调不得重复推进业务动作。
- 若外部实例结束，业务侧只允许进入终态，不允许回退到处理中。

## 业务与审批的关系

审批类业务记录至少要具备以下字段：

- `approval_channel`: `internal | wecom_native`
- `external_process_instance_id`: nullable
- `external_status`: nullable
- `external_synced_at`: nullable
- `approval_template_code`: nullable
- `approval_snapshot`: nullable json

工作平台中使用企业微信审批的业务，`approval_channel` 固定为 `wecom_native`。

## 幂等与审计

### 幂等要求

- 发起审批时，`businessRecordId + templateCode + version` 组合必须防止重复发起。
- 回调时，以 `processInstanceId + callbackVersion` 判重。
- 对账时，不得覆盖比当前更新版本更旧的回调数据。

### 审计字段

审批桥事件必须保留以下审计信息：

- `externalEventId`
- `syncDirection`（`push_to_wecom` / `callback_from_wecom` / `reconcile_from_wecom`）
- `operatorUserId`
- `rawPayloadDigest`
- `syncResult`
- `syncError`

## 消息联动

审批桥负责统一触发以下消息：

- 发起审批成功后的通知消息
- 审批待处理提醒
- 审批完成通知
- 回调失败/同步失败的管理员告警

消息通道复用 `docs/specs/wecom/message-push-spec.md` 中的应用消息能力。

## 与采购域的兼容说明

- 采购域 M3 已定义的 `approval_channel` 与外部流程字段保留不变。
- 若采购域未来切换到企业微信原生审批，可直接复用本规格的桥接接口、状态映射和审计要求。
