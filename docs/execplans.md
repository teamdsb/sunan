---
status: current-index
owner: docs
updated: 2026-07-04
replaces: []
replaced_by: []
---
# 执行计划入口

> 状态：当前执行计划入口。2026-07-04 起，M1-M6 上线体验与导航修复正式作为新 M7；原 M7/M8 整体后移为 M8/M9。

## 当前计划

| 顺序 | 里程碑 | 需求 | 执行计划 | Backlog | 提示词 |
|---|---|---|---|---|---|
| 1 | M7 上线体验与导航修复 | [requirements/M7-上线体验与导航修复.md](requirements/M7-上线体验与导航修复.md) | [plans/M7-execplans.md](plans/M7-execplans.md) | [plans/M7-wave-backlog.md](plans/M7-wave-backlog.md) | [prompts/README.md](prompts/README.md) |
| 2 | M8 安全管理底座与核心闭环（后移） | [requirements/M8-安全管理底座与核心闭环.md](requirements/M8-安全管理底座与核心闭环.md) | [plans/M8-execplans.md](plans/M8-execplans.md) | [plans/M8-wave-backlog.md](plans/M8-wave-backlog.md) | [prompts/README.md](prompts/README.md) |
| 3 | M9 专业安全业务深化与体系完善（后移） | [requirements/M9-专业安全业务深化与体系完善.md](requirements/M9-专业安全业务深化与体系完善.md) | [plans/M9-execplans.md](plans/M9-execplans.md) | [plans/M9-wave-backlog.md](plans/M9-wave-backlog.md) | [prompts/README.md](prompts/README.md) |

M8/M9 总体边界和依赖见 [plans/M8-M9-upgrade-roadmap.md](plans/M8-M9-upgrade-roadmap.md)，但不得在 M7 Wave 6 验收通过前启动。

## 当前状态

- M7：当前待实施，Wave 1-6 对应上传、我的、办事、采购、工作台、企业微信直达和最终收口。
- M8：由原 M7 后移而来，规划已建立；等待 M7 总体验收后重新排期。
- M9：由原 M8 后移而来，规划已建立；等待 M8 总体验收。
- 外部海事监管、AIS、CCTV 等系统集成不在 M8/M9 范围。

## 归档位置

- M6 完成快照：`docs/archive/execplans/execplans-m6-completed-snapshot.md`
- M1-M6 历史计划：`docs/archive/execplans/`

## 使用规则

- 从 M7 Wave 1 开始按顺序实施，不得跳过前置验收。
- 每个 Wave 使用 `docs/plans/wave-acceptance-template.md` 建立独立验收记录。
- 每个 Wave 的 Agent 输入使用 `docs/prompts/` 下对应提示词。
- 新需求不要直接修改 M1-M6 历史执行计划。
- M7 未验收前，不得启动 M8/M9 业务实现。
- M8/M9 完成后将执行计划和验收材料迁入 `docs/archive/`。
