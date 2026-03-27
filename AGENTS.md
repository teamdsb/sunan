# Repository Guidelines

## Project Structure & Module Organization

This repository is document-first. Core materials live under `docs/`:

- `docs/architecture/`: system overview, deployment, security, and tech stack.
- `docs/guides/`: workflow and contributor guidance such as `sdd-workflow.md`, `testing-strategy.md`, and setup notes.
- `docs/requirements/`: milestone-level requirement documents.
- `docs/specs/`: implementation contracts by domain. Current domains include `common/`, `wecom/`, `my/`, plus placeholder modules `office/`, `procurement/`, and `workbench/`.

Keep new specs close to their domain, for example `docs/specs/my/api/` or `docs/specs/common/`.

## Build, Test, and Development Commands

There is no application build system checked into this repo yet. Use lightweight validation commands while editing specs:

- `npx swagger-cli validate docs/specs/my/api/certificate-api.yaml`: validate an OpenAPI file before review.
- `npx @stoplight/prism-cli mock docs/specs/my/api/certificate-api.yaml`: run a mock server from an API contract.
- `git diff -- docs/`: review doc-only changes before committing.

Follow the workflow in `docs/guides/sdd-workflow.md`: spec first, tests second, implementation last.

## Coding Style & Naming Conventions

Write concise Markdown with clear headings and short sections. Match the existing directory language and naming style: Chinese filenames are acceptable in requirements, while shared specs use lowercase English kebab-case such as `api-conventions.md`.

Use fenced code blocks for commands and examples. Prefer stable, explicit paths like `docs/specs/wecom/oauth2-spec.md` when cross-referencing. Do not rename or reshuffle spec folders without updating all references.

## Testing Guidelines

For this repo, testing primarily means contract validation and reviewability:

- Validate OpenAPI specs before merging.
- Check that updated specs still align with `docs/specs/common/api-conventions.md` and `docs/specs/common/db-conventions.md`.
- When a spec changes, update related testing notes and downstream implementation expectations in the same PR.

## Commit & Pull Request Guidelines

Recent history uses short, scope-first commit subjects, often in Chinese, such as `SPEC架构&me` and `需求文档与忽略`. Keep commits focused and descriptive.

PRs should summarize the changed domain, list affected files, and explain downstream impact. Link the related requirement or milestone document. Include screenshots only when the change alters UI flows or rendered mock outputs.
