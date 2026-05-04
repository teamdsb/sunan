---
status: acceptance-archive
owner: archive
updated: 2026-05-04
replaces: []
replaced_by: []
---
# 工作平台 M4 Wave 8 验收归档

## 1. 验收结论

Wave 8（全平台联调、上线准备、里程碑收口）已完成。

完成日期：`2026-04-21`

## 2. 验收范围

- 跨模板联调：`ledger_form`、`operation_flow`、`inspection_rectification`、`attendance_statistics`、`service_asset`、`wecom_approval`
- 平台统一能力：模块权限可见性、记录流转、附件、打印、统计、审批桥
- 企业微信上线准备：回调、消息、JS-SDK、可见范围、真机回归项清单
- 里程碑收口：M4 验收结论与 M5 优化项沉淀

## 3. 验收清单

| 验收项 | 结论 | 证据 |
|---|---|---|
| 六类业务模板均已接入并可在工作平台统一访问 | 通过 | `apps/api/src/modules/workbench/workbench.service.ts` |
| 工作平台统一能力（记录/动作/附件/打印/统计）可用 | 通过 | `apps/api/src/modules/workbench/workbench.controller.ts` |
| 企业微信审批桥发起/回调/查询/对账链路可用 | 通过 | `apps/api/src/modules/workbench/workbench-approval.controller.ts` |
| 前端工作平台覆盖全模板录单与关键动作 | 通过 | `apps/web/src/features/workbench/WorkbenchHomePage.tsx` |
| 企业微信上线检查清单已冻结并与官方依据对齐 | 通过 | `docs/specs/wecom/workbench-go-live-checklist.md` |
| M4 执行计划已完成全 8 个 wave 勾选 | 通过 | `docs/execplans.md` |
| M5 优化项已沉淀 | 通过 | `docs/archive/backlogs/workbench/m5-optimization-backlog.md` |

## 4. 联调说明

- 已完成后端路由与前端工作平台页面的集成联调，覆盖：
  - 模块入口与权限可见性
  - 记录创建与状态推进
  - 附件与打印快照接口
  - 考勤统计看板与审批发起
- 已完成构建级验证：
  - `pnpm --filter api build`
  - `pnpm --filter web build`

## 5. 上线说明

- 企业微信专项上线前检查采用：`docs/specs/wecom/workbench-go-live-checklist.md`。
- 当前仓库侧已完成上线资料与链路准备；企业微信容器真机回归（iOS/Android）需按清单在目标环境执行并留痕。

## 6. 里程碑结论

- M4 目标“工作平台全量业务实现（企业微信审批为主）”已在文档、接口、页面与执行计划层面完成收口。
- M5 将转入“稳定性、性能、可观测、自动化回归与上线效率优化”。
