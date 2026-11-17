---
status: current-spec
owner: wecom
updated: 2026-11-17
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
| `wecom:app:{corpId}:{agentId}:v{configVersion}:access_token` | 字符串 | 应用与版本隔离的 access_token；认证主应用固定v0 |
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
    Key: wecom:refresh_lock:app:{corpId}:{agentId}:v{configVersion}:access_token
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

  // 获取通知配置快照的token；草稿使用独立cacheKey
  getAccessTokenForApp(config: WecomAppConfig): Promise<string>;
  forceRefreshForApp(config: WecomAppConfig): Promise<void>;

  // 清除主应用指定缓存（服务方法）
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

## M9 Wave 4 缓存与凭据恢复

当前 access token及刷新锁按CorpID、AgentID、配置版本隔离；主应用认证固定v0，清除通知覆盖后按新版本使用完整env主应用。草稿使用`wecom:app:{corpId}:{agentId}:draft:{randomId}:access_token`及对应锁，每次测试生成随机标识，不能命中线上Secret缓存。JS-SDK票据保持主应用专用键，不为通知应用请求ticket。

保存、清除、恢复或重新加密后通知版本递增，旧键不会再被新配置使用，并在7000秒TTL后自然过期。`42001`仅删除当前快照token键；不会清除其他版本或主应用v0。锁存随机owner，使用Lua比较owner后删除，不能释放另一实例的新锁。真实Redis双客户端测试覆盖并发刷新一次、企业/应用/版本/草稿隔离及锁所有权。

### 独立主密钥轮换步骤

1. 在受控位置分别备份数据库配置密文/版本/审计和旧密钥；密钥不写入仓库、不与数据库备份同处，不复用JWT或企微Secret。
2. 全部API/worker实例部署相同的新`SYSTEM_SETTINGS_ENCRYPTION_KEY`，把旧值临时放入`SYSTEM_SETTINGS_ENCRYPTION_KEY_PREVIOUS`，重载所有实例。新写入只用新密钥，旧密文可通过previous读取。
3. 管理员调用轮换接口或设置页“轮换加密密钥”。服务先认证解密，再用当前密钥重新加密，递增配置版本并记rotate审计；当前密钥密文也必须通过完整性校验，不能仅凭key ID当作成功。
4. 所有实例确认读取正常后，移除previous并重载。通过明确选定的测试人员做实际送达核对；连接成功本身不能代替这一步。
5. 恢复旧配置内容必须通过当前版本保存创建新版本，不回退版本号或删除投递去重记录。若恢复旧数据库快照，先停API/worker并保留最新版本/审计/投递，完成合并对账后再恢复；禁止直接用旧快照覆盖运行库。

密文格式为`v2:{keyId}:{iv}:{tag}:{ciphertext}`，AES-256-GCM、随机96位IV、128位tag，key ID为独立密钥SHA-256前16位十六进制；兼容最初v1密文以便重新加密。没有独立密钥且没有覆盖时主应用仍可用；已有覆盖无法解密则停止发送。新旧密钥可读与重新加密已由本地真实PostgreSQL验证；生产备份恢复与多机密钥分发未执行，见 [W4验收](../../acceptance/M9-wave-4.md)。
