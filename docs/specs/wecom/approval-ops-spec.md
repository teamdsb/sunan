---
status: current-spec
owner: wecom
updated: 2026-05-04
replaces: []
replaced_by: []
---
# 工作平台企业微信审批运维规格（M5）

## 1. 文档定位

本规格定义工作平台企业微信审批桥在 M5 的运维与治理边界，重点覆盖回调验签/解密、幂等、重放保护、失败重试、告警、死信补偿和管理员诊断。

本文件承接 `docs/specs/wecom/approval-native-bridge-spec.md`，但关注点从“桥接契约”延伸到“可上线、可排障、可运维”。

## 2. 适用范围

适用于所有以企业微信审批为真源的工作平台模块，包括但不限于：

- 航次计划审批
- 船员考勤审批
- 船舶设施设备保养审批
- 密闭空间作业审批
- 海事安检整改关闭审批
- 车辆维修保养审批

## 3. 回调接入要求

### 3.1 验签与解密

- 审批回调必须按企业微信回调配置要求完成来源校验。
- 若启用加密回调，必须使用 `Token + EncodingAESKey` 完成验签和解密。
- 验签失败必须返回失败结果并写入安全日志，不得推进业务状态。

### 3.2 幂等要求

- 同一 `processInstanceId + callbackVersion` 只允许消费一次。
- 重复回调不得重复推进业务动作、不得重复发送完成消息。
- 对账结果不得覆盖比当前版本更旧的回调数据。

### 3.3 重放保护

- 对回调时间戳、随机串和版本号进行组合校验。
- 对疑似重放或乱序回调进行记录并写入运维日志。
- 若外部审批已终态，系统镜像状态不得回退到处理中。

## 4. 同步状态机

`approval_sync_status` 统一收敛为：

- `pending`
- `callback_received`
- `reconciled`
- `retrying`
- `failed`

状态定义：

- `pending`：已发起审批，等待回调。
- `callback_received`：已收到有效回调，等待进一步收口或派生动作完成。
- `reconciled`：通过主动查询或补偿任务完成状态校正。
- `retrying`：正在重试拉取、补偿或刷新镜像。
- `failed`：回调消费、状态映射、补偿或消息联动失败。

## 5. 失败治理

### 5.1 失败分类

建议至少区分以下错误码：

- `signature_invalid`
- `decrypt_failed`
- `callback_version_conflict`
- `instance_not_found`
- `status_mapping_failed`
- `message_push_failed`
- `wecom_api_timeout`
- `wecom_api_quota_exceeded`
- `record_sync_failed`

### 5.2 重试策略

- 网络超时、上游瞬时失败、消息推送失败可自动重试。
- 验签失败、解密失败、模板绑定缺失等配置问题不自动重试，直接告警。
- 自动重试需记录：重试次数、最近重试时间、最近错误码、最近错误摘要。
- 管理员可通过显式接口对单实例执行人工重试。

### 5.3 对账补偿

适用场景：

- 长时间未收到回调
- 回调消费失败
- 状态镜像与企业微信详情不一致
- 管理员主动发起诊断

补偿规则：

- 以企业微信审批申请详情为准修正镜像状态。
- 修正动作必须写入动作日志与同步审计。
- 补偿完成后将 `approval_sync_status` 置为 `reconciled` 或 `failed`。

## 6. 管理员诊断能力

M5 新增以下管理员能力：

- `GET /api/v1/wecom/approval/instances`
  - 分页检索异常、待回调、待对账审批实例
- `POST /api/v1/wecom/approval/retry`
  - 对指定实例触发重试或补偿
- `POST /api/v1/wecom/approval/reconcile`
  - 批量对账审批实例
- `GET /api/v1/wecom/approval/instances/:processInstanceId`
  - 查询单实例诊断详情

查询维度建议：

- `processInstanceId`
- `businessRecordId`
- `moduleCode`
- `approvalSyncStatus`
- `externalStatus`
- `dateFrom/dateTo`

## 7. 告警要求

至少定义以下告警：

- 审批回调验签失败
- 审批回调连续消费失败
- 待回调实例超时未更新
- 对账失败次数超阈值
- 审批完成后消息联动失败

告警输出至少包含：

- `processInstanceId`
- `businessRecordId`
- `moduleCode`
- `approvalSyncStatus`
- `syncErrorCode`
- `syncErrorMessage`
- 最近一次失败时间

## 8. 留痕要求

审批运维链路至少保留以下留痕：

- 原始回调摘要 `rawPayloadDigest`
- 同步方向 `syncDirection`
- 操作来源 `source`
- 操作人或任务名
- 状态变更前后值
- 最近一次重试与对账时间

## 9. 关联文档

- `docs/specs/wecom/approval-native-bridge-spec.md`
- `docs/specs/wecom/workbench-go-live-checklist.md`
- `docs/specs/wecom/real-device-regression-matrix.md`
- `docs/specs/workbench/api/workbench-approval-api.yaml`
- `docs/specs/workbench/db/workbench-runtime-schema.md`
