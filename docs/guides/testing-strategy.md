---
status: current-source
owner: guides
updated: 2026-09-07
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

## 主要链路验证重点

1. OAuth2 回调与 JWT 刷新
2. 证照 CRUD 与分组查询
3. 证书提醒生成与确认
4. 文件上传（presign/callback）
5. 采购申报、审批、部门及船舶维度报表、打印
6. 工作平台任务流转、整改证据、考勤导出与审批回写

## 运行命令

```bash
pnpm --filter api test:unit
pnpm --filter api test:integration
pnpm --filter web test
```

## 约束

- 按风险选择最小验证范围，不要求每次修改同时触及单元、集成、组件测试。默认保留权限、状态、金额/日期、并发、事务和文件内容等会造成实际业务错误的断言。
- 接口与数据库行为优先由所属领域的集成测试覆盖，不在各层重复证明同一规则；纯样式、重复文案、源码形状断言可删除，Git 保留历史。不通过移动到跳过目录来制造通过率。
- `apps/api/test` 是隔离外部服务的 PostgreSQL 集成测试，不是真实企业微信端到端验收。局部改动可用 `pnpm --filter api test:integration --runTestsByPath test/<领域>.integration.spec.ts`；前端可指定测试文件。全量回归用于跨域改动或发布前检查。
- 集成测试必须基于 migration（`synchronize: false`）。
- 修改 API 契约后校验受影响的规格，并按实际行为和风险补充必要测试。
- 测试数量和现有用例通过不能证明原始目标已全部实现；对照原件核查关键结果。
- 影响提醒逻辑时必须覆盖边界日期测试。

## 手动测试补充

M1 "我的"模块的历史手动测试场景见 [qa-testing-my-module.md](./qa-testing-my-module.md)；执行时使用真实后端与真实认证。
