# 企业微信原生审批预留接入规格（M3 预留）

## 文档定位

本规格用于定义采购模块未来接入企业微信原生审批流的桥接契约。

M3 只做预留，不对接真实审批 API，不启用审批回调地址。

## 当前策略

- `PROCUREMENT_APPROVAL_BACKEND=internal`（固定）
- 生产环境不暴露原生审批桥接路由
- 数据层预留外部流程字段，不参与本期状态判断

## 预留字段（已在业务规格中定义）

- `approval_channel`: `internal | wecom_native`
- `external_process_instance_id`: nullable
- `external_status`: nullable
- `external_synced_at`: nullable
- 审批记录 `source`: `internal | external`

## 未来桥接接口（契约占位）

> 本节仅为未来扩展约定；M3 不实现、不上线。

### 1. 发起外部审批

- `POST /api/v1/integrations/wecom/approvals/start`
- 用途：将内部单据推送为企业微信审批实例
- M3 约定响应：`501 Not Implemented`

### 2. 接收审批回调

- `POST /api/v1/integrations/wecom/approvals/callback`
- 用途：接收外部流程状态事件
- M3 约定响应：`501 Not Implemented`

### 3. 状态对账

- `POST /api/v1/integrations/wecom/approvals/reconcile`
- 用途：定时拉取/比对外部流程状态
- M3 约定响应：`501 Not Implemented`

## 状态映射原则（未来实现时生效）

- 外部状态不直接覆盖业务状态。
- 由映射层转换：`external_status -> internal_status`。
- 内部状态机仍保持：
  - 采购单：`draft -> submitted -> dept_approved -> final_approved | rejected`
  - 报表审批单：`draft -> submitted -> dept_approved -> finance_approved -> final_approved | rejected`

## 审计约定

- 审批同步事件写审计快照字段：
  - `externalEventId`
  - `syncDirection`（`push_to_wecom`/`pull_from_wecom`）
- M3 本期允许为空。

## 验收基线（M3）

1. 外部字段为空时，查询、分页、统计、导出无行为变化。
2. `approval_channel=internal` 全流程正常。
3. 未来桥接接口文档存在且返回语义统一为 `501 Not Implemented`。
