---
status: current-index
owner: guides
updated: 2026-05-04
replaces: []
replaced_by: []
---
# 快速开始

## 环境要求

| 组件 | 建议版本 |
|---|---|
| Node.js | 20 LTS |
| pnpm | 9+ |
| Docker Desktop | 最新稳定版 |

## Quick Start

```bash
pnpm install

make db-up
make migration-run
make seed

make start-api
make dev
```

默认服务：

- API: `http://127.0.0.1:3000`
- Web: `http://127.0.0.1:5173`

## 本地联调

前端只使用真实后端和企业微信认证，不提供运行时 mock 或本地假用户。开始联调前需在 `apps/api/.env` 与 `apps/web/.env` 配置数据库、JWT、企业微信和 API 地址；企业微信 OAuth 与 JS-SDK 必须使用已登记的可信域名验证。

历史 M1 QA 场景见 [qa-testing-my-module.md](./qa-testing-my-module.md)，其中旧 mock 启动流程已停用。

M2 企业微信上线前检查项见 [wecom-dev-setup.md](./wecom-dev-setup.md) 中的「M2 上线检查清单（Wave4）」。

## 常用命令

```bash
make db-down
make db-reset
make test-api
make test-web
```

## 说明

- 后端 `.env` 由 `make ensure-api-env` 自动从 `apps/api/.env.example` 生成。
- 前端 `.env` 由 `make ensure-web-env` 自动从 `apps/web/.env.example` 生成。
