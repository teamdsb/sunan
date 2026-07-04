---
status: operations
owner: delivery
updated: 2026-07-04
replaces: []
replaced_by: []
---
# M7 Wave 1 提示词：文件上传与我的板块视觉收口

```text
你正在苏南船舶管理系统仓库执行 M7 Wave 1。目标是修复文件上传不可用问题，并收敛“我的”板块组件尺寸和视觉密度。本 Wave 允许修改代码、测试和必要规格，但不启动 M8/M9 安全管理业务。

必须先完整阅读：
- AGENTS.md
- docs/README.md
- docs/execplans.md
- docs/requirements/M7-上线体验与导航修复.md
- docs/plans/M7-execplans.md
- docs/plans/M7-wave-backlog.md
- docs/requirements/M1-我的.md
- docs/specs/common/file-upload-spec.md
- docs/specs/common/frontend-experience-guidelines.md
- docs/specs/common/auth-spec.md
- docs/specs/my/README.md
- docs/specs/my/ui/page-map.md
- docs/specs/procurement/README.md
- docs/specs/workbench/README.md

完成工作包：
- M7-W1A：复现上传报错并列出影响入口。
- M7-W1B：修复 presign、OSS PUT、callback 元数据和 download-url 链路。
- M7-W1C：修复上传组件错误态、进度、重试和业务绑定反馈。
- M7-W1D：缩小“我的”板块组件尺寸，使首页和二级页更紧凑、美观，并与办事板块风格接近。
- M7-W1E：补充上传和视觉回归测试。

硬性要求：
1. 先检查 git status，不得覆盖或回滚非本任务改动。
2. 上传必须继续采用 OSS 预签名直传，不得改成后端中转大文件。
3. 上传失败必须显示业务可理解错误，并保留重试路径。
4. 至少回归 `/my`、采购附件和工作台附件任意一个真实绑定入口；如果某入口暂不可自动化，必须记录原因和手工验证步骤。
5. `/my` 进入时不得 eager import 办事、采购、工作平台等无关业务页。
6. 视觉调整遵循蓝白企业 H5 风格，移动端 320px 无横向滚动，文本和按钮不重叠。
7. 不启动 M8/M9 安全管理业务，不修改历史归档验收结论。

建议验证：
- pnpm --filter api test:unit
- pnpm --filter api test:integration
- pnpm --filter api build
- pnpm --filter web test
- pnpm --filter web build
- node scripts/generate-doc-inventory.mjs
- node scripts/check-doc-index.mjs
- git diff --check

最终报告必须包含：
- 上传报错根因和影响入口
- 已修复的代码和文档文件
- `/my` 视觉调整说明和截图/测试证据
- 执行过的命令及真实结果
- 未解决 P0/P1 blocker
- 是否建议进入 M7 Wave 2
```
