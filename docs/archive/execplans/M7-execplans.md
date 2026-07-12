---
status: historical-archive
owner: archive
updated: 2026-07-10
replaces: []
replaced_by: []
---
# M7 执行计划：上线体验与导航修复（历史归档）

## 1. 文档定位

M7 已于 2026-07-10 完成并归档。本文保留 M1-M6 已上线能力的缺陷修复、体验收口和企业微信 H5 直达回归过程，不能再作为当前开发入口。

本计划只处理当时已发现的上线问题，不新增 M8/M9 安全管理业务，不重写 M1-M6 历史归档结论。历史执行计划均在 `docs/archive/execplans/`，后续开发应以 M8/M9 当前计划为准。

## 2. 调度决策

- 完成状态：M7 Wave 1-6 已完成，并由 `docs/archive/acceptance/common/acceptance-m7-wave6.md` 记录最终门禁。
- 原 M7/M8：整体后移为 M8/M9，并顺延到本计划 Wave 6 验收通过后再重新排期。
- M8/M9 文档保留为未来升级规格，不删除、不归档、不作为当前开发入口。
- 本段为历史调度决策；当前调度以 `docs/execplans.md` 为准。

M8/M9 可重启的最小门禁：

1. 本计划 P0/P1 问题全部关闭。
2. 受影响 API、前端测试、构建和文档索引校验通过。
3. 企业微信直达、返回路径、上传、PDF、模块导航和工作台锚点回归完成。
4. 未留下会阻断 M8/M9 底座复用的文件、导航或工作平台 P0 缺陷。

## 3. 问题映射

| 编号 | 问题 | 归属 | Wave | 优先级 |
|---|---|---|---|---|
| `R-01` | 上传文件功能报错不可用 | M1 / common，影响 M3、M4 | Wave 1 | P0 |
| `R-02` | 我的板块组件偏大，需要缩小并接近办事板块美观度 | M1 | Wave 1 | P1 |
| `R-03` | 办事板块点击“全部”、海事等栏目时 CSS 卡出空白 | M2 | Wave 2 | P0 |
| `R-04` | 办事板块搜索框外层框丑，需去除或收敛 | M2 | Wave 2 | P1 |
| `R-05` | 采购详细页导出 PDF 是英文 | M3 | Wave 3 | P0 |
| `R-06` | 采购新建、详情、审批等跳转页缺返回按键 | M3 | Wave 3 | P0 |
| `R-07` | 采购详细页附件绑定框视觉问题 | M3 | Wave 3 | P1 |
| `R-08` | 工作台跳转页缺返回键，组件高度偏高 | M4 | Wave 4 | P0/P1 |
| `R-09` | 模块导航多个入口跳转相同、锚点失效、审批和考勤跳转失效 | M4 / M6 | Wave 4、Wave 5 | P0 |

## 4. Wave 规划

### Wave 1：M1 与通用上传修复

目标：

- 修复文件上传不可用的根因，并回归预签名上传、callback 元数据、下载预签名链路。
- 缩小 `/my` 首页和二级页组件密度，使其与办事板块的企业蓝白 H5 风格一致。

主要产出：

- 文件服务和上传组件修复。
- `/my` 视觉密度调整。
- 上传错误态、重试、权限和下载回归测试。

验收：

- 证书、企业资料/制度、采购附件和工作平台附件至少各有一条上传或绑定回归证据。
- 上传失败显示业务可理解错误，不暴露开发异常。
- 320px 宽度无横向滚动，组件高度不再挤压首屏。

### Wave 2：M2 办事板块 CSS 与搜索体验修复

目标：

- 修复分类切换导致的空白、错位或高度异常。
- 收敛搜索框外层视觉，保持轻量、直接、和模块首页一致。

主要产出：

- `/office` 分类栏、入口列表、搜索框样式修复。
- `/office/search` 与首页分类筛选状态一致。

验收：

- “全部、海事、海关、边检、船检、环保、其他、石化园区”切换无空白卡死。
- 搜索框没有多余外框嵌套，移动端和桌面端均可读。

### Wave 3：M3 采购导航、附件与中文 PDF 修复

目标：

- 采购详情导出 PDF 使用中文模板、中文字体和 A4 版式。
- 所有采购二级/三级页面具备清晰返回路径。
- 采购详情附件绑定区域收敛为可读、可操作的文件列表或上传区。

