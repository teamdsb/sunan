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

## Mock 模式

如需在本地跳过企微认证进行 M1 页面预览，可在前端环境中设置：

```bash
VITE_LOCAL_BYPASS_AUTH=true
```

开启后会自动注入本地预览用户，默认角色为 `all_authenticated + shipping`。

详细的 QA 启动步骤、限制说明与手动测试场景见 [qa-testing-my-module.md](./qa-testing-my-module.md)。

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
