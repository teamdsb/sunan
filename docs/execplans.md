---
status: current-index
owner: docs
updated: 2026-07-10
replaces: []
replaced_by: []
---
# 执行计划入口

> 状态：当前执行计划入口。M7 上线体验与导航修复已于 2026-07-10 验收完成并归档；M8 为当前可启动的升级里程碑，M9 仍以后者总体验收为前置。

## 当前计划

| 顺序 | 里程碑 | 需求 | 执行计划 | Backlog | 提示词 |
|---|---|---|---|---|---|
| 1 | M8 安全管理底座与核心闭环 | [requirements/M8-安全管理底座与核心闭环.md](requirements/M8-安全管理底座与核心闭环.md) | [plans/M8-execplans.md](plans/M8-execplans.md) | [plans/M8-wave-backlog.md](plans/M8-wave-backlog.md) | [prompts/README.md](prompts/README.md) |
| 2 | M9 专业安全业务深化与体系完善 | [requirements/M9-专业安全业务深化与体系完善.md](requirements/M9-专业安全业务深化与体系完善.md) | [plans/M9-execplans.md](plans/M9-execplans.md) | [plans/M9-wave-backlog.md](plans/M9-wave-backlog.md) | [prompts/README.md](prompts/README.md) |

M8/M9 总体边界和依赖见 [plans/M8-M9-upgrade-roadmap.md](plans/M8-M9-upgrade-roadmap.md)；M7 最终验收见 [archive/acceptance/common/acceptance-m7-wave6.md](archive/acceptance/common/acceptance-m7-wave6.md)。

## 当前状态

- M7：已完成并归档；计划、backlog 和提示词见 `docs/archive/`，最终验收见 `docs/archive/acceptance/common/acceptance-m7-wave6.md`。
- M8：规划已建立，可从 Wave 1 启动；Wave 3 已登记采购执行清单附件受审计解除关联修复。
- M9：规划已建立，仍等待 M8 总体验收；Wave 1 必须回归采购附件解除关联。
- 外部海事监管、AIS、CCTV 等系统集成不在 M8/M9 范围。

## 归档位置

- M6 完成快照：`docs/archive/execplans/execplans-m6-completed-snapshot.md`
- M1-M6 历史计划：`docs/archive/execplans/`
- M7 历史计划：`docs/archive/execplans/M7-execplans.md`
- M7 历史 backlog：`docs/archive/backlogs/common/M7-wave-backlog.md`
- M7 历史提示词：`docs/archive/prompts/m7/`

## 使用规则

- 从 M8 Wave 1 开始按顺序实施，不得跳过前置验收。
- 每个 Wave 使用 `docs/plans/wave-acceptance-template.md` 建立独立验收记录。
- 每个 Wave 的 Agent 输入使用 `docs/prompts/` 下对应提示词。
- 新需求不要直接修改 M1-M6 历史执行计划。
- M9 不得在 M8 总体验收通过前启动业务实现。
- M8/M9 完成后将执行计划、backlog、提示词和验收材料迁入 `docs/archive/`。