主要产出：

- 采购 PDF 中文渲染修复。
- `/procurement/orders/new`、`/procurement/orders/:id`、`/procurement/approvals`、报表审批等页面返回按钮。
- 附件绑定 UI 修复和错误态。

验收：

- PDF 中标题、字段、状态、金额、审批意见均为中文可读。
- 直接从企业微信深链进入页面时也能返回模块首页或来源列表。
- 附件绑定失败可重试，已绑定附件可预览或下载。

### Wave 4：M4 工作台返回、组件密度与模块导航修复

目标：

- 工作台所有有下一页跳转的页面补齐返回路径。
- 缩小工作台和相关模块卡片高度，提升首屏扫描效率。
- 修复模块导航锚点和目标路由：工作平台首页回到 `/workbench` 顶部，海图更新、签到台、燃油加注审批、审批、考勤进入对应模块或区域。

主要产出：

- 工作台页面返回按钮和来源恢复。
- 模块卡片、待办卡、统计卡高度收敛。
- 模块导航目标表和路由/锚点回归。

验收：

- 导航入口不再全部跳到同一位置。
- 从导航进入工作平台首页时页面停在顶部。
- 从导航进入海图更新、签到台、燃油加注审批、审批、考勤时命中对应模块或区域。

### Wave 5：M5 企业微信直达与跨模块回归

目标：

- 把 Wave 1-4 的修复放回企业微信 H5 运行框架下回归。
- 验证直达入口、认证恢复、返回路径、文件、PDF、模块导航和弱网提示。

主要产出：

- 四大板块直达回归矩阵。
- 上传、PDF、导航、返回路径的跨模块 smoke。
- 如发现 P0/P1 回归，回到对应 Wave 修复，不带病进入 Wave 6。

验收：

- `/my`、`/office`、`/procurement`、`/workbench` 直接打开可完成初始化。
- 企业微信消息或工作台深链进入详情页时，有明确返回路径。
- 路由级分包未引入明显无关业务首屏加载。

### Wave 6：最终收口、验收归档与 M8/M9 重启门禁

目标：

- 完成最终测试、文档索引、验收材料和 M8/M9 重排期判断。
- 确认 M7 修复完成后，M8/M9 才能重新进入当前执行队列。

主要产出：

- 修复验收记录。
- 文档索引与提示词索引更新。
- M8/M9 重启建议或阻断清单。

验收：

- `node scripts/generate-doc-inventory.mjs`、`node scripts/check-doc-index.mjs`、`git diff --check` 通过。
- 受影响 API、Web 测试与 build 已执行并记录结果。
- 未完成项按 P0/P1/P2 分级，不得把 P0/P1 带入 M8/M9。

## 5. 执行规则

1. 每个 Wave 先读对应提示词，再读本文和 backlog。
2. 先复现问题，再修复；修复前记录影响范围。
3. 涉及文件上传时必须遵循 `docs/specs/common/file-upload-spec.md`。
4. 涉及页面体验、返回、锚点、企业微信直达时必须遵循 `docs/specs/common/frontend-experience-guidelines.md`。
5. 涉及采购导出时必须遵循 `docs/specs/procurement/ui/print-export.md`。
6. 涉及工作台入口时必须遵循 `docs/specs/workbench/README.md` 和模块矩阵。
7. 不修改历史归档验收结论；需要新证据时创建新的验收记录。

## 6. 验证命令

按受影响范围执行，Wave 6 必须汇总：

```bash
node scripts/generate-doc-inventory.mjs
node scripts/check-doc-index.mjs
git diff --check
pnpm --filter api build
pnpm --filter web build
pnpm --filter web test
```

涉及 API 或 OpenAPI 变更时补充：

```bash
pnpm --filter api test:unit
pnpm --filter api test:integration
npx swagger-cli validate <openapi-file>
```

## 7. 交付物关系

- 需求：`docs/requirements/M7-上线体验与导航修复.md`
- Backlog：`docs/archive/backlogs/common/M7-wave-backlog.md`
- 提示词：`docs/archive/prompts/m7/`
- 通用体验：`docs/specs/common/frontend-experience-guidelines.md`
- 通用上传：`docs/specs/common/file-upload-spec.md`
- 后续升级历史路线：`docs/archive/paused/m9/M8-M9-upgrade-roadmap.md`
