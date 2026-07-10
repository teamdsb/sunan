---
status: current-index
owner: planning
updated: 2026-07-10
replaces: []
replaced_by: []
---
# 当前执行计划索引

> 本目录只存放尚未完成的当前计划。里程碑完成并通过验收后，将对应执行计划、backlog、提示词和验收证据迁入 `docs/archive/`。

## 当前路线

| 文档 | 状态 | 用途 |
|---|---|---|
| `M8-M9-upgrade-roadmap.md` | 当前规格 | M8/M9 总体边界、依赖、能力地图和交付顺序 |
| `M8-execplans.md` | 当前待实施 | M8 七个 Wave 的任务、产出和验收 |
| `M8-wave-backlog.md` | 当前待实施 | M8 API/DB/UI/state/测试级工作清单，含采购附件解除关联修复 |
| `M9-execplans.md` | 待排期 | M9 八个 Wave 的任务、产出和验收 |
| `M9-wave-backlog.md` | 待排期 | M9 API/DB/UI/state/测试级工作清单 |
| `wave-acceptance-template.md` | 模板 | 每个 Wave 的统一验收记录格式 |

## M8 Wave 1 已冻结基线

- 安全领域边界与代码差距：`docs/specs/safety/domain-boundaries.md`
- 唯一术语与状态：`docs/specs/safety/terminology-and-status.md`
- 测试矩阵与迁移原则：`docs/specs/safety/testing-matrix.md`、`docs/specs/safety/migration-principles.md`
- 后续 API/DB/state/UI 规格目录：`docs/specs/safety/api/`、`docs/specs/safety/db/`、`docs/specs/safety/state/`、`docs/specs/safety/ui/`
- Wave 1 验收证据：`docs/archive/acceptance/safety/acceptance-m8-wave1.md`

## 配套入口

- 已归档 M7 计划：`docs/archive/execplans/M7-execplans.md`
- 已归档 M7 backlog：`docs/archive/backlogs/common/M7-wave-backlog.md`
- 已归档 M7 提示词：`docs/archive/prompts/m7/`
- M8 需求：`docs/requirements/M8-安全管理底座与核心闭环.md`
- M9 需求：`docs/requirements/M9-专业安全业务深化与体系完善.md`
- 安全领域规格索引：`docs/specs/safety/README.md`
- Wave 提示词索引：`docs/prompts/README.md`
- 功能差距基线：`docs/handbook/苏南船舶管理系统与航运安全管理数字化平台功能对比及升级建议.md`

## 使用规则

1. 每个 Wave 必须先冻结规格，再写测试，最后实现。
2. 未通过当前 Wave 验收，不得将其任务标记为完成。
3. 跨 Wave 变更必须更新需求、执行计划和 backlog 的依赖关系。
4. 外部海事、AIS、CCTV 等真实接口不在 M8/M9 范围。
5. 不得用通用文本字段替代已经冻结的专业结构化数据。
6. 完成后将计划状态改为历史归档，并建立独立验收证据。
7. M9 必须在 M8 总体验收通过后才能启动业务实现。
8. M8 Wave 2 只能在 Wave 1 的全部 P0 文档门禁与验收记录通过后启动。
