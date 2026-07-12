---
status: acceptance-archive
owner: delivery
updated: 2026-07-10
replaces: []
replaced_by: []
---
# M7 Wave 6 验收记录：最终收口与 M8/M9 重启门禁

## 1. 基本信息

- 里程碑：M7 上线体验与导航修复
- Wave：Wave 6 最终收口与 M8/M9 重启门禁
- 验收日期：2026-07-06
- 验收环境：macOS，本地 Node v24.14.0，pnpm v11.7.0，Vite mock mode，Colima Docker 29.2.1
- 提交或分支：`Fix-ding`
- 执行人：Codex
- 复核人：待人工复核

## 2. 验收结论

- 状态：通过
- 未关闭 P0：无
- 未关闭 P1：无
- 未关闭 P2：无
- 真机确认：产品负责人于 2026-07-10 确认已完成 M7 真机验证，并允许 M7 结束归档；本仓库未代为补写设备型号、版本或截图索引。
- M8/M9 判断：M8 可从 Wave 1 重新排期；M9 仍以 M8 总体验收为前置

## 3. M7 Wave 1-6 状态

| Wave | 主题 | 状态 | P0/P1 结论 | 证据 |
|---|---|---|---|---|
| Wave 1 | 上传与我的板块视觉 | 通过 | 无未关闭 P0/P1 | `docs/archive/acceptance/common/acceptance-m7-wave1.md` |
| Wave 2 | 办事 CSS 与搜索体验 | 通过 | 无未关闭 P0/P1 | `docs/archive/acceptance/common/acceptance-m7-wave2.md` |
| Wave 3 | 采购返回、附件与中文 PDF | 通过 | 无未关闭 P0/P1 | `docs/archive/acceptance/common/acceptance-m7-wave3.md` |
| Wave 4 | 工作台返回、密度与导航锚点 | 通过 | 无未关闭 P0/P1 | `docs/archive/acceptance/common/acceptance-m7-wave4.md` |
| Wave 5 | 企业微信直达与跨模块回归 | 通过 | 无未关闭 P0/P1 | `docs/archive/acceptance/common/acceptance-m7-wave5.md` |
| Wave 6 | 最终收口与重启门禁 | 通过 | 无未关闭 P0/P1 | 本文 |

## 4. 工作包状态

| 工作包 | 状态 | 证据 | 备注 |
|---|---|---|---|
| `M7-W6A` | 通过 | Wave 1-5 验收记录 | P0/P1 均关闭，剩余项均为真机截图 P2 |
| `M7-W6B` | 通过 | `docs/execplans.md`、`docs/prompts/README.md`、`docs/inventory.md` | 更新当前执行入口、提示词入口和文档清单 |
| `M7-W6C` | 通过 | 本文第 7 节 | 最终命令矩阵已执行并记录真实结果 |
| `M7-W6D` | 通过 | 本文第 8 节 | 上线后回归说明已形成 |
| `M7-W6E` | 通过 | 本文第 9 节 | M8 可重启，M9 继续等待 M8 |

## 5. P0/P1/P2 未关闭项

| 级别 | 未关闭项 | 影响 | 处理 |
|---|---|---|---|
| P0 | 无 | 不阻断 M8 | 无 |
| P1 | 无 | 不阻断 M8 | 无 |
| P2 | 无 | 无 | 无 |

## 6. 企业微信直达和导航回归结论

| 范围 | 结论 | 证据 |
|---|---|---|
| 四板块直达 | `/my`、`/office`、`/procurement`、`/workbench` 本地 mock runtime 可初始化 | `AppRoutes.mock-smoke.test.tsx` |
| 认证恢复 | 未登录时保留 path、query、hash | `RequireAuth.auth.test.tsx` |
| 返回路径 | 我的、采购、工作台深链均有返回目标 | `AppRoutes.test.tsx`、采购/工作台页面测试 |
| 上传/PDF | 上传失败可重试，采购 PDF 为中文 A4，附件下载继承业务权限 | `useFileUpload*.test.tsx`、`procurement.integration.spec.ts` |
| 模块导航 | 工作台首页、模块、审批、考勤目标不混淆 | `moduleNav.test.ts`、`WorkbenchHomePage.test.tsx` |
| 首屏分包 | 业务页保持 route-level lazy loading，入口 HTML 未预加载采购/工作台页面 chunk | `AppRoutes.lazy.test.ts`、`pnpm --filter web build` |

