# Repository Guidelines

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
