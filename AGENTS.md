---
status: current-index
owner: repository
updated: 2026-06-13
replaces: []
replaced_by: []
---
# Repository Guidelines

## Repository Index

Use this index to choose the right entry point before editing code or specs.

### Code Entry Points

| Area | Path | Purpose |
|---|---|---|
| Backend | `apps/api/src` | NestJS modules, TypeORM entities, migrations-facing service logic |
| Backend tests | `apps/api/test` | API integration and regression coverage |
| Frontend | `apps/web/src` | React + Vite app, routes, features, state, UI |
| Frontend build artifacts | `apps/web/dist-review-no-mock` | Generated review artifact; do not treat as source of truth |

### Documentation Entry Points

| Need | Start here | Then check |
|---|---|---|
| Documentation navigation | `docs/README.md` | Use `docs/inventory.md` for the complete Markdown list |
| Product baseline | `docs/需求文档.md` | `docs/glossary.md`, `docs/requirements/` |
| Current execution plans | `docs/execplans.md` | `docs/plans/README.md`, then `docs/prompts/README.md`; M1-M6 history is under `docs/archive/execplans/` |
| Architecture | `docs/architecture/overview.md` | `docs/architecture/tech-stack.md`, `docs/architecture/security.md`, `docs/architecture/deployment.md`, `docs/architecture/adr/` |
| Local setup and workflow | `docs/guides/getting-started.md` | `docs/guides/sdd-workflow.md`, `docs/guides/testing-strategy.md`, `docs/guides/wecom-dev-setup.md` |
| Cross-domain API/DB/auth rules | `docs/specs/common/README.md` | `api-conventions.md`, `db-conventions.md`, `auth-spec.md`, `file-upload-spec.md`, `notification-spec.md` |
| Enterprise WeCom integration | `docs/specs/wecom/README.md` | OAuth2, JS-SDK, callbacks, token cache, approval bridge, production cutover docs |

### Domain Spec Index

| Milestone | Domain | Requirement | Spec entry point | Spec layers |
|---|---|---|---|---|
| M1 | 我的 | `docs/requirements/M1-我的.md` | `docs/specs/my/README.md` | `api/`, `db/`, `state/`, `ui/` |
| M2 | 办事 | `docs/requirements/M2-办事.md` | `docs/specs/office/README.md` | `api/`, `db/`, `state/`, `ui/` |
| M3 | 采购管理 | `docs/requirements/M3-采购管理.md` | `docs/specs/procurement/README.md` | `api/`, `db/`, `state/`, `ui/` |
| M4-M6 | 工作平台 | `docs/requirements/M4-工作平台.md`, `docs/requirements/M6-全量兑现与完美上线.md` | `docs/specs/workbench/README.md` | `api/`, `db/`, `state/`, `ui/` |
| M5-M6 | 上线强化与收口 | `docs/requirements/M5-上线强化与遗留收口.md`, `docs/archive/audits/M6-逐条需求对照表.md` | `docs/specs/common/README.md`, `docs/specs/wecom/README.md` | acceptance, quality gates, go-live, observability |
| M7 | 上线体验与导航修复（已归档） | `docs/requirements/M7-上线体验与导航修复.md` | `docs/archive/execplans/M7-execplans.md` | 历史计划、backlog、提示词与验收证据 |
| M8-M9 | 安全管理数字化（M8 已归档、M9 已暂停） | `docs/requirements/M8-安全管理底座与核心闭环.md`, `docs/requirements/M9-专业安全业务深化与体系完善.md` | `docs/specs/safety/README.md` | M8 当前实现规格；M8 历史验收；M9 暂停包 |
| Cross-cutting | 非功能需求 | `docs/requirements/非功能需求.md` | `docs/specs/common/README.md` | security, testing, operations, conventions |

### Change Navigation Rules

- For API changes, start from the domain `docs/specs/<domain>/api/*.yaml`, then verify `docs/specs/common/api-conventions.md`.
- For persistence changes, start from the domain `docs/specs/<domain>/db/*.md`, then verify `docs/specs/common/db-conventions.md`.
- For UI or state changes, read the domain `ui/` page map and matching `state/` slice spec before changing `apps/web/src`.
- For WeCom, approval, callback, token, or production cutover work, check `docs/specs/wecom/README.md` before implementation.
- For safety work, start from `docs/execplans.md`; M8 history is archived and M9 must not resume until the user explicitly reactivates its paused package.
- Treat `docs/inventory.md` as the Markdown inventory; if a document is marked `historical-archive`, `acceptance-archive`, `audit-snapshot`, or `superseded`, do not use it as a current implementation source without checking the listed replacement.
- When adding a new spec, update the nearest domain `README.md` and `docs/inventory.md`; update `docs/README.md` or this index only when adding a new top-level domain, milestone, or primary entry point.

## Project Structure & Module Organization

Core materials:

- `apps/api`: backend service (NestJS + TypeORM)
- `apps/web`: frontend application (React + Vite)
- `docs/architecture`: architecture and technical decisions
- `docs/guides`: setup, workflow, testing strategy
- `docs/requirements`: milestone requirements
- `docs/specs`: API/DB/UI/state specs by domain

Keep new specs in their domain folder, such as `docs/specs/my/api/`.

## Build, Test, and Development Commands

Use the following commands as defaults:

- `pnpm install`
- `make db-up` / `make db-down` / `make db-reset`
- `make migration-run`
- `make seed`
- `make start-api`
- `make dev`
- `make test-api`
- `make test-web`

Useful contract tooling:

- `npx swagger-cli validate docs/specs/my/api/certificate-api.yaml`
- `npx @stoplight/prism-cli mock docs/specs/my/api/certificate-api.yaml`

## Coding Style & Naming Conventions

- Keep Markdown concise and structured.
- Shared specs use lowercase kebab-case English file names.
- Chinese file names are acceptable for requirements and business docs.
- Use explicit absolute or repo-root-relative paths when cross-referencing.

## Enterprise WeCom Product Context

- Treat Enterprise WeCom as the primary runtime container and interaction frame for the whole product, not as a secondary login option layered onto a standalone web app.
- Workbench entries should behave as independent deep links into their target capabilities. Product flows, routing, auth recovery, state initialization, notifications, file handling, and error states should all remain correct when a user enters directly from a WeCom workbench application.
- Do not assume a user naturally starts at `/my` or moves through a broad in-app navigation tree before reaching a task. Internal navigation can exist, but core workflows should be designed around WeCom entry points and short task-oriented sessions.
- Do not let `/my` or another module home eagerly import unrelated business domains. Route-level chunks should follow the workbench entry a user opens, so certificate, office, procurement, workbench, and settings pages can load on demand.
- When adding cross-module interactions, check whether the behavior belongs inside the H5 app, the WeCom workbench, a WeCom message/notification, or a backend integration. Avoid web-only assumptions that conflict with Enterprise WeCom constraints, mobile H5 ergonomics, JS-SDK capabilities, OAuth recovery, or direct-entry performance.
- For detailed frontend experience, interaction, visual baseline, and performance acceptance rules, use `docs/specs/common/frontend-experience-guidelines.md`.

## Testing Guidelines

- Validate OpenAPI specs before merge.
- Keep implementation aligned with:
  - `docs/specs/common/api-conventions.md`
  - `docs/specs/common/db-conventions.md`
- For backend integration tests, use PostgreSQL testcontainers, not SQLite emulation.

## Commit & Pull Request Guidelines

- Use focused, scope-first commit messages.
- PR descriptions should include:
  - changed domain/module
  - key file list
  - downstream impact
  - linked requirement/milestone docs