## 7. 自动化验证

| 命令 | 结果 | 失败数 | 证据 |
|---|---|---:|---|
| `pnpm --filter api build` | 通过 | 0 | `nest build` |
| `pnpm --filter web build` | 通过 | 0 | `tsc -b && vite build`；无业务大 chunk 警告 |
| `pnpm --filter web test` | 通过 | 0 | 55 files / 222 tests |
| `node scripts/generate-doc-inventory.mjs` | 通过 | 0 | 生成 227 个 Markdown 条目 |
| `node scripts/check-doc-index.mjs` | 通过 | 0 | `doc index ok: 227 markdown files` |
| `git diff --check` | 通过 | 0 | 无空白或换行问题 |
| `pnpm --filter api test:unit` | 不适用 | 0 | Wave 6 未改 API 代码；Wave 1/3 已跑 API unit |
| `pnpm --filter api test:integration` | 不适用 | 0 | Wave 6 未改 API 代码；Wave 5 已回归 files/procurement/workbench integration |
| OpenAPI validate | 不适用 | 0 | Wave 6 未改 OpenAPI YAML |

说明：当前 Node 为 v24.14.0，pnpm 输出 `wanted: {"node":"20.x"}` 警告，但命令均按实际退出码记录。

## 8. 上线后回归说明

- 产品负责人已确认 M7 真机验证完成；设备与截图索引按实际验证材料保管。
- 发布后首日：重点巡检 OAuth2、文件上传 callback、采购 PDF、工作台深链和企业微信 JS-SDK 初始化日志。
- 发布后一周：按 `docs/specs/wecom/real-device-regression-matrix.md` 保留设备、企业微信版本、执行人、执行时间和截图索引。

## 9. M8/M9 重启判断

| 里程碑 | 判断 | 理由 |
|---|---|---|
| M8 | 可重新排期并从 Wave 1 启动 | M7 文件、导航、采购 PDF、工作台直达相关 P0/P1 已关闭；测试、构建和文档索引门禁通过后即可进入安全管理规格基线 |
| M9 | 继续顺延 | M9 以 M8 总体验收为前置，不应越过 M8 启动 |

## 10. 证据索引

### 规格

- `docs/archive/prompts/m7/wave-6-final-acceptance-gate.md`
- `docs/requirements/M7-上线体验与导航修复.md`
- `docs/archive/execplans/M7-execplans.md`
- `docs/archive/backlogs/common/M7-wave-backlog.md`
- `docs/archive/paused/m9/M8-M9-upgrade-roadmap.md`
- `docs/specs/common/frontend-experience-guidelines.md`
- `docs/specs/wecom/real-device-regression-matrix.md`

### 验收记录

- `docs/archive/acceptance/common/acceptance-m7-wave1.md`
- `docs/archive/acceptance/common/acceptance-m7-wave2.md`
- `docs/archive/acceptance/common/acceptance-m7-wave3.md`
- `docs/archive/acceptance/common/acceptance-m7-wave4.md`
- `docs/archive/acceptance/common/acceptance-m7-wave5.md`

### 测试与构建

- `apps/web/src/router/AppRoutes.mock-smoke.test.tsx`
- `apps/web/src/router/RequireAuth.auth.test.tsx`
- `apps/web/src/router/AppRoutes.lazy.test.ts`
- `apps/web/src/router/moduleNav.test.ts`
- `apps/web/src/features/files/useFileUpload.test.tsx`
- `apps/web/src/features/files/useFileUpload.mock.test.tsx`
- `apps/web/src/features/procurement/ProcurementOrderDetailPage.test.tsx`
- `apps/web/src/features/workbench/WorkbenchHomePage.test.tsx`

## 11. 缺陷与后续

| 编号 | 级别 | 描述 | 责任人 | 期限 | 状态 |
|---|---|---|---|---|---|
| `M7-W6-FU-01` | P2 | 企业微信真机验证材料未在本地环境执行 | 产品负责人 | 2026-07-10 | 已由产品负责人确认完成 |

## 12. 复核签字

- 实施负责人：Codex
- 产品负责人：待填写
- QA：待填写
- 运维：待填写
