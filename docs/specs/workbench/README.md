---
status: current-index
owner: workbench
updated: 2026-09-07
replaces: []
replaced_by: []
---
# 工作平台入口

工作平台覆盖各部门业务入口，实际完成范围见[原件核查与实施补充](../../audits/2026-09-07-original-goal-audit.md)。历史里程碑的“已完成”不代表原始目标全部兑现；M9 继续暂停。

| 需要了解的内容 | 入口 |
|---|---|
| 模块注册、通用业务与权限 | [workbench.service.ts](../../../apps/api/src/modules/workbench/workbench.service.ts) |
| 船舶自查下发、证据与审核 | [self-inspection.service.ts](../../../apps/api/src/modules/workbench/self-inspection.service.ts) |
| 页面与操作 | [WorkbenchHomePage.tsx](../../../apps/web/src/features/workbench/WorkbenchHomePage.tsx)、[SelfInspectionPanel.tsx](../../../apps/web/src/features/workbench/SelfInspectionPanel.tsx) |
| 接口契约 | [平台 API](api/workbench-platform-api.yaml)、[审批 API](api/workbench-approval-api.yaml) |
| 数据结构与变更 | `apps/api/src/database/entities/`、`apps/api/src/database/migrations/` |
| 关键回归 | `apps/api/test/self-inspection.integration.spec.ts`、`apps/api/test/workbench.integration.spec.ts` |
| 企业微信配置与审批桥 | [企业微信入口](../wecom/README.md) |
| 安全领域与计划状态 | [安全领域](../safety/README.md)、[里程碑状态](../../execplans.md) |

旧运行时 DB、记录 State 和模板 UI 说明已在原路径封存，不再逐层同步。其他旧设计及财务自生成样表仅在对应问题需要时参考；正式业务材料优先于这些历史设计。完整清单见 [inventory](../../inventory.md)。
