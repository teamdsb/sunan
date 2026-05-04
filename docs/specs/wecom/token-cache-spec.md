---
status: current-spec
owner: wecom
updated: 2026-05-04
replaces: []
replaced_by: []
---
# 企业微信 Token 缓存规格

## 概述

企业微信 API 调用需要 `access_token`，其有效期为 7200 秒（2小时），且每日调用次数有限（约2000次）。本规格定义 Redis 缓存策略，避免频繁刷新导致超限。

## 需要缓存的 Token 类型

| Token 类型 | 获取接口 | 用途 | 有效期 |
|---|---|---|---|
| `access_token` | `GET /cgi-bin/gettoken` | 所有企业微信 API 调用 | 7200s |
| `corp_jsapi_ticket` | `GET /cgi-bin/get_jsapi_ticket` | wx.config 签名 | 7200s |
| `agent_jsapi_ticket` | `GET /cgi-bin/ticket/get?type=agent_config` | wx.agentConfig 签名 | 7200s |

## Redis 缓存 Key 设计

| Key | 格式 | 说明 |
|---|---|---|
| `wecom:access_token` | 字符串 | 企业 access_token |
| `wecom:corp_jsapi_ticket` | 字符串 | 企业级 jsapi_ticket |
| `wecom:agent_jsapi_ticket:{agentId}` | 字符串 | 应用级 jsapi_ticket |

## 缓存刷新策略

### 主动刷新（TTL 提前刷新）

- 缓存 TTL 设置为 **7000 秒**（比企业微信有效期短200秒，提供缓冲）
- Token 过期前自动刷新，使用**分布式锁**防止多实例竞争：

```
请求 Token
    │
    ↓
读取 Redis 缓存
    │
    ├── 缓存命中 ──→ 直接返回
    │
    └── 缓存未命中（过期）
            │
            ↓
    尝试获取分布式锁
    Key: wecom:refresh_lock:{token_type}
    TTL: 30s
            │
            ├── 获取锁成功 ──→ 调用企业微信 API
            │                      │
            │                  写入 Redis（TTL: 7000s）
            │                      │
            │                  释放锁
            │                      │
            │                  返回新 Token
            │
            └── 获取锁失败（其他实例正在刷新）
                    │
                    ↓
            等待 500ms 后重试读取缓存（最多3次）
                    │
                    ↓
                返回 Token（此时缓存已被其他实例写入）
```

## NestJS Service 接口规格

```typescript
// services/WecomTokenService

interface TokenCacheService {
  // 获取 access_token（自动处理缓存和刷新）
  getAccessToken(): Promise<string>;

  // 获取企业级 jsapi_ticket
  getCorpJsapiTicket(): Promise<string>;

  // 获取应用级 jsapi_ticket
  getAgentJsapiTicket(agentId: string): Promise<string>;

  // 强制刷新（管理员接口，用于紧急重置）
  forceRefresh(tokenType: 'access_token' | 'corp_ticket' | 'agent_ticket'): Promise<void>;
}
```

## 错误处理

| 情况 | 处理方式 |
|---|---|
| 企业微信 API 返回 `42001`（access_token 过期） | 立即清除缓存，重新获取 |
| 企业微信 API 返回 `45009`（API 调用次数超限） | 告警通知管理员，返回降级响应 |
| Redis 连接失败 | 直接调用企业微信 API（降级模式，不缓存），记录告警 |
| 分布式锁超时未释放 | 锁自动过期（TTL 30s），不会永久阻塞 |

## 环境变量

| 变量名 | 说明 |
|---|---|
| `REDIS_URL` | Redis 连接字符串（`redis://host:port`） |
| `REDIS_PASSWORD` | Redis 密码（可选） |
| `WECOM_CORP_ID` | 企业 CorpID（用于获取 access_token） |
| `WECOM_AGENT_SECRET` | 应用 Secret |
