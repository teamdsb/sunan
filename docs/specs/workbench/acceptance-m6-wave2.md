# M6 Wave 2 验收清单

- 工作平台模块矩阵已从聚合模块拆分为 M6 约定的新模块编码。
- `business_operation_flow` 不再作为默认新建入口，仅保留历史兼容与只读回看口径。
- 前端已提供 `/workbench`、`/workbench/modules/:moduleCode`、`/workbench/records/:recordId`、`/workbench/statistics/attendance`、`/workbench/approvals` 五类入口。
- `shipping_chart_update` 已作为真实模块存在于代码与路由中。
- 历史数据迁移策略已形成：可识别记录迁移，不可识别记录标记 `legacy=true`。
- `finance_business_board` 仍受 blocker 文档约束，补料前不得新增 API/DB/UI 实现。
