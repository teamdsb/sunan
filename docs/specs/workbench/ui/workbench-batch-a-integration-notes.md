# 工作平台 Batch A 配套路由/状态/API 说明（M6）

## 1. 文档定位

本说明用于承接 Wave4 的“配套 route / state / API 更新说明”，明确 Batch A 在不新增后端边界的前提下如何接入已冻结的运行时契约。

## 2. 路由配套

Batch A 所有模块统一复用 Wave3 路由冻结结果：

- `/workbench/modules/:moduleCode`
- `/workbench/modules/:moduleCode/new`
- `/workbench/modules/:moduleCode/:recordId`

实现要求：

- 首页 `/workbench` 只承接入口与聚合，不承接 Batch A 录单详情逻辑。
- 模块列表页负责筛选、分页、快捷动作；录单与详情分别在 `new` 与 `:recordId` 路由承接。
- `business_operation_flow` 与两类工作组闭环模块必须保留独立入口卡片，避免“一个入口包所有闭环场景”。

## 3. 状态配套

Batch A 页面状态统一复用：

- `state/workbench-records.md`
- `state/workbench-approval-sync.md`

状态约束：

- 列表、详情、动作、附件、打印快照均由 `workbenchRecords` 状态切片管理。
- 审批模块（`goa_training` 岗前场景、`shipping_watch`）审批状态由审批镜像状态驱动，不允许页面本地伪造终态。
- 打印预览必须读取后端快照，归档记录默认展示最新快照版本。

## 4. API 配套

Batch A 接口统一复用：

- `api/workbench-platform-api.yaml`
- `api/workbench-approval-api.yaml`

接口使用约束：

- 模块元数据与共享字段：`GET /workbench/modules/{moduleCode}/schema`
- 列表与详情：`GET /workbench/records`、`GET /workbench/records/{recordId}`
- 创建与动作：`POST /workbench/records`、`POST /workbench/records/{recordId}/actions`
- 附件与打印：`POST /workbench/records/{recordId}/attachments`、`GET /workbench/records/{recordId}/print`
- 审批发起与同步：`POST /wecom/approval/launch`、`GET /wecom/approval/instances/*`

## 5. Batch A 审批模板映射

Wave4 冻结以下审批映射：

- `goa_training_onboarding_v1`：仅岗前培训场景
- `shipping_watch_v1`：值守记录系统

其余 Batch A 模块默认走系统内闭环，不发起企业微信审批。

## 6. 与 Wave5 边界

- 本文仅覆盖 Batch A 高频模块，不覆盖检查整改类与资产/统计/审批高风险模块。
- Wave5 将在本说明基础上扩展 Batch B 的状态与 API 细化，不回退 Wave4 冻结口径。
