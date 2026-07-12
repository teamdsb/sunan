---
status: current-index
owner: docs
updated: 2026-07-12
replaces: []
replaced_by: []
---
# 执行计划入口

> 当前没有正在执行的升级里程碑。M8 已于 2026-07-12 验收归档；M9 已由用户暂停并独立封存，不自动启动。

## 当前计划

无。恢复 M9 或建立新里程碑前，应先取得用户明确指令并建立新的当前执行入口。

## 已完成与暂停

| 里程碑 | 状态 | 入口 |
|---|---|---|
| M8 安全管理底座与核心闭环 | 已完成、已归档 | [总验收](archive/acceptance/safety/acceptance-m8-overall.md)、[最终功能核查](archive/audits/M8-最终功能实现核查.md)、[历史计划](archive/execplans/M8-execplans.md) |
| M9 专业安全业务深化与体系完善 | 暂停、未开始 | [暂停计划](archive/paused/m9/M9-execplans.md)、[暂停 backlog](archive/paused/m9/M9-wave-backlog.md)、[暂停路线](archive/paused/m9/M8-M9-upgrade-roadmap.md) |

## 当前状态

- M7：已完成并归档，最终验收见 `docs/archive/acceptance/common/acceptance-m7-wave6.md`。
- M8：Wave 1-7 通过并归档；三端真机、生产存量和生产恢复未在归档任务执行，实际状态已在验收中披露。
- M9：用户主动暂停；需求和计划保留为 `conditional-baseline`，未实现任何 M9 Wave。
- 外部海事监管、AIS、CCTV 等系统集成不在 M8/M9 范围。

## 归档位置

- M1-M8 历史计划：`docs/archive/execplans/`
- M8 历史 backlog：`docs/archive/backlogs/safety/M8-wave-backlog.md`
- M8 历史提示词：`docs/archive/prompts/m8/`
- M8 验收：`docs/archive/acceptance/safety/`
- M9 暂停包：`docs/archive/paused/m9/`

## 使用规则

- 每个新 Wave 使用 `docs/plans/wave-acceptance-template.md` 建立独立验收记录。
- 新需求不要直接修改 M1-M8 历史执行计划。
- M9 暂停包只能在用户明确恢复后迁回当前计划；恢复时先重做基线与范围评审。
