# ADR-003 NestJS + PostgreSQL

## 状态

`accepted`

## 背景

后端需要承载清晰模块边界、定时任务、企业微信集成和结构化业务数据。

## 决策

采用 NestJS 作为后端框架，PostgreSQL 作为主业务数据库，Redis 作为缓存和分布式协调组件。

## 影响

- 优点：模块化清晰，适合 SDD/TDD 驱动的接口与领域设计。
- 代价：需要明确 migration、事务和查询索引策略。
- 后续：所有表结构以 migration 为准，避免直接手改数据库。
