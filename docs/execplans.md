# M1 执行计划（历史归档）

> M1 实现已完成（2026-03-28），本文档为历史参考。

## Wave 状态

### Wave 1
- [x] WS-1A 后端脚手架与认证
- [x] WS-1B 前端脚手架与认证

### Wave 2
- [x] WS-2A 文件服务与引用数据
- [x] WS-2B 前端文件上传组件

### Wave 3
- [x] WS-3A 企业资料
- [x] WS-3B 企业制度
- [x] WS-3C 电子证照
- [x] WS-3D 消息推送/船舶监控/设置
- [x] WS-3E 前端资料与制度页面
- [x] WS-3F 前端证照/监控/设置页面

### Wave 4
- [x] WS-4A 证书提醒引擎
- [x] WS-4B 提醒看板与路由整合

## Phase 5（补强）

### Phase 5.1 数据库对接
- [x] 引入 `docker-compose.yml`（PostgreSQL + Redis）
- [x] 初始化 `pgcrypto` 扩展
- [x] Makefile 增加 `db-*`、`migration-run`、`seed`、`start-api`
- [x] 增加 `run-seed.ts`（船舶/车辆/证书类型幂等写入）

### Phase 5.2 集成测试迁移
- [x] 新增 `apps/api/test/pg-test-container.ts`
- [x] 8 个集成测试从 `sqljs` 迁移到 PostgreSQL testcontainers
- [x] 集成测试改为 migration 驱动（非 synchronize）
- [x] 清理实体中的 `NODE_ENV === test` 类型分支
- [x] `apps/api/package.json` 移除 `sql.js` 并新增 `seed` 脚本
- [x] `jest.integration.config.ts` 设置 `maxWorkers: 1`
- [x] `test/setup.ts` 超时提升到 `120_000`

### Phase 5.3 验证与文档
- [x] 文档更新：`CLAUDE.md`、`AGENTS.md`、`docs/specs/my/README.md`
- [x] 指南更新：`docs/guides/getting-started.md`、`docs/guides/testing-strategy.md`
