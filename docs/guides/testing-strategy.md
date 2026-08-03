---
status: current-source
owner: guides
updated: 2026-05-04
replaces: []
replaced_by: []
---
# 测试策略

## 分层

| 层级 | 工具 | 目标 |
|---|---|---|
| 规格校验 | `swagger-cli`、文档评审 | 确保契约可执行 |
| 单元测试 | Jest / Vitest | 规则与函数正确性 |
| 集成测试 | NestJS Testing + `@testcontainers/postgresql` | API + 数据库真实行为 |
| 组件测试 | React Testing Library | 页面交互与状态切换 |
| 手动测试 | QA 场景执行、真实设备验证 | 覆盖视觉、企微、打印、弱网等自动化盲区 |

## 里程碑 M1 重点

1. OAuth2 回调与 JWT 刷新
2. 证照 CRUD 与分组查询
3. 证书提醒生成与确认
4. 文件上传（presign/callback）

## 运行命令

```bash
pnpm --filter api test:unit
pnpm --filter api test:integration
pnpm --filter web test
```

## 约束

- 集成测试必须基于 migration（`synchronize: false`）。
- 修改 API 契约后需先更新测试，再更新实现。
- 影响提醒逻辑时必须覆盖边界日期测试。

## 手动测试补充

M1 "我的"模块的历史手动测试场景见 [qa-testing-my-module.md](./qa-testing-my-module.md)；执行时使用真实后端与真实认证。
