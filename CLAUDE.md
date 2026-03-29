# CLAUDE.md

This file provides guidance to Claude Code when working in this repository.

## Project Overview

Sunan is now an active monorepo with runnable source code:

- `apps/api`: NestJS + TypeORM + PostgreSQL + Redis
- `apps/web`: React + Vite + Ant Design
- `docs/`: architecture, specs, requirements, and guides

The project still follows SDD + TDD discipline: spec first, tests second, implementation last.

## Development Commands

```bash
pnpm install

# Infra
make db-up
make db-down
make db-reset

# Backend
make migration-run
make seed
make start-api
pnpm --filter api test:unit
pnpm --filter api test:integration

# Frontend
make dev
make build
make test-web
```

## API and DB Conventions

- API prefix: `/api/v1`
- Response envelope: `{ data }` or `{ data, meta }`
- Primary key: UUID (`gen_random_uuid()`)
- Soft delete: `deleted_at`
- Audit fields: `created_at`, `updated_at`, `created_by`, `updated_by`
- `updated_at` maintained by DB trigger
- Production-like schema changes must go through TypeORM migrations

## Testing Notes

- Integration tests run against PostgreSQL via `@testcontainers/postgresql`
- Keep integration tests migration-driven (`synchronize: false`)
- Run OpenAPI validation before reviewing API contract changes:

```bash
npx swagger-cli validate docs/specs/my/api/certificate-api.yaml
```
