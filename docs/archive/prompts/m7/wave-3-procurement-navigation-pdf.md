---
status: historical-archive
owner: archive
updated: 2026-07-10
replaces: []
replaced_by: []
---
# M7 Wave 3 提示词：采购返回、附件与中文 PDF（历史归档）

```text
你正在苏南船舶管理系统仓库执行 M7 Wave 3。目标是修复采购详情 PDF 英文问题，补齐采购二级页面返回按钮，并美化详情页附件绑定区域。

必须先完整阅读：
- AGENTS.md
- docs/README.md
- docs/execplans.md
- docs/requirements/M7-上线体验与导航修复.md
- docs/archive/execplans/M7-execplans.md
- docs/archive/backlogs/common/M7-wave-backlog.md
- docs/requirements/M3-采购管理.md
- docs/specs/common/file-upload-spec.md
- docs/specs/common/frontend-experience-guidelines.md
- docs/specs/procurement/README.md
- docs/specs/procurement/ui/page-map.md
- docs/specs/procurement/ui/order-create-page.md
- docs/specs/procurement/ui/order-list-page.md
- docs/specs/procurement/ui/approval-page.md
- docs/specs/procurement/ui/report-approval-page.md
- docs/specs/procurement/ui/print-export.md
- docs/specs/procurement/db/procurement-order-files.md

完成工作包：
- M7-W3A：修复采购详情导出 PDF 为英文的问题，确保中文模板、中文字体、中文字段和状态可读。
- M7-W3B：为采购新建、详情、审批、报表审批等有跳转的页面补齐返回按钮。
- M7-W3C：修复采购详情附件绑定框视觉问题。
- M7-W3D：回归附件绑定、预览、下载和权限。
- M7-W3E：补采购主链、PDF、返回和附件测试。

硬性要求：
1. 先检查 git status，不得覆盖或回滚非本任务改动。
2. PDF 必须适配 A4，中文文本、金额、审批意见和状态均可读。
3. 返回按钮必须在企业微信直达详情页时也可用；没有来源页时返回采购模块首页。
4. 附件区域不得继续以“手工输入 fileId”作为普通用户主路径。
5. 文件下载 URL 必须有时效并继承业务权限。
6. 不把采购审批改成企业微信原生审批主链路。
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
- PDF 英文化根因和中文化证据
- 已补返回按钮的页面清单
- 附件区域修复说明
- 测试和构建命令真实结果
- 未解决 blocker
- 是否建议进入 M7 Wave 4
```
