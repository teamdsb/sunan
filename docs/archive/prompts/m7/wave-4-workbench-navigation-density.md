---
status: historical-archive
owner: archive
updated: 2026-07-10
replaces: []
replaced_by: []
---
# M7 Wave 4 提示词：工作台返回、组件密度与导航锚点（历史归档）

```text
你正在苏南船舶管理系统仓库执行 M7 Wave 4。目标是修复工作台跳转页缺少返回按钮、组件高度偏高、模块导航目标重复或失效的问题。

必须先完整阅读：
- AGENTS.md
- docs/README.md
- docs/execplans.md
- docs/requirements/M7-上线体验与导航修复.md
- docs/archive/execplans/M7-execplans.md
- docs/archive/backlogs/common/M7-wave-backlog.md
- docs/requirements/M4-工作平台.md
- docs/requirements/M6-全量兑现与完美上线.md
- docs/specs/common/frontend-experience-guidelines.md
- docs/specs/workbench/README.md
- docs/specs/workbench/ui/workbench-information-architecture.md
- docs/specs/workbench/ui/workbench-template-pages.md
- docs/specs/workbench/ui/workbench-department-modules.md
- docs/specs/workbench/state/workbench-shell.md
- docs/specs/workbench/db/workbench-module-matrix.md

完成工作包：
- M7-W4A：为工作台所有有跳转下一页的地方补齐返回路径。
- M7-W4B：缩小工作台模块卡、待办卡、统计卡和相关组件高度。
- M7-W4C：修复模块导航目标映射，避免工作平台首页、海图更新、签到台、燃油加注审批跳到同一位置。
- M7-W4D：修复审批和考勤跳转失效。
- M7-W4E：补路由、锚点、滚动位置和模块高亮回归。

硬性要求：
1. 先检查 git status，不得覆盖或回滚非本任务改动。
2. 工作平台首页入口必须回到 `/workbench` 顶部，不应落在下滑位置。
3. 海图更新、签到台、燃油加注审批必须命中对应模块或区域。
4. 审批入口必须命中工作台审批页或审批区域，考勤入口必须命中统计/考勤目标。
5. 直接从企业微信工作台或消息深链进入模块详情时，返回路径仍可用。
6. 缩小组件时不得降低 44px 触控目标可用性，不得让文字重叠。
7. 不启动 M8/M9 安全管理业务，不修改历史归档验收结论。

建议验证：
- pnpm --filter web test
- pnpm --filter web build
- node scripts/generate-doc-inventory.mjs
- node scripts/check-doc-index.mjs
- git diff --check

最终报告必须包含：
- 修复的导航目标映射表
- 已补返回路径的页面清单
- 组件高度和移动端布局证据
- 路由/锚点/滚动位置测试结果
- 未解决 blocker
- 是否建议进入 M7 Wave 5
```
