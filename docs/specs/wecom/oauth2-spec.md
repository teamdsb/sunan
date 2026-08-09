---
status: current-spec
owner: wecom
updated: 2026-08-10
replaces: []
replaced_by: []
---
# 企业微信 OAuth2 规格

## 概述

本系统使用企业微信 OAuth2 的敏感成员信息授权（`snsapi_privateinfo`）实现用户身份认证与头像同步。首次授权或授权状态变化时，企业微信可能要求成员确认头像等敏感字段；后续进入仍使用 OAuth 回调刷新系统登录资料。

## 认证流程

```
用户在企业微信打开应用 H5 页面
        │
        ↓
React SPA 初始化，检查 localStorage 中的 JWT
        │
        ├── JWT 有效 ──→ 直接进入应用
        │
        └── JWT 无效/不存在
                │
                ↓
        重定向到企业微信 OAuth2 授权页
        https://open.weixin.qq.com/connect/oauth2/authorize
          ?appid={CORPID}
          &redirect_uri={REDIRECT_URI}
          &response_type=code
          &scope=snsapi_privateinfo
          &state={STATE}
          &agentid={AGENTID}
          #wechat_redirect
                │
        企业微信颁发 code（静默，用户无感知）
                │
                ↓
        回调到 REDIRECT_URI?code={CODE}&state={STATE}
                │
                ↓
        前端提取 code，调用后端 /api/v1/auth/wecom/callback
                │
                ↓
        后端换取用户身份（UserId、短期 user_ticket）
                │
                ↓
        后端用 user_ticket 获取敏感成员资料（真实头像）
                │
                ↓
        生成 JWT，返回前端
                │
                ↓
        前端存储 JWT，跳转目标页面
```

## 后端接口规格

### GET /api/v1/auth/wecom/callback

OAuth2 回调接口，用 code 换取用户身份并签发 JWT。

**请求参数（Query）：**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `code` | string | 是 | 企业微信颁发的授权码，5分钟内有效 |
| `state` | string | 否 | 防 CSRF 的状态参数，须与发起时一致 |

**处理逻辑：**

1. 用 code 调用企业微信 API 获取 UserId：
   ```
   GET https://qyapi.weixin.qq.com/cgi-bin/auth/getuserinfo
     ?access_token={ACCESS_TOKEN}
     &code={CODE}
   ```
2. 用 UserId 调用企业微信通讯录 API 获取用户详情（姓名、部门 ID、职务）
3. 当 `getuserinfo` 返回 `user_ticket` 时，调用 `POST /cgi-bin/auth/getuserdetail` 获取真实头像；票据仅在本次请求中使用，不持久化、不记录日志
4. 以部门 ID 解析业务角色和数据范围，在 `wecom_users` 表中 upsert 用户信息；敏感头像授权暂时不可用时保留已有头像，不中断登录
5. 签发 JWT（payload 包含 userId、corpId、过期时间）
6. 返回 JWT、用户基本信息和本次敏感资料授权结果 `privateInfoAuthorized`

前端维护 `snsapi_privateinfo` 授权版本标记。已有 JWT 但缺少当前标记的旧会话在升级部署后自动重新授权一次。只有 `getuserdetail` 成功时才永久写入当前版本；缺少 `user_ticket` 或敏感接口失败时允许本次登录继续，并设置 24 小时重试冷却。冷却结束后的下一次受保护页面访问会再次发起授权，既避免立即 OAuth 循环，也避免一次失败后永久跳过头像获取；用户仍可通过“重新认证”立即重试。

**响应体：**

```json
{
  "data": {
    "accessToken": "eyJhbGc...",
    "expiresIn": 7200,
    "privateInfoAuthorized": true,
    "user": {
      "userId": "ZhangSan",
      "name": "张三",
      "avatar": "https://...",
      "departmentIds": [1, 3, 4],
      "department": ["公司成员", "总经办", "财务部"],
      "position": "总经理"
    }
  }
}
```

**错误情况：**
- `code` 已使用或过期：返回 `401 Unauthorized`
- 用户不在企业通讯录：返回 `403 Forbidden`
- 敏感头像授权未完成、成员不在应用可见范围或 `user_ticket` 已过期：认证继续，返回既有头像或首字回退，并返回 `privateInfoAuthorized: false` 触发限时重试

### POST /api/v1/auth/refresh

刷新 JWT。

**请求头：** `Authorization: Bearer <expired_or_valid_jwt>`

**响应体：** 返回新的 `accessToken` 和当前用户；刷新不重新调用敏感资料接口，也不改变浏览器授权版本标记。

### GET /api/v1/auth/me

获取当前登录用户信息（验证 JWT 有效性的同时返回用户资料）。

**响应体：**

```json
{
  "data": {
    "userId": "ZhangSan",
    "name": "张三",
    "avatar": "https://...",
    "departmentIds": [1, 3, 4],
    "department": ["公司成员", "总经办", "财务部"],
    "position": "总经理",
    "isAdmin": false
  }
}
```

### GET /api/v1/auth/jssdk/signature

生成当前页面 URL 的 JS-SDK 签名（见 `jssdk-spec.md`）。

## JWT 规格

| 字段 | 说明 |
|---|---|
| `sub` | 企业微信 UserId |
| `corpId` | 企业 CorpID |
| `name` | 用户姓名 |
| `iat` | 签发时间（Unix 时间戳） |
| `exp` | 过期时间（签发后 7200 秒） |

JWT 使用 HS256 算法，密钥通过环境变量 `JWT_SECRET` 注入。

## 前端实现要点

1. **存储位置**：JWT 存储于 `localStorage`（key: `sunan_token`）
2. **过期处理**：收到 `401` 响应时，清除本地 JWT，重新发起 OAuth2 授权
3. **state 防 CSRF**：发起授权前生成随机 state，存储于 `sessionStorage`，回调时验证
4. **redirect_uri 编码**：须对 `redirect_uri` 进行 `encodeURIComponent` 处理
5. **iOS 特殊处理**：iOS 企业微信中 `window.location.href` 可能不是当前 URL，需保存初始 URL

## 环境变量

| 变量名 | 说明 |
|---|---|
| `WECOM_CORP_ID` | 企业 CorpID |
| `WECOM_AGENT_ID` | 应用 AgentID |
| `WECOM_AGENT_SECRET` | 应用 Secret |
| `WECOM_REDIRECT_URI` | OAuth2 回调地址（须在企业微信后台配置） |
| `JWT_SECRET` | JWT 签名密钥（至少32字符随机字符串） |
| `JWT_EXPIRES_IN` | JWT 有效期（默认 `7200s`） |
| `WECOM_SYSTEM_ADMIN_USER_IDS` | 系统管理员的企业微信 UserID，逗号分隔；与部门无关 |

## 企业微信后台前置配置

1. 在自建应用详情中启用敏感字段“头像”。
2. 确保成员位于应用可见范围内，且网页授权可信域名与 `WECOM_REDIRECT_URI` 的域名匹配。
3. 发布本次变更后，让成员重新进入应用完成一次 `snsapi_privateinfo` 授权。

企业微信官方接口说明：[获取访问用户身份](https://developer.work.weixin.qq.com/document/path/96442)、[获取访问用户敏感信息](https://developer.work.weixin.qq.com/document/path/96443)。
