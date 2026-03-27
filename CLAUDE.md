# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

苏南船舶管理系统 (Sunan Ship Management System) — an enterprise WeChat (企业微信) H5 SPA for ship/vehicle certificate management, expiry reminders, procurement, and internal workflows. Currently in the **specification-driven development (SDD)** phase; no source code yet — only design docs, specs, and ADRs.

## Architecture

- **Frontend**: React 18 + Ant Design Pro 6 + Redux Toolkit (RTK Query) + React Router 6, built with Vite
- **Backend**: NestJS 10 on Node.js 20 LTS + TypeORM 0.3 + PostgreSQL 16 + Redis 7
- **Auth**: WeChat Work OAuth2 → JWT (passport-jwt)
- **File storage**: Alibaba Cloud OSS with presigned URL upload pattern
- **Scheduled tasks**: `@nestjs/schedule` for certificate expiry scanning (daily 09:00 cron)

Four business modules, delivered as milestones:

| Module | Route prefix | Milestone |
|---|---|---|
| 我的 (My) | `/my` | M1 |
| 办事 (Office) | `/office` | M2 |
| 采购管理 (Procurement) | `/procurement` | M3 |
| 工作平台 (Workbench) | `/workbench` | M4 |

## Development Methodology: SDD + TDD

**Spec first, tests second, implementation last.** Before writing any feature code:

1. Read the relevant spec docs under `docs/specs/{module}/`
2. Read `docs/specs/common/api-conventions.md` and `docs/specs/common/db-conventions.md`
3. Write tests based on specs (red phase)
4. Implement code to pass tests (green phase)
5. Refactor while keeping tests green

Spec types and locations:
- API specs: `docs/specs/{module}/api/*.yaml` (OpenAPI, validated with `swagger-cli validate`)
- DB specs: `docs/specs/{module}/db/*.md`
- State specs: `docs/specs/{module}/state/*.md`
- UI specs: `docs/specs/{module}/ui/*.md`
- Integration specs: `docs/specs/wecom/*.md`

**Do not deviate from spec-defined interfaces/field names.** If a spec is ambiguous, update the spec before implementing.

## Expected Commands (once source code exists)

```bash
# Package manager
pnpm install

# OpenAPI validation
swagger-cli validate docs/specs/my/api/certificate-api.yaml

# Mock server for frontend development
npx @stoplight/prism-cli mock docs/specs/my/api/certificate-api.yaml

# TypeScript type generation from OpenAPI
openapi-generator-cli generate -i docs/specs/my/api/certificate-api.yaml -g typescript-axios -o src/api/generated

# Testing
jest                          # all tests
jest --testPathPattern=<path> # single test file
vitest                        # frontend unit tests

# NestJS backend
nest start --watch            # dev server
npm run migration:run         # run DB migrations
```

## Key Conventions

- **API**: REST, versioned at `/api/v1`, JSON only, ISO 8601 timestamps with timezone, soft-delete via `deleted_at`
- **Responses**: `{ "data": ... }` for single resources; `{ "data": [...], "meta": { total, page, pageSize, totalPages } }` for lists
- **DB naming**: snake_case everywhere — tables are plural nouns, FKs are `{singular_table}_id`, indexes are `idx_{table}_{col}`
- **Primary keys**: UUID v4 (`gen_random_uuid()`), never auto-increment integers
- **Audit columns on every table**: `created_at`, `updated_at` (trigger-maintained), `deleted_at`, `created_by`, `updated_by`
- **Soft delete**: `deleted_at IS NULL` filter; unique constraints use partial indexes excluding deleted rows
- **Migrations**: TypeORM migrations with `up()`/`down()`; never `synchronize: true` in production
- **Seeds**: `src/database/seeds/`, idempotent with `INSERT ... ON CONFLICT DO NOTHING`
- **Mobile**: minimum viewport 375px, touch targets >= 44px

## Spec Document Status Tracking

Each module's `README.md` tracks spec status: 待编写 → 编写中 → 已评审 → 已实现 → 已废弃. M1 ("我的") specs are all complete.
