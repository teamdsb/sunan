---
status: operations
owner: delivery
updated: 2026-06-13
replaces: []
replaced_by: []
---
# M8 Wave 1 提示词：文档、架构与规格基线

```text
你正在苏南船舶管理系统仓库执行 M8 Wave 1。目标是冻结安全管理底座的文档、架构、术语、规格目录和验收门禁，本 Wave 不实现业务代码。

必须先完整阅读：
- AGENTS.md
- docs/README.md
- docs/guides/sdd-workflow.md
- docs/requirements/M8-安全管理底座与核心闭环.md
- docs/plans/M8-M9-upgrade-roadmap.md
- docs/plans/M8-execplans.md
- docs/plans/M8-wave-backlog.md
- docs/handbook/苏南船舶管理系统与航运安全管理数字化平台功能对比及升级建议.md
- docs/specs/common/README.md
- docs/specs/workbench/README.md
- docs/specs/safety/README.md

完成工作包：
- M8-W1A：复核需求、路线图、执行计划和当前代码差距。
- M8-W1B：创建并冻结 safety 的 domain-boundaries.md、terminology-and-status.md，以及后续 API/DB/state/UI 规格目录。
- M8-W1C：冻结测试矩阵、迁移原则、验收模板和提示词入口。

要求：
1. 先检查 git status，不得覆盖或回滚非本任务改动。
2. 对当前实现的每个关键判断给出文件、接口或测试证据。
3. 明确 M8 不新增第五个一级导航，不接外部监管、AIS、CCTV，不建设小程序。
4. 明确任务、计划、检查、问题、不符合、CAPA、措施、验证、证据、参与人的唯一术语和状态。
5. 规划的 API 文件遵循 common/api-conventions，DB 文件遵循 common/db-conventions。
6. 不创建未评审的生产表、Controller、页面或占位接口。
7. 更新 safety README、plans README、docs README 和 inventory。

验证：
- node scripts/generate-doc-inventory.mjs
- node scripts/check-doc-index.mjs
- git diff --check
- 扫描新增文档是否存在 TODO、TBD、断链和无效状态头

最终报告必须包含：
- 已完成的工作包
- 新增或修改文件
- 冻结的关键决策
- 尚未解决的 blocker
- 验证命令及真实结果
- Wave 1 验收证据路径

只有在全部 P0 文档门禁通过后，才能建议进入 Wave 2。
```
