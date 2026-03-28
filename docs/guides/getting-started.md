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
