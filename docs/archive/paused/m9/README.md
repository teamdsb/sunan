---
status: current-index
owner: planning
updated: 2026-07-12
replaces: []
replaced_by: []
---
# M9 暂停计划包

M9 于 2026-07-12 由用户决定暂停，尚未开始任何 Wave。本目录独立保存路线、执行计划、backlog 和 8 个 Wave 提示词，便于未来恢复；它不是当前执行入口。

## 内容

- `M8-M9-upgrade-roadmap.md`：M8 历史边界与 M9 总体能力路线。
- `M9-execplans.md`：8 个未开始 Wave 的执行计划。
- `M9-wave-backlog.md`：API/DB/state/UI/测试级工作清单。
- `prompts/`：各 Wave 暂停提示词。

## 恢复规则

1. 仅在用户明确要求恢复 M9 后启用。
2. 先复核 M8 当前生产基线、用户后续三端真机结果和未关闭缺陷。
3. 重新确认 M9 范围、优先级、外部依赖和上线窗口。
4. 将获批计划迁回 `docs/plans/` 并更新 `docs/execplans.md` 后，才可执行 Wave 1。
