---
status: historical-archive
owner: archive
updated: 2026-07-10
replaces: []
replaced_by: []
---
# M7 Wave 2 提示词：办事分类 CSS 与搜索体验（历史归档）

```text
你正在苏南船舶管理系统仓库执行 M7 Wave 2。目标是修复办事板块分类切换 CSS 空白问题，并收敛搜索框外层视觉。本 Wave 不新增办事业务能力。

必须先完整阅读：
- AGENTS.md
- docs/README.md
- docs/execplans.md
- docs/requirements/M7-上线体验与导航修复.md
- docs/archive/execplans/M7-execplans.md
- docs/archive/backlogs/common/M7-wave-backlog.md
- docs/requirements/M2-办事.md
- docs/specs/common/frontend-experience-guidelines.md
- docs/specs/office/README.md
- docs/specs/office/ui/page-map.md
- docs/specs/office/ui/office-home-page.md
- docs/specs/office/ui/office-search-page.md
- docs/specs/office/state/office-slice.md

完成工作包：
- M7-W2A：复现“全部、海事等栏目”切换出现空白或卡死的问题。
- M7-W2B：修复分类栏、入口列表、空态和容器高度的 CSS。
- M7-W2C：去除或收敛搜索框多余外层框，让搜索控件更轻、更清楚。
- M7-W2D：确保搜索、分类和 URL 查询串状态一致。
- M7-W2E：补办事首页和搜索页回归测试。

硬性要求：
1. 先检查 git status，不得覆盖或回滚非本任务改动。
2. 七类分类和“全部”都必须能切换，不出现异常空白、横向滚动或布局跳动。
3. 搜索框不得再出现卡片套卡片的视觉层级。
4. 保持企业微信 H5 蓝白企业风格，不引入营销式 hero 或大面积高饱和背景。
5. 点击入口前仍需调用 `/open` 记录审计，不得为了修 UI 绕过业务逻辑。
6. 不启动 M8/M9 安全管理业务，不修改历史归档验收结论。

建议验证：
- pnpm --filter web test
- pnpm --filter web build
- node scripts/generate-doc-inventory.mjs
- node scripts/check-doc-index.mjs
- git diff --check

最终报告必须包含：
- 复现方式和修复前后差异
- 受影响文件
- 分类切换和搜索状态测试结果
- 移动端/桌面端布局证据
- 未解决 blocker
- 是否建议进入 M7 Wave 3
```
