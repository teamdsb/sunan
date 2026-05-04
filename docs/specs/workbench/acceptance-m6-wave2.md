# M6 Wave 2 验收清单

## 验收结论

- 状态：`通过`
- 验收日期：`2026-04-22`
- 对应任务：`WS-2A`、`WS-2B`、`WS-2C`

- 工作平台模块矩阵已从聚合模块拆分为 M6 约定的新模块编码。
- `business_operation_flow` 不再作为默认新建入口，仅保留历史兼容与只读回看口径。
- 前端已提供 `/workbench`、`/workbench/modules/:moduleCode`、`/workbench/records/:recordId`、`/workbench/statistics/attendance`、`/workbench/approvals` 五类入口。
- `shipping_chart_update` 已作为真实模块存在于代码与路由中。
- 历史数据迁移策略已形成：可识别记录迁移，不可识别记录标记 `legacy=true`。
- `finance_business_board` 仍受 blocker 文档约束，补料前不得新增 API/DB/UI 实现。

## 证据索引

- `WS-2A`
- [workbench.service.ts](/Users/yuan/项目/sunan/sunan/apps/api/src/modules/workbench/workbench.service.ts)
- [1710000013000-wave6-workbench-module-split.ts](/Users/yuan/项目/sunan/sunan/apps/api/src/database/migrations/1710000013000-wave6-workbench-module-split.ts)
- `WS-2B`
- [workbenchRouteConfig.ts](/Users/yuan/项目/sunan/sunan/apps/web/src/router/workbenchRouteConfig.ts)
- [AppRoutes.tsx](/Users/yuan/项目/sunan/sunan/apps/web/src/router/AppRoutes.tsx)
- [WorkbenchHomeRoutePage.tsx](/Users/yuan/项目/sunan/sunan/apps/web/src/features/workbench/WorkbenchHomeRoutePage.tsx)
- [WorkbenchModulePage.tsx](/Users/yuan/项目/sunan/sunan/apps/web/src/features/workbench/WorkbenchModulePage.tsx)
- [WorkbenchRecordDetailPage.tsx](/Users/yuan/项目/sunan/sunan/apps/web/src/features/workbench/WorkbenchRecordDetailPage.tsx)
- [WorkbenchAttendancePage.tsx](/Users/yuan/项目/sunan/sunan/apps/web/src/features/workbench/WorkbenchAttendancePage.tsx)
- [WorkbenchApprovalPage.tsx](/Users/yuan/项目/sunan/sunan/apps/web/src/features/workbench/WorkbenchApprovalPage.tsx)
- `WS-2C`
- [workbench.service.ts](/Users/yuan/项目/sunan/sunan/apps/api/src/modules/workbench/workbench.service.ts)
- [finance-business-board-blocker.md](/Users/yuan/项目/sunan/sunan/docs/specs/workbench/finance-business-board-blocker.md)
