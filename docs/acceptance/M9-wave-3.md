---
status: current-source
owner: planning
updated: 2026-11-16
replaces: []
replaced_by: []
---
# M9 Wave 3 验收记录

## 1. 基本信息

- 里程碑：M9 平台管理与配置升级
- Wave：Wave 3 管理后台与全业务权限整合
- 验收日期：2026-11-16
- 验收环境：本地源码工作区；Node.js 24.22.1、pnpm 10.33.0；未连接可用 Docker/Testcontainers 运行时
- 提交或分支：工作树实现待提交；设计基线提交 `0f36650`
- 执行人：Codex
- 复核人：待指定

## 2. 验收结论

- 状态：`有条件通过`
- 未关闭 P0：真实 PostgreSQL/Testcontainers 集成验证；企业微信主应用完整可见范围核对；未登录成员同步、旧 token、本人变更后跨业务请求和真实收件人行为的现场证据。
- 未关闭 P1：桌面企业微信、iOS/Android H5 真机流程及 320px 现场记录。
- 条件项及期限：在可用集成数据库和企业微信测试租户中复跑 W3 验收场景并补充现场记录后，才能将本 Wave 标记为最终通过。

## 3. 工作包状态

| 工作包 | 状态 | 证据 | 备注 |
|---|---|---|---|
| `M9-W3A` | 已实现，条件验收 | `apps/web/src/features/settings/UserManagementPage.tsx`、`apps/web/src/features/settings/userDirectoryApi.ts`；API 用户目录 Controller/Service；前端构建与测试 | 列表、筛选、分页、详情、来源/生效对照、编辑预览、原因、乐观锁冲突、同步反馈、审计历史已接入 |
| `M9-W3B` | 已实现，条件验收 | `apps/web/src/layouts/AppShell.tsx`、`apps/web/src/app/baseApi.ts`；`baseApi.test.ts`（并发刷新、刷新后 403）；AppShell auth 测试 | 路由恢复、聚焦/可见性/重连刷新、业务 403 身份失效、`/auth/me` 403 清会话和缓存失效已接入，并对刷新请求与 OAuth 跳转去重；真实旧会话现场未执行 |
| `M9-W3C` | 已实现，条件验收 | `AuthorizationService`；采购、提醒、证照、企业资料/制度、计划任务、自查、学习选择器改动；角色解析回退测试；API 构建/单元测试 | 运行时统一使用有效部门/角色/可用状态；计划任务和证照提醒在实际发送前再次核验，真实业务请求和消息送达未执行 |
| `M9-W3D` | 已实现，条件验收 | 设置入口与 `/my/settings/users` 路由；H5 友好 Drawer/List 布局；前端测试/构建 | 空态、加载、错误、无权限、冲突恢复、影响预览已覆盖；真机和弱网证据未执行 |

## 4. 规格一致性

- [x] 需求、执行计划和 backlog 已读取并按 W3A-D 实施。
- [x] API 规格与 Controller/DTO/响应一致；管理 API 仍由 `system_admin` 门禁。
- [x] DB 规格沿用 W2 migration/entity；未新增本 Wave migration。
- [x] state 规格与有效授权、停用、来源更新和授权版本规则一致。
- [x] UI 规格与设置入口、路由、管理员只读资格和移动布局一致。
- [x] `docs/inventory.md` 已由脚本更新，文档索引校验通过。

## 5. 自动化验证

| 命令 | 结果 | 失败数 | 证据 |
|---|---|---:|---|
| `pnpm --filter api lint` | 通过 | 0 | ESLint 退出码 0 |
| `pnpm --filter api test:unit` | 通过 | 0 | 30 suites、162 tests |
| `pnpm --filter api test:integration` | 未执行完成 | 环境阻断 | 21 suites 在 Testcontainers 启动阶段失败，统一报 `Could not find a working container runtime strategy`，未进入业务断言 |
| `pnpm --filter web test` | 通过 | 0 | 60 files、271 tests |
| `pnpm --filter api build` | 通过 | 0 | Nest build 退出码 0 |
| `pnpm --filter web build` | 通过 | 0 | Vite build 退出码 0 |
| OpenAPI validate | 不适用 | - | 本 Wave 未修改 OpenAPI 生成/校验脚本；Controller/DTO 已由 TypeScript 编译覆盖 |
| `node scripts/generate-doc-inventory.mjs` | 通过 | 0 | 生成 `docs/inventory.md`，覆盖 283 个 Markdown 文件 |
| `node scripts/check-doc-index.mjs` | 通过 | 0 | `doc index ok: 283 markdown files` |
| `git diff --check` | 通过 | 0 | 无空白错误 |

