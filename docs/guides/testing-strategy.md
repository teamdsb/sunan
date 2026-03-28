# 测试策略

## 分层

| 层级 | 工具 | 目标 |
|---|---|---|
| 规格校验 | `swagger-cli`、文档评审 | 确保契约可执行 |
| 单元测试 | Jest / Vitest | 规则与函数正确性 |
| 集成测试 | NestJS Testing + `@testcontainers/postgresql` | API + 数据库真实行为 |
| 组件测试 | React Testing Library | 页面交互与状态切换 |

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
