---
status: acceptance-archive
owner: delivery
updated: 2026-07-06
replaces: []
replaced_by: []
---
# M7 Wave 4 验收记录：工作台返回、密度与导航锚点

## 1. 基本信息

- 里程碑：M7 上线体验与导航修复
- Wave：Wave 4 工作台返回、组件密度与导航锚点
- 验收日期：2026-07-06
- 验收环境：macOS，本地 Node v24.14.0，pnpm v11.7.0，Vite mock mode
- 提交或分支：`Fix-ding`
- 执行人：Codex
- 复核人：待人工复核

## 2. 验收结论

- 状态：有条件通过
- 未关闭 P0：无已知代码 P0；真机企业微信未执行
- 未关闭 P1：无已知代码 P1；缺少人工截图证据
- 条件项及期限：进入 Wave 5 前补企业微信 iOS/Android/桌面工作台直达、返回、锚点截图矩阵
- 后续建议：可进入 Wave 5

## 3. 导航目标映射

| 入口 | 目标 | 验收证据 |
|---|---|---|
| 工作平台首页 | `/workbench`，并执行 `window.scrollTo({ top: 0, left: 0 })` | `WorkbenchHomePage.test.tsx` |
| 海图更新 | `/workbench/modules/shipping_chart_update`，锚定并高亮海图更新模块卡 | `moduleNav.test.ts`、`WorkbenchHomePage.test.tsx` |
| 签到台 | `/workbench/modules/business_signin_desk`，锚定并高亮签到台模块卡 | `moduleNav.test.ts`、`WorkbenchHomePage.test.tsx` |
| 燃油加注审批 | `/workbench/modules/shipping_fuel_bunkering_approval` | `moduleNav.test.ts` |
| 考勤统计 | `/workbench/statistics/attendance` | `moduleNav.test.ts`、`WorkbenchHomePage.test.tsx` |
| 审批看板 | `/workbench/approvals` | `moduleNav.test.ts`、`WorkbenchHomePage.test.tsx` |

## 4. 已补返回路径

| 页面 | 返回目标 | 备注 |
|---|---|---|
| `/workbench/modules/:moduleCode` | `/workbench` | 直接从企业微信工作台进入模块页可返回首页 |
| `/workbench/records/:recordId` | `/workbench` | 记录深链页保留详情抽屉关闭逻辑，同时提供首页返回 |
| `/workbench/statistics/attendance` | `/workbench` | 考勤统计页可返回首页 |
| `/workbench/approvals` | `/workbench` | 审批看板可返回首页 |

## 5. 工作包状态

| 工作包 | 状态 | 证据 | 备注 |
|---|---|---|---|
| `M7-W4A` | 通过 | `WorkbenchHomePage.test.tsx` | 路由感知页显示“返回工作台首页” |
| `M7-W4B` | 通过 | `dashboardLayoutCss.test.ts` | 统计卡 96px、模块卡 118px、考勤卡 96px；模块按钮保留 44px |
| `M7-W4C` | 通过 | `moduleNav.test.ts` | 工作台首页、海图更新、签到台、燃油加注审批目标互不相同 |
| `M7-W4D` | 通过 | `moduleNav.test.ts` | 审批和考勤分别命中 `/workbench/approvals` 与 `/workbench/statistics/attendance` |
| `M7-W4E` | 通过 | `WorkbenchHomePage.test.tsx` | 首页回顶、模块锚定、模块高亮已覆盖 |

## 6. 自动化验证

| 命令 | 结果 | 失败数 | 证据 |
|---|---|---:|---|
| `pnpm --filter web test -- src/features/workbench/WorkbenchHomePage.test.tsx src/router/moduleNav.test.ts src/app/dashboardLayoutCss.test.ts src/app/navigationUiPolicy.test.ts` | 通过 | 0 | 实际执行整套 web 测试：53 files / 216 tests |
| `pnpm --filter web build` | 通过 | 0 | `tsc -b && vite build` |
| 文档索引校验 | 通过 | 0 | `generate-doc-inventory` 生成 225 个 Markdown 条目，`check-doc-index` 通过 |
| `git diff --check` | 通过 | 0 | 无空白或换行问题 |

## 7. 前端与真机

- [ ] 企业微信工作台或消息深链可直达；Wave 5 统一真机回归。
- [ ] iOS 企业微信验证；未执行。
- [ ] Android 企业微信验证；未执行。
- [ ] 桌面企业微信验证；未执行。
- [x] 工作台首页入口回到顶部；单测覆盖 `window.scrollTo({ top: 0, left: 0 })`。
- [x] 模块页直达后锚定对应模块卡；单测覆盖 `scrollIntoView({ block: 'center' })` 与 `is-selected`。
- [x] 组件密度收敛且不牺牲触控；CSS 测试覆盖卡片高度和 44px 按钮目标。

## 8. 证据索引

### 规格

- `docs/archive/prompts/m7/wave-4-workbench-navigation-density.md`
- `docs/requirements/M7-上线体验与导航修复.md`
- `docs/archive/execplans/M7-execplans.md`
- `docs/archive/backlogs/common/M7-wave-backlog.md`
- `docs/requirements/M4-工作平台.md`
- `docs/requirements/M6-全量兑现与完美上线.md`
- `docs/specs/common/frontend-experience-guidelines.md`
- `docs/specs/workbench/README.md`
- `docs/specs/workbench/ui/workbench-information-architecture.md`
- `docs/specs/workbench/ui/workbench-template-pages.md`
- `docs/specs/workbench/ui/workbench-department-modules.md`
- `docs/specs/workbench/state/workbench-shell.md`
- `docs/specs/workbench/db/workbench-module-matrix.md`

### 代码

- `apps/web/src/features/workbench/WorkbenchHomePage.tsx`
- `apps/web/src/router/moduleNav.ts`
- `apps/web/src/app/app.css`

### 测试

- `apps/web/src/features/workbench/WorkbenchHomePage.test.tsx`
- `apps/web/src/router/moduleNav.test.ts`
- `apps/web/src/app/dashboardLayoutCss.test.ts`
- `apps/web/src/app/navigationUiPolicy.test.ts`

## 9. 缺陷与后续

| 编号 | 级别 | 描述 | 责任人 | 期限 | 状态 |
|---|---|---|---|---|---|
| `M7-W4-FU-01` | P2 | 企业微信真机工作台直达、返回、锚点截图未执行 | QA | Wave 5 | 待补 |

## 10. 复核签字

- 实施负责人：Codex
- 产品负责人：待填写
- QA：待填写
- 运维：待填写
