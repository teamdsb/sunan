---
status: current-source
owner: architecture
updated: 2026-05-04
replaces: []
replaced_by: []
---
# 技术选型与版本锁定

## 第一期技术栈（里程碑 1-4）

### 前端

| 技术 | 版本要求 | 用途 |
|---|---|---|
| React | ^18.x | 核心 UI 框架 |
| Ant Design Pro | ^6.x | 管理后台 UI 框架，含 ProComponents |
| Ant Design | ^5.x | 基础组件库（随 Ant Design Pro 依赖） |
| Redux Toolkit | ^2.x | 状态管理，含 RTK Query |
| React Router | ^6.x | 前端路由 |
| TypeScript | ^5.x | 类型安全 |
| Vite | ^5.x | 构建工具 |
| Axios | ^1.x | HTTP 客户端（RTK Query baseQuery 底层） |

### 后端

| 技术 | 版本要求 | 用途 |
|---|---|---|
| NestJS | ^10.x | 后端框架 |
| Node.js | ^20.x LTS | 运行时 |
| TypeScript | ^5.x | 类型安全 |
| TypeORM | ^0.3.x | ORM，对接 PostgreSQL |
| class-validator | ^0.14.x | DTO 校验 |
| class-transformer | ^0.5.x | 对象序列化 |
| @nestjs/schedule | ^4.x | 定时任务（证书到期扫描） |
| passport-jwt | ^4.x | JWT 认证策略 |

### 数据存储

| 技术 | 版本要求 | 用途 |
|---|---|---|
| PostgreSQL | ^16.x | 主数据库 |
| Redis | ^7.x | access_token 缓存、会话、队列 |
| 阿里云 OSS | — | 文件存储（证书、附件、图片） |

### 第三方集成

| 服务 | SDK / 接入方式 | 用途 |
|---|---|---|
| 企业微信 | REST API + JS-SDK | 身份认证、消息推送、原生能力 |
| 阿里云 OSS | ali-oss ^6.x | 文件上传下载（预签名 URL 模式） |

### 开发工具

| 工具 | 用途 |
|---|---|
| ESLint + Prettier | 代码规范 |
| Jest | 单元测试 / 集成测试 |
| React Testing Library | 组件测试 |
| Supertest | NestJS API 集成测试 |
| swagger-cli | OpenAPI YAML 校验 |
| @openapitools/openapi-generator-cli | 从 OpenAPI 生成 TypeScript 类型 |

## 版本锁定策略

- 使用 `^` 语义版本，允许 minor 和 patch 更新
- 主要版本升级需经过 ADR 评审
- `package-lock.json` / `yarn.lock` 提交到版本控制
- 依赖审计：每季度运行 `npm audit`

## 端适配策略

本系统部署于企业微信工作台（H5 自建应用），需同时支持：

- **桌面端企业微信**（Windows/Mac 客户端、网页版）：使用 Ant Design Pro 原生布局
- **移动端企业微信**（iOS/Android 手机客户端）：通过 Ant Design Pro 响应式网格适配

移动端适配要求：
- 页面最小可用宽度：375px
- 触控友好的交互元素（最小点击区域 44px）
- 关键页面（证照详情、提醒看板）需专项移动端测试
