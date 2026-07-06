---
status: operations
owner: delivery
updated: 2026-07-04
replaces: []
replaced_by: []
---
# M7 Wave 5 提示词：企业微信直达与跨模块回归

```text
你正在苏南船舶管理系统仓库执行 M7 Wave 5。目标是在企业微信 H5 运行边界下回归 Wave 1-4 的修复，确认直达入口、返回路径、上传、PDF、模块导航和弱网反馈可用。本 Wave 以验证和必要的小修为主。

必须先完整阅读：
- AGENTS.md
- docs/README.md
- docs/execplans.md
- docs/requirements/M7-上线体验与导航修复.md
- docs/plans/M7-execplans.md
- docs/plans/M7-wave-backlog.md
- docs/requirements/M5-上线强化与遗留收口.md
- docs/requirements/M6-全量兑现与完美上线.md
- docs/specs/common/frontend-experience-guidelines.md
- docs/specs/common/file-upload-spec.md
- docs/specs/wecom/README.md
- docs/specs/wecom/oauth2-spec.md
- docs/specs/wecom/jssdk-spec.md
- docs/specs/wecom/real-device-regression-matrix.md
- docs/specs/workbench/README.md

完成工作包：
- M7-W5A：回归 `/my`、`/office`、`/procurement`、`/workbench` 企业微信直达和认证恢复。
- M7-W5B：回归深链进入详情后的返回路径。
- M7-W5C：回归上传、预览、下载和采购 PDF。
- M7-W5D：检查首屏分包和无关业务预加载。
- M7-W5E：形成跨模块回归证据矩阵。

硬性要求：
1. 先检查 git status，不得覆盖或回滚非本任务改动。
2. 发现 P0/P1 回归时，先修复或明确阻断，不得直接建议进入 Wave 6。
3. 不要求用户先经过 `/my` 或站内导航；每个核心 URL 必须支持直达初始化。
4. 上传和企业微信拍照能力失败时，不得伪造成功状态。
5. 修复不得把无关业务页面加入首屏 eager load。
6. 不启动 M8/M9 安全管理业务，不修改历史归档验收结论。

建议验证：
- pnpm --filter web test
- pnpm --filter web build
- pnpm --filter api build
- node scripts/generate-doc-inventory.mjs
- node scripts/check-doc-index.mjs
- git diff --check

可用时补充真机或浏览器证据：
- 企业微信 iOS
- 企业微信 Android
- 桌面企业微信或浏览器模拟直达

最终报告必须包含：
- 四大板块直达矩阵
- 返回路径矩阵
- 上传/PDF/导航回归结果
- 性能和分包观察
- 未解决 blocker
- 是否建议进入 M7 Wave 6
```
