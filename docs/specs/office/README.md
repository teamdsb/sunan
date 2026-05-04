---
status: current-index
owner: office
updated: 2026-05-04
replaces: []
replaced_by: []
---
# 办事模块规格（里程碑 M2）

## 模块定位

“办事”模块是企业微信工作台内的统一服务入口门户，负责集中承载办公端口目录、搜索访问、分类治理和基础审计能力。

## 规格文档清单

| 层次 | 文件 | 状态 |
|---|---|---|
| API | `api/office-entry-api.yaml` | 已实现 |
| API | `api/office-admin-api.yaml` | 已实现 |
| DB | `db/schema.md` | 已实现 |
| DB | `db/office-categories.md` | 已实现 |
| DB | `db/office-entries.md` | 已实现 |
| DB | `db/office-entry-audits.md` | 已实现 |
| State | `state/office-slice.md` | 已实现 |
| State | `state/office-admin-slice.md` | 已实现 |
| UI | `ui/page-map.md` | 已实现 |
| UI | `ui/office-home-page.md` | 已实现 |
| UI | `ui/office-search-page.md` | 已实现 |
| UI | `ui/office-admin-page.md` | 已实现 |

## 模块范围

办事板块用于集中展示办公端口，支持统一入口随进随用，包括：

- 海事端口
- 海关端口
- 边检端口
- 船检端口
- 环保端口
- 其他端口
- 石化园区端口

## 实现原则

- 仅开放固定七类办事分类，不支持前台新增分类。
- 员工只看到“已发布且自己有权限”的入口。
- 分类维护权固定绑定到角色，不做动态权限配置。
- 入口访问与治理动作均需具备最小审计能力。
- 企业微信上线约束复用 `docs/specs/wecom/` 下现有底座规格。

## Phase5 扩展映射（新增）

| 扩展项 | 规格映射 | 实现映射 |
|---|---|---|
| 壳层导航从单模块扩展为多模块导航 | `ui/page-map.md` | `apps/web/src/layouts/AppShell.tsx`、`apps/web/src/router/moduleNav.ts`、`apps/web/src/router/AppRoutes.tsx` |
| 新增 office 领域实体、接口、状态与页面 | `db/*`、`api/*`、`state/*`、`ui/*` | `apps/api/src/database/entities/office-*.entity.ts`、`apps/api/src/modules/office/*`、`apps/web/src/features/office/*` |
| 增加端口打开与治理审计 | `api/office-entry-api.yaml`、`api/office-admin-api.yaml`、`db/office-entry-audits.md`、`ui/office-admin-page.md` | `apps/api/src/modules/office/office.service.ts`、`apps/web/src/features/office/launchOfficeEntry.ts`、`apps/web/src/features/office/OfficeAdminPage.tsx` |
