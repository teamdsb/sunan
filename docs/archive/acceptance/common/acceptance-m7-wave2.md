---
status: acceptance-archive
owner: delivery
updated: 2026-07-05
replaces: []
replaced_by: []
---
# M7 Wave 2 验收记录：办事分类 CSS 与搜索体验

## 1. 基本信息

- 里程碑：M7 上线体验与导航修复
- Wave：Wave 2 办事分类 CSS 与搜索体验
- 验收日期：2026-07-05
- 验收环境：macOS，本地 Node v24.14.0，pnpm v11.7.0，Vite mock mode，Google Chrome headless
- 提交或分支：`Fix-ding`
- 执行人：Codex
- 复核人：待人工复核

## 2. 验收结论

- 状态：有条件通过
- 未关闭 P0：无已知代码 P0；真机企业微信未执行
- 未关闭 P1：无已知代码 P1；缺少人工截图证据
- 条件项及期限：进入 Wave 5 前补企业微信 iOS/Android/桌面真机截图矩阵

## 3. 工作包状态

| 工作包 | 状态 | 证据 | 备注 |
|---|---|---|---|
| `M7-W2A` | 通过 | Chrome headless 桌面 1366 与移动 320 逐个点击“全部、海事、海关、边检、船检、环保、其他、石化园区” | 复现根因：`Segmented block` 叠加强制换行 CSS，8 个选项时布局计算不稳定 |
| `M7-W2B` | 通过 | `apps/web/src/app/app.css`，`dashboardLayoutCss.test.ts` | 分类栏改为可换行轻量 pills，列表和空态高度稳定 |
| `M7-W2C` | 通过 | Chrome computed style：搜索输入外层 `box-shadow: none` | 搜索区不再呈现卡片套卡片层级 |
| `M7-W2D` | 通过 | `OfficeHomePage.test.tsx`、`OfficeSearchPage.test.tsx` | `/office` 与 `/office/search` 均从 URL 查询串恢复 keyword/category |
| `M7-W2E` | 通过 | `pnpm --filter web test` | 办事首页、搜索页和 CSS 回归已覆盖 |

## 4. 规格一致性

- [x] 需求、执行计划和 backlog 已核对，未启动 M8/M9。
- [x] API 规格与 Controller/DTO/响应一致；本 Wave 未改 API。
- [x] DB 规格与 migration/entity/index 一致；本 Wave 未新增 migration。
- [x] state 规格与合法动作和非法转换一致；分类与搜索状态以 URL 查询串为准。
- [x] UI 规格与路由、页面、权限和移动体验一致。
- [x] 领域 README 和 `docs/inventory.md` 已更新。

## 5. 自动化验证

| 命令 | 结果 | 失败数 | 证据 |
|---|---|---:|---|
| `pnpm --filter api lint` | 不适用 | 0 | 本 Wave 未改 API |
| `pnpm --filter api test:unit` | 不适用 | 0 | 本 Wave 未改 API |
| `pnpm --filter api test:integration` | 不适用 | 0 | 本 Wave 未改 API |
| `pnpm --filter web test -- src/features/office/OfficeHomePage.test.tsx src/features/office/OfficeSearchPage.test.tsx src/app/dashboardLayoutCss.test.ts` | 通过 | 0 | 实际执行整套 web 测试：50 files / 204 tests |
| `pnpm --filter web build` | 通过 | 0 | `tsc -b && vite build` |
| OpenAPI validate | 不适用 | 0 | 本 Wave 未改 OpenAPI YAML |
| 文档索引校验 | 通过 | 0 | `node scripts/generate-doc-inventory.mjs` 已生成 223 个 Markdown 条目，`check-doc-index` 收口执行 |

## 6. 权限与安全

- [x] 入口点击仍调用 `/open` 后再跳转；`launchOfficeEntry` 链路未绕过。
- [x] 普通用户仅看到既有接口返回的已发布可见入口；本 Wave 未放宽权限。
- [x] 管理员敏感操作有审计；治理台未改。
- [x] 文件下载 URL 有时效并继承记录权限；本 Wave 不涉及文件。
- [x] 重复提交、回调和自动生成具备幂等；本 Wave 不涉及。

## 7. 数据与迁移

- [x] migration `up()` 和 `down()` 已评审；本 Wave 未新增 migration。
- [x] migration 在 PostgreSQL 测试环境执行；本 Wave 不涉及。
- [x] 存量数据数量、关联和状态核对完成；仅前端分类和搜索状态修复。
- [x] 迁移重复执行或恢复策略已验证；本 Wave 不涉及。
- [x] 未使用 `synchronize: true`。

## 8. 前端与真机

- [ ] 企业微信工作台或消息深链可直达；Wave 5 统一真机回归。
- [ ] iOS 企业微信验证；未执行。
- [ ] Android 企业微信验证；未执行。
- [ ] 桌面企业微信验证；未执行。
- [x] 320px 及常见移动宽度无页面横向滚动；Chrome headless：320px 下 `scrollWidth=320`、`clientWidth=320`。
- [x] 加载、空态、错误、权限不足和重新认证完整；分类无结果展示空态，不出现异常空白。
- [x] 弱网和重复点击有正确反馈；打开入口按钮沿用既有 loading 状态。

## 9. 证据索引

### 规格

- `docs/prompts/m7/wave-2-office-css-search.md`
- `docs/requirements/M7-上线体验与导航修复.md`
- `docs/plans/M7-execplans.md`
- `docs/plans/M7-wave-backlog.md`
- `docs/requirements/M2-办事.md`
- `docs/specs/common/frontend-experience-guidelines.md`
- `docs/specs/office/ui/office-home-page.md`
- `docs/specs/office/ui/office-search-page.md`
- `docs/specs/office/state/office-slice.md`

### 代码

- `apps/web/src/features/office/OfficeHomePage.tsx`
- `apps/web/src/features/office/OfficeSearchPage.tsx`
- `apps/web/src/app/app.css`

### 测试

- `apps/web/src/features/office/OfficeHomePage.test.tsx`
- `apps/web/src/features/office/OfficeSearchPage.test.tsx`
- `apps/web/src/app/dashboardLayoutCss.test.ts`

### 迁移与运行

- 本 Wave 未新增 migration。
- 本地视觉验证服务：`VITE_MOCK_MODE=true ... pnpm --filter web dev -- --host 127.0.0.1 --port 5173`

### 截图或真机记录

- Chrome headless 1366x900：分类区高度 48，逐项切换无横向滚动，搜索输入外层 `box-shadow: none`。
- Chrome headless 320x740：分类区高度 180，逐项切换无横向滚动，`/office/search?keyword=海事&categoryCode=maritime` 输入框恢复“海事”。
- 未执行企业微信真机截图；Wave 5 补齐。

## 10. 缺陷与后续

| 编号 | 级别 | 描述 | 责任人 | 期限 | 状态 |
|---|---|---|---|---|---|
| `M7-W2-FU-01` | P2 | 企业微信真机截图未执行 | QA | Wave 5 | 待补 |

## 11. 复核签字

- 实施负责人：Codex
- 产品负责人：待填写
- QA：待填写
- 运维：待填写
