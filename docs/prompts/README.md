---
status: current-index
owner: delivery
updated: 2026-07-12
replaces: []
replaced_by: []
---
# Wave 提示词索引

> 当前没有可执行的升级 Wave 提示词。M8 已完成归档；M9 已暂停，提示词只作为可恢复基线保存。

## 使用方法

1. 历史提示词只用于追溯，不可直接当作新的执行授权。
2. 恢复 M9 时先将暂停计划重新评审并迁回当前计划入口。
3. 每个 Wave 完成后使用 `docs/plans/wave-acceptance-template.md` 形成验收记录。
4. 未取得命令输出和证据前，不得勾选执行计划。

## 已归档：M8

| Wave | 提示词 |
|---|---|
| 1 | `docs/archive/prompts/m8/wave-1-spec-baseline.md` |
| 2 | `docs/archive/prompts/m8/wave-2-permission-workflow.md` |
| 3 | `docs/archive/prompts/m8/wave-3-evidence-export.md` |
| 4 | `docs/archive/prompts/m8/wave-4-master-data.md` |
| 5 | `docs/archive/prompts/m8/wave-5-plan-task.md` |
| 6 | `docs/archive/prompts/m8/wave-6-inspection-capa.md` |
| 7 | `docs/archive/prompts/m8/wave-7-release-acceptance.md` |

## 已暂停：M9

| Wave | 提示词 |
|---|---|
| 1 | `docs/archive/paused/m9/prompts/wave-1-baseline-specs.md` |
| 2 | `docs/archive/paused/m9/prompts/wave-2-personnel-safety.md` |
| 3 | `docs/archive/paused/m9/prompts/wave-3-ship-operations.md` |
| 4 | `docs/archive/paused/m9/prompts/wave-4-emergency-incident.md` |
| 5 | `docs/archive/paused/m9/prompts/wave-5-equipment-spares.md` |
| 6 | `docs/archive/paused/m9/prompts/wave-6-safety-governance.md` |
| 7 | `docs/archive/paused/m9/prompts/wave-7-documents-audit.md` |
| 8 | `docs/archive/paused/m9/prompts/wave-8-release-acceptance.md` |

## 通用约束

- SDD 优先：规格、测试、实现、验证依次执行。
- 不修改历史归档结论。
- 不接通海事监管、AIS、CCTV 等外部系统。
- 不以静态演示数据作为验收证据。
- 不在验证命令未执行时宣称通过。
