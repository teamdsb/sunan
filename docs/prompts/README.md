---
status: current-index
owner: delivery
updated: 2026-07-10
replaces: []
replaced_by: []
---
# 当前升级 Wave 提示词索引

> M7 上线体验与导航修复已于 2026-07-10 完成并归档；当前从 M8 Wave 1 启动，M9 必须等待 M8 总体验收。

## 使用方法

1. 从 M8 Wave 1 开始实施；M7 历史提示词见 `docs/archive/prompts/m7/`。
2. 将对应提示词全文交给 Coding Agent。
3. Agent 必须在当前仓库工作，不新建平行示例项目。
4. 每个 Wave 完成后使用 `docs/plans/wave-acceptance-template.md` 形成验收记录。
5. 未取得命令输出和证据前，不得勾选执行计划。
6. M9 提示词只能在 M8 总验收通过后使用。

## 当前升级：M8

| Wave | 提示词 |
|---|---|
| 1 | `m8/wave-1-spec-baseline.md` |
| 2 | `m8/wave-2-permission-workflow.md` |
| 3 | `m8/wave-3-evidence-export.md` |
| 4 | `m8/wave-4-master-data.md` |
| 5 | `m8/wave-5-plan-task.md` |
| 6 | `m8/wave-6-inspection-capa.md` |
| 7 | `m8/wave-7-release-acceptance.md` |

## 后续升级：M9

| Wave | 提示词 |
|---|---|
| 1 | `m9/wave-1-baseline-specs.md` |
| 2 | `m9/wave-2-personnel-safety.md` |
| 3 | `m9/wave-3-ship-operations.md` |
| 4 | `m9/wave-4-emergency-incident.md` |
| 5 | `m9/wave-5-equipment-spares.md` |
| 6 | `m9/wave-6-safety-governance.md` |
| 7 | `m9/wave-7-documents-audit.md` |
| 8 | `m9/wave-8-release-acceptance.md` |

## 通用约束

- SDD 优先：规格、测试、实现、验证依次执行。
- 不修改历史归档结论。
- 不覆盖用户已有改动。
- 不接通海事监管、AIS、CCTV 等外部系统。
- 不把通用文本字段当成专业领域闭环。
- 不以静态演示数据作为验收证据。
- 不在验证命令未执行时宣称通过。
