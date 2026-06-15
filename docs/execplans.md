---
status: current-index
owner: docs
updated: 2026-06-13
replaces: []
replaced_by: []
---
# 执行计划入口

> 状态：当前执行计划入口。M7 为当前待实施里程碑，M8 仅在 M7 总体验收通过后启动。

## 当前计划

| 顺序 | 里程碑 | 需求 | 执行计划 | Backlog | 提示词 |
|---|---|---|---|---|---|
| 1 | M7 安全管理底座与核心闭环 | [requirements/M7-安全管理底座与核心闭环.md](requirements/M7-安全管理底座与核心闭环.md) | [plans/M7-execplans.md](plans/M7-execplans.md) | [plans/M7-wave-backlog.md](plans/M7-wave-backlog.md) | [prompts/README.md](prompts/README.md) |
| 2 | M8 专业安全业务深化与体系完善 | [requirements/M8-专业安全业务深化与体系完善.md](requirements/M8-专业安全业务深化与体系完善.md) | [plans/M8-execplans.md](plans/M8-execplans.md) | [plans/M8-wave-backlog.md](plans/M8-wave-backlog.md) | [prompts/README.md](prompts/README.md) |

总体边界和依赖见 [plans/M7-M8-upgrade-roadmap.md](plans/M7-M8-upgrade-roadmap.md)。

## 当前状态

- M7：规划已建立，Wave 1-7 均待实施。
- M8：规划已建立，等待 M7 总体验收。
- 外部海事监管、AIS、CCTV 等系统集成不在 M7/M8 范围。

## 归档位置

- M6 完成快照：`docs/archive/execplans/execplans-m6-completed-snapshot.md`
- M1-M6 历史计划：`docs/archive/execplans/`

## 使用规则

- 从 M7 Wave 1 开始按顺序实施，不得跳过前置验收。
- 每个 Wave 使用 `docs/plans/wave-acceptance-template.md` 建立独立验收记录。
- 每个 Wave 的 Agent 输入使用 `docs/prompts/` 下对应提示词。
- 新需求不要直接修改 M1-M6 历史执行计划。
- M7/M8 完成后将执行计划和验收材料迁入 `docs/archive/`。
