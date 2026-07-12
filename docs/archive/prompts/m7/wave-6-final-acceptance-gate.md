---
status: historical-archive
owner: archive
updated: 2026-07-10
replaces: []
replaced_by: []
---
# M7 Wave 6 提示词：最终收口与 M8/M9 重启门禁（历史归档）

```text
你正在苏南船舶管理系统仓库执行 M7 Wave 6。目标是完成最终收口、验收证据、文档索引校验，并判断 M8/M9 是否可以重新进入当前执行队列。本 Wave 不新增业务功能，除非发现阻断验收的 P0/P1 缺陷。

必须先完整阅读：
- AGENTS.md
- docs/README.md
- docs/execplans.md
- docs/requirements/M7-上线体验与导航修复.md
- docs/archive/execplans/M7-execplans.md
- docs/archive/backlogs/common/M7-wave-backlog.md
- docs/plans/wave-acceptance-template.md
- docs/prompts/README.md
- docs/requirements/M6-全量兑现与完美上线.md
- docs/archive/paused/m9/M8-M9-upgrade-roadmap.md
- docs/archive/execplans/M8-execplans.md
- docs/archive/paused/m9/M9-execplans.md
- docs/specs/common/frontend-experience-guidelines.md
- docs/specs/wecom/real-device-regression-matrix.md

完成工作包：
- M7-W6A：汇总 M7 Wave 1-5 修复状态，确认 P0/P1 是否关闭。
- M7-W6B：更新必要文档索引、提示词索引和验收记录。
- M7-W6C：执行最终命令矩阵并记录真实结果。
- M7-W6D：形成上线后回归说明。
- M7-W6E：给出 M8/M9 重启或继续顺延结论。

硬性要求：
1. 先检查 git status，不得覆盖或回滚非本任务改动。
2. 未执行的命令不得写成通过；失败命令必须给出失败摘要和处理建议。
3. P0/P1 未关闭时，不得建议启动 M8/M9。
4. 文档新增或移动后必须运行 inventory 生成和索引检查。
5. 不修改历史归档验收结论；需要验收证据时创建新记录或在当前计划中列证据路径。
6. 不启动 M8/M9 安全管理业务。

最终必须运行或说明阻断原因：
- node scripts/generate-doc-inventory.mjs
- node scripts/check-doc-index.mjs
- git diff --check
- pnpm --filter api build
- pnpm --filter web build
- pnpm --filter web test

涉及 API 或 OpenAPI 变更时补充：
- pnpm --filter api test:unit
- pnpm --filter api test:integration
- npx swagger-cli validate <openapi-file>

最终报告必须包含：
- M7 Wave 1-6 的状态
- P0/P1/P2 未关闭项
- 测试、构建、文档索引命令真实结果
- 企业微信直达和导航回归结论
- M8/M9 是否可重启的明确判断
- 若继续顺延，列出阻断项和下一步修复入口
```
