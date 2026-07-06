---
status: current-index
owner: delivery
updated: 2026-07-06
replaces: []
replaced_by: []
---
# 当前修复与后续升级 Wave 提示词索引

> 2026-07-04 调度更新：M1-M6 修复正式作为新 M7。原 M7/M8 安全管理计划整体后移为 M8/M9。

## 使用方法

1. M7 Wave 1 -> Wave 6 已完成本地最终门禁；后续从 M8 Wave 1 重新排期。
2. 将对应提示词全文交给 Coding Agent。
3. Agent 必须在当前仓库工作，不新建平行示例项目。
4. 每个 Wave 完成后使用 `docs/plans/wave-acceptance-template.md` 形成验收记录。
5. 未取得命令输出和证据前，不得勾选执行计划。
6. M8/M9 提示词只能在 `docs/archive/acceptance/common/acceptance-m7-wave6.md` 记录的 P0/P1 门禁通过后使用。

## 当前修复：M7

| Wave | 提示词 |
|---|---|---|
| 1 | `m7/wave-1-upload-and-my-polish.md` |
| 2 | `m7/wave-2-office-css-search.md` |
| 3 | `m7/wave-3-procurement-navigation-pdf.md` |
| 4 | `m7/wave-4-workbench-navigation-density.md` |
| 5 | `m7/wave-5-wecom-direct-regression.md` |
| 6 | `m7/wave-6-final-acceptance-gate.md` |

## 后续升级：M8（后移）

| Wave | 提示词 |
|---|---|
| 1 | `m8/wave-1-spec-baseline.md` |
| 2 | `m8/wave-2-permission-workflow.md` |
| 3 | `m8/wave-3-evidence-export.md` |
| 4 | `m8/wave-4-master-data.md` |
| 5 | `m8/wave-5-plan-task.md` |
| 6 | `m8/wave-6-inspection-capa.md` |
| 7 | `m8/wave-7-release-acceptance.md` |

## 后续升级：M9（后移）

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
