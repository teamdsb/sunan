---
status: operations
owner: planning
updated: 2026-07-04
replaces: []
replaced_by: []
---
# 发现与决策

## 需求
- 用户要求阅读仓库文档，规划如何将 M7/M8 推迟到后面。
- 用户要求规划 9 类已发现问题的修复文档。
- 用户要求文档符合仓库标准与格式。
- 用户要求完成每一 M 的 wave 提示词。
- 用户明确“规划好即可”，本轮不实现业务代码。
- 用户最新确认：M1-M6 的修复作为新的 M7，之前的 M7/M8 延后。

## 研究发现
- 仓库没有既有 `task_plan.md`、`findings.md`、`progress.md`。
- `docs/` 已存在当前计划入口：`docs/execplans.md`、`docs/plans/README.md`、`docs/prompts/README.md`。
- M7/M8 当前已有计划与 prompt：`docs/plans/M7-execplans.md`、`docs/plans/M8-execplans.md`、`docs/prompts/m7/`、`docs/prompts/m8/`。
- `docs/execplans.md` 原先写明“M7 为当前待实施里程碑，M8 仅在 M7 总体验收通过后启动”；用户确认后已改为“新 M7 修复优先，原 M7/M8 后移为 M8/M9”。
- `docs/plans/README.md` 原先只索引 M7/M8 当前路线；新增新 M7 修复计划后必须更新此入口。
- `docs/prompts/README.md` 原先标题和内容只覆盖 M7/M8；已扩展为“当前修复与后续升级 Wave 提示词索引”。
- `scripts/check-doc-index.mjs` 固定允许状态值；不能新增 `deferred` 状态。
- 已将当前修复执行计划重排为 `docs/plans/M7-execplans.md` 和 `docs/plans/M7-wave-backlog.md`。
- 已将六份修复提示词移动到 `docs/prompts/m7/`，作为新 M7 Wave 1-6。
- 原 M7 安全管理底座已后移为 M8：需求、执行计划、backlog、提示词目录均使用 M8。
- 原 M8 专业安全深化已后移为 M9：需求、执行计划、backlog、提示词目录均使用 M9。
- `docs/execplans.md`、`docs/plans/README.md`、`docs/prompts/README.md` 已切换为新 M7 当前优先。

## 技术决策
| 决策 | 理由 |
|------|------|
| 用新 M7 承接用户列出的问题 | 问题集中在我的、办事、采购、工作台、文件上传与导航，属于上线体验与导航修复 |
| 将 `docs/execplans.md` 作为重排主入口 | 这是仓库明确的当前执行计划入口，最能避免 Agent 误启动后移的 M8/M9 |
| 将原 M7/M8 后移为 M8/M9 | 符合用户最新命名意图，避免两个 M7 并存 |

## 遇到的问题
| 问题 | 解决方案 |
|------|---------|
| 原 M7/M8 与新 M7 命名冲突 | 将原 M7/M8 整体后移为 M8/M9 |
| 根目录规划文件缺 YAML 头会破坏文档索引校验 | 已补 `status/owner/updated/replaces/replaced_by` |
| 默认 PATH 中找不到 `node` | 使用 Codex bundled Node：`/Users/yuan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node` |

## 资源
- `AGENTS.md`
- `docs/README.md`
- `docs/inventory.md`
- `docs/execplans.md`
- `docs/plans/README.md`
- `docs/prompts/README.md`

## 视觉/浏览器发现
- 未使用浏览器或视觉工具。

---
*每执行2次查看/浏览器/搜索操作后更新此文件*
*防止视觉信息丢失*
