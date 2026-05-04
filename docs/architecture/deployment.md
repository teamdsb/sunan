---
status: operations
owner: architecture
updated: 2026-05-04
replaces: []
replaced_by: []
---
# 部署架构

## 目标环境

系统以企业微信 H5 自建应用形式交付，生产环境建议拆分为以下层次：

1. 前端静态资源：部署到阿里云 OSS + CDN。
2. 后端 API：部署到可水平扩容的容器环境。
3. PostgreSQL：主备或高可用托管实例。
4. Redis：缓存企业微信令牌、短期会话和任务锁。
5. OSS：文件对象存储。
6. 日志与告警平台：聚合关键链路日志、告警与值班信息。

## 部署拓扑

```text
企业微信客户端
    ↓
CDN / WAF
    ↓
前端静态资源（React SPA）
    ↓
API 网关 / Nginx
    ↓
NestJS 服务
    ├── PostgreSQL
    ├── Redis
    ├── 阿里云 OSS
    ├── 日志 / 告警平台
    └── 企业微信开放平台
```

## 正式域名要求

- `WEB_PUBLIC_URL`：企业微信工作台首页、消息卡片链接、真机回归入口统一使用该地址。
- `API_PUBLIC_URL`：审批/消息回调、排障链接、发布文档统一使用该地址。
- 前端与 API 必须使用 HTTPS。
- OAuth2 回调域名、JS-SDK 域名、文件回调域名保持一致或在企业微信后台显式登记。

## 环境变量要求

生产环境至少维护以下配置：

- `WEB_PUBLIC_URL`
- `API_PUBLIC_URL`
- `WECOM_REDIRECT_URI`
- `WECOM_CALLBACK_TOKEN`
- `WECOM_ENCODING_AES_KEY`（启用加密回调时）
- `WECOM_CALLBACK_ALLOWED_IP_RANGES`
- `WECOM_SYSTEM_ADMIN_USER_IDS`
- `DB_*`
- `REDIS_*`
- `OSS_*`

## 发布策略

1. 前端使用版本化静态资源，避免企业微信 WebView 缓存导致灰度混乱。
2. 后端采用蓝绿或滚动发布，数据库迁移先执行再切流。
3. 定时任务仅允许单实例执行，可用 Redis 分布式锁控制。
4. 发布前必须执行数据库备份。
5. 发布后必须执行企业微信真实环境 smoke。

## 迁移与种子数据

- migration 必须先于切流执行。
- seed 只允许执行幂等初始化数据，不得覆盖生产业务数据。
- 涉及工作平台模块拆分的 migration 需单独演练并保留回滚策略。

## 回滚与恢复

- 回滚策略必须覆盖前端静态资源、后端版本、数据库恢复、企业微信后台配置回切。
- PostgreSQL 必须具备发布前备份和恢复演练记录。
- Redis 与 OSS 均采用最小权限凭据，并保留凭据轮换方案。

## 值班与联系人

上线窗口必须明确以下角色：

- 发布负责人
- 后端负责人
- 前端负责人
- 企业微信管理员
- DBA / 运维负责人
- 业务确认人

## Wave 4 交付引用

- 运维与告警基线：`docs/specs/common/operations-observability-m6.md`
- 上线切换步骤：`docs/specs/wecom/production-cutover-runbook.md`
- 上线材料清单：`docs/specs/wecom/go-live-materials-checklist.md`
