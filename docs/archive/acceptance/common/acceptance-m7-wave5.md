---
status: acceptance-archive
owner: delivery
updated: 2026-07-06
replaces: []
replaced_by: []
---
# M7 Wave 5 验收记录：企业微信直达与跨模块回归

## 1. 基本信息

- 里程碑：M7 上线体验与导航修复
- Wave：Wave 5 企业微信直达与跨模块回归
- 验收日期：2026-07-06
- 验收环境：macOS，本地 Node v24.14.0，pnpm v11.7.0，Vite mock mode
- 提交或分支：`Fix-ding`
- 执行人：Codex
- 复核人：待人工复核

## 2. 验收结论

- 状态：有条件通过
- 未关闭 P0：无已知代码 P0
- 未关闭 P1：无已知代码 P1
- 条件项及期限：Wave 6 前补企业微信 iOS、Android、桌面工作台真机截图证据
- 后续建议：可进入 Wave 6 最终门禁

## 3. 四板块直达矩阵

| 板块 | 直达入口 | 鉴权恢复 | 自动化证据 | 结果 |
|---|---|---|---|---|
| 我的 | `/my` | 未登录时保留原始目标；mock runtime 不触发 OAuth | `AppRoutes.mock-smoke.test.tsx`、`RequireAuth.auth.test.tsx` | 通过 |
| 办事 | `/office` | 未登录时保留原始目标；mock runtime 不触发 OAuth | `AppRoutes.mock-smoke.test.tsx`、`AppRoutes.test.tsx` | 通过 |
| 采购 | `/procurement`、`/procurement/orders/new`、`/procurement/orders/procurement-order-1` | 未登录时保留 path、query、hash；mock runtime 能直达列表、创建、详情 | `AppRoutes.mock-smoke.test.tsx`、`ProcurementOrderDetailPage.test.tsx` | 通过 |
| 工作平台 | `/workbench`、`/workbench/modules/shipping_chart_update`、`/workbench/records/:recordId` | 未登录时保留 path、query、hash；mock runtime 能直达首页和模块页 | `AppRoutes.mock-smoke.test.tsx`、`WorkbenchHomePage.test.tsx`、`RequireAuth.auth.test.tsx` | 通过 |

## 4. 返回路径矩阵

| 页面 | 返回目标 | 证据 | 结果 |
|---|---|---|---|
| 我的详情页 | `backTo` 指向同模块列表，拒绝外站与相邻路径 | `AppRoutes.test.tsx` | 通过 |
| 采购创建页 | `/procurement` | `ProcurementOrderCreatePage.test.tsx` | 通过 |
| 采购详情页 | `/procurement` | `ProcurementOrderDetailPage.test.tsx` | 通过 |
| 采购报表审批单详情 | `/procurement/reports` | `ProcurementReportRequestDetailPage.test.tsx` | 通过 |
| 工作台模块页 | `/workbench`，并锚定当前模块卡 | `WorkbenchHomePage.test.tsx`、`moduleNav.test.ts` | 通过 |
| 工作台记录详情页 | `/workbench`，详情抽屉关闭后仍可回首页 | `WorkbenchHomePage.test.tsx` | 通过 |

## 5. 上传、PDF 与导航回归

| 场景 | 证据 | 结果 |
|---|---|---|
| 标准文件上传 presign、OSS PUT、回调 | `useFileUpload.test.tsx` | 通过 |
| 企业微信 `chooseImage`/`uploadImage` 失败可重试，不伪造成功 | `FileUploadField.test.tsx`、`useFileUpload.mock.test.tsx` | 通过 |
| 文件预览、下载 URL 使用后端签名 | `useFileUpload.test.tsx`、`ProcurementOrderDetailPage.test.tsx` | 通过 |
| 采购单 PDF 打印打开后端返回 URL | `ProcurementOrderDetailPage.test.tsx`、`procurement.integration.spec.ts` | 通过 |
| 采购附件下载限定采购域 | `ProcurementOrderDetailPage.test.tsx`、`procurement.integration.spec.ts` | 通过 |
| 工作台入口映射不混淆审批、考勤、模块锚点 | `moduleNav.test.ts`、`WorkbenchHomePage.test.tsx` | 通过 |

## 6. 首屏分包观察

| 检查项 | 证据 | 结果 |
|---|---|---|
| 业务页面使用 route-level dynamic import | `AppRoutes.lazy.test.ts` | 通过 |
| `/my` 不静态导入采购或工作台页面 | `AppRoutes.lazy.test.ts` | 通过 |
| Vite 构建入口未预加载采购/工作台业务 chunk | `apps/web/dist/index.html` 仅预加载 `vendor-state`、`vendor-react`、`vendor-http` | 通过 |

## 7. 自动化验证

| 命令 | 结果 | 失败数 | 证据 |
|---|---|---:|---|
| `pnpm --filter web test -- src/router/AppRoutes.mock-smoke.test.tsx src/router/RequireAuth.auth.test.tsx src/router/AppRoutes.lazy.test.ts src/features/files/FileUploadField.test.tsx src/features/files/useFileUpload.test.tsx src/features/files/useFileUpload.mock.test.tsx src/features/procurement/ProcurementOrderDetailPage.test.tsx src/features/procurement/ProcurementReportRequestDetailPage.test.tsx src/features/workbench/WorkbenchHomePage.test.tsx src/router/moduleNav.test.ts` | 通过 | 0 | 实际执行整套 web 测试：55 files / 222 tests |
| `pnpm --filter web build` | 通过 | 0 | `tsc -b && vite build`；页面 chunk 独立输出 |
| `pnpm --filter api build` | 通过 | 0 | NestJS 编译 |
| `DOCKER_HOST=unix:///Users/dingdexin/.colima/default/docker.sock TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock pnpm --filter api test:integration -- --runTestsByPath test/files.integration.spec.ts test/procurement.integration.spec.ts test/workbench.integration.spec.ts` | 通过 | 0 | 3 suites / 15 tests |
| `node scripts/generate-doc-inventory.mjs` | 通过 | 0 | 生成 226 个 Markdown 条目 |
| `node scripts/check-doc-index.mjs` | 通过 | 0 | `doc index ok: 226 markdown files` |
| `git diff --check` | 通过 | 0 | 无空白或换行问题 |

## 8. 前端与真机

- [x] 本地 mock runtime 覆盖 `/my`、`/office`、`/procurement`、`/workbench` 直达。
- [x] 未登录 OAuth 发起时保留 path、query、hash。
- [x] 上传失败路径不伪造成功，允许用户重试。
- [x] 采购 PDF、附件预览、下载使用后端返回 URL。
- [x] 路由级分包保持懒加载。
- [ ] 企业微信 iOS 真机截图；未执行。
- [ ] 企业微信 Android 真机截图；未执行。
- [ ] 桌面企业微信工作台截图；未执行。

## 9. 缺陷与后续

| 编号 | 级别 | 描述 | 责任人 | 期限 | 状态 |
|---|---|---|---|---|---|
| `M7-W5-FU-01` | P2 | 企业微信 iOS、Android、桌面工作台截图证据未在本地环境执行 | QA | Wave 6 | 待补 |

## 10. 复核签字

- 实施负责人：Codex
- 产品负责人：待填写
- QA：待填写
- 运维：待填写
