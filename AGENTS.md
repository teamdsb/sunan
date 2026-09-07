# 仓库指南

## 项目简介

苏南船舶管理系统，以企业微信工作台和 H5 页面为主要使用入口，包含我的、办事、采购管理和工作平台。仓库另有安全管理实现与规格；M9 专业安全深化处于暂停状态。

项目采用 pnpm 管理的单体仓库（monorepo）：后端为 NestJS、TypeORM、PostgreSQL 和 Redis，前端为 React、Vite 和 Ant Design。

## 项目导航与常用命令

| 内容 | 路径 |
|---|---|
| 后端源码、集成测试 | `apps/api/src`、`apps/api/test` |
| 前端源码与测试 | `apps/web/src` |
| 文档导航、完整清单 | `docs/README.md`、`docs/inventory.md` |
| 原始目标核查与差异 | `docs/audits/2026-09-07-original-goal-audit.md` |
| 仓库现有需求整理 | `docs/需求文档.md`、`docs/requirements/` |
| 架构与部署 | `docs/architecture/` |
| 本地启动、测试说明 | `docs/guides/getting-started.md`、`docs/guides/testing-strategy.md` |
| 我的、办事、采购、工作平台规格 | `docs/specs/my/`、`docs/specs/office/`、`docs/specs/procurement/`、`docs/specs/workbench/` |
| 通用接口、数据库、认证、前端体验 | `docs/specs/common/README.md` |
| 企业微信集成 | `docs/specs/wecom/README.md` |
| 安全管理规格、里程碑状态 | `docs/specs/safety/README.md`、`docs/execplans.md` |
| 操作手册 | `docs/handbook/苏南船舶管理系统操作手册.md` |

领域规格按 `api/`、`db/`、`state/`、`ui/` 组织；历史材料位于 `docs/archive/`。生成目录 `apps/web/dist-review-no-mock` 不是源码。

| 操作 | 命令 |
|---|---|
| 安装依赖 | `pnpm install` |
| 启停 PostgreSQL / Redis | `make db-up` / `make db-down` |
| 重建数据库（清空数据） | `make db-reset` |
| 数据迁移、初始化数据 | `make migration-run`、`make seed` |
| 启动后端、前端 | `make start-api`、`make dev` |
| 构建前后端 | `pnpm build` |
| 后端单元、集成测试 | `pnpm test:unit`、`pnpm test:integration` |
| 前端测试 | `make test-web` |
| 更新文档清单、校验索引 | `node scripts/generate-doc-inventory.mjs`、`node scripts/check-doc-index.mjs` |

## 工作约定

### 解释代码

使用通俗语言，避免堆砌术语；仅在有助于向用户说明思路或工作内容时引用技术细节。清晰、连贯地解释复杂概念，并根据用户的问题和上下文调整表达，使其符合用户已有的背景知识。

### 测试

对于可逆、影响较小的改动，不要编写只是复刻实现的测试。如果决定使用测试验证工作，应确保测试有实际意义，且确实是验证实现所必需的。

运行与改动相适应的测试，并完成必要检查。检查通过后，只有新增改动、测试失败或尚未解决的问题确实需要时，才扩大或重复测试；否则继续推进任务直至完成。