## 6. 权限与安全

- [x] 管理列表、详情、编辑、同步和审计路由使用 `JwtAuthGuard + RolesGuard(system_admin)`。
- [x] env 管理员资格只读；后台不能授予/撤销 `system_admin`，也不能停用 env 管理员。
- [x] 来源同步只更新来源字段；人工部门、角色、平台状态、授权版本和审计不被来源覆盖。
- [x] 业务模块的部门范围、候选人和收件人改用 `AuthorizationService` 有效结果；历史任务/单据关系未转移。
- [ ] 真实企业微信可见范围、旧 token、跨页面权限和实际收件人仍需现场验证。

## 7. 数据与迁移

- [x] 本 Wave 未新增 migration；沿用 W2 的来源/覆盖/状态/版本/审计字段和部门字典。
- [x] 用户 UUID、业务外键、历史快照未改写；同步失败或名单缺失不自动视为离职。
- [ ] PostgreSQL 集成环境迁移、并发编辑、重复同步和乱序更新尚未在本环境验证，原因同上方 Testcontainers 阻断。

## 8. 前端与真机

- [x] 已有系统设置增加“用户管理”入口，路径为 `/my/settings/users`。
- [x] 桌面与 H5 使用同一列表/详情/编辑流程；Drawer、响应式栅格、空态、加载态、错误态、403 和冲突恢复已实现。
- [x] 前端单元测试和生产构建通过。
- [ ] 企业微信工作台深链、iOS、Android、桌面企业微信、320px 横向滚动、弱网和真实重复点击尚未执行现场记录。

## 9. 证据索引

### 规格

- `docs/requirements/M9-平台管理与配置升级.md`
- `docs/plans/M9-execplans.md`
- `docs/plans/M9-wave-backlog.md`
- `docs/superpowers/specs/2026-11-16-m9-wave3-admin-console-design.md`

### 代码

- `apps/api/src/modules/auth/authorization.service.ts`
- `apps/api/src/modules/user-directory/user-directory.controller.ts`
- `apps/api/src/modules/user-directory/user-directory.service.ts`
- `apps/web/src/features/settings/UserManagementPage.tsx`
- `apps/web/src/features/settings/userDirectoryApi.ts`
- `apps/web/src/app/baseApi.ts`
- `apps/web/src/layouts/AppShell.tsx`

### 测试

- `apps/api/src/modules/auth/authorization.service.spec.ts`
- `apps/api/src/modules/user-directory/user-directory.service.spec.ts`
- `apps/web/src/app/baseApi.test.ts`
- `apps/web/src/layouts/AppShell.auth.test.tsx`
- 本记录第 5 节命令结果

### 迁移与运行

- W2 migration/entity 与 `wecom_users`、`wecom_departments`、同步批次和审计表沿用；本 Wave 未添加 migration。
- 集成测试受无可用容器运行时阻断，未执行数据库对账。

### 截图或真机记录

- 本 Wave 未取得企业微信或真机截图；待集成环境和测试租户准备后补录。

## 10. 缺陷与后续

| 编号 | 级别 | 描述 | 责任人 | 期限 | 状态 |
|---|---|---|---|---|---|
| M9-W3-ENV-01 | P0 | 无可用 Testcontainers/Docker 运行时，未完成真实事务、并发和集成回归 | 待指定 | 下一验收窗口 | 未关闭 |
| M9-W3-FIELD-01 | P0 | 未完成企业微信全目录可见范围、未登录成员、旧 token、本人变更和真实收件人现场证据 | 待指定 | 测试租户可用后 | 未关闭 |
| M9-W3-H5-01 | P1 | 未完成 iOS/Android/桌面企业微信及 320px、弱网现场验证 | 待指定 | 测试设备可用后 | 未关闭 |

## 11. 复核签字

- 实施负责人：待指定
- 产品负责人：待指定
- QA：待指定
- 运维：待指定
