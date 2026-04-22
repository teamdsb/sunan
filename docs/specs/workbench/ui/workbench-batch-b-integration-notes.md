# 工作平台 Batch B 配套路由/状态/API 说明（M6）

## 1. 文档定位

本说明用于承接 Wave5 的 Batch B 冻结，明确检查整改类与统计/审批/资产服务类模块如何复用既有路由、状态与 API，并与管理员台任务体系衔接。

## 2. 路由配套

Batch B 模块统一复用：

- `/workbench/modules/:moduleCode`
- `/workbench/modules/:moduleCode/new`
- `/workbench/modules/:moduleCode/:recordId`

补充要求：

- 检查整改类模块必须在详情页提供整改前后照片对比与闭环状态视图。
- 统计/审批模块必须在详情页提供审批镜像或导出/对账入口，不允许隐藏到首页聚合层。

## 3. 状态配套

Batch B 前端状态复用：

- `state/workbench-records.md`
- `state/workbench-approval-sync.md`
- `state/workbench-admin-console.md`

关键约束：

- 检查整改模块步骤状态与照片附件状态统一由 `workbenchRecords` 承载。
- 审批类模块状态真源为 `approvalSyncStatus + externalStatus`，不得使用本地状态短路。
- 导出任务、对账任务、诊断事件在管理员视图中保持独立分页与筛选，不与业务列表混合。

## 4. API 配套

Batch B 复用接口：

- 平台运行时：`api/workbench-platform-api.yaml`
- 审批桥：`api/workbench-approval-api.yaml`
- 管理员任务：`api/workbench-admin-api.yaml`

执行要求：

- 业务页面通过 `records` 与 `actions` 接口完成录单、流转、归档。
- 审批模块通过审批桥接口发起与回写。
- 导出/对账/诊断统一由管理员 API 检索，不在业务接口重复造同类查询。

## 5. Batch B 与管理员台联动

Batch B 必须可被管理员台直接检索与排障：

- 审批实例检索维度：`moduleCode`、`syncErrorCode`、`source`、`dateFrom/dateTo`
- 导出任务检索维度：`moduleCode`、`status`、`dateFrom/dateTo`
- 对账任务检索维度：`compareSource`、`departmentCode`、`status`
- 诊断事件检索维度：`eventType`、`moduleCode`、`errorCode`、`status`

## 6. Batch B 审批模板映射

Wave5 冻结以下审批模板映射（含 Batch B 相关模块）：

- `shipping_vessel_inspection_v1`
- `shipping_confined_space_v1`
- `shipping_oily_water_operation_v1`
- `shipping_maritime_safety_check_v1`
- `shipping_attendance_v1`
- `shipping_voyage_approval_v1`
- `shipping_fuel_bunkering_v1`
- `logistics_vehicle_maintenance_v1`

其余 Batch B 模块默认系统内闭环。

## 7. 与 Wave6 边界

- 本文不覆盖 `finance_board` 与 `shipping_chart_update` 的专属 SDD 扩展。
- Wave6 在本说明基础上处理遗留模块收口，不回退 Wave5 已冻结的 Batch B 口径。
