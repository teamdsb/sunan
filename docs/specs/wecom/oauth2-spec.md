---
status: current-spec
owner: wecom
updated: 2026-05-04
replaces: []
replaced_by: []
---
# 企业微信 OAuth2 规格

## 概述

本系统使用企业微信 OAuth2 静默授权（`snsapi_base`）实现用户身份认证。用户在企业微信内打开应用时，系统自动获取其 UserId，无需用户手动登录。

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
          &scope=snsapi_base
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
        后端换取用户身份（UserId）
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
2. 用 UserId 调用企业微信通讯录 API 获取用户详情（姓名、头像、部门 ID、职务）
3. 以部门 ID 解析业务角色和数据范围，在 `wecom_users` 表中 upsert 用户信息
4. 签发 JWT（payload 包含 userId、corpId、过期时间）
5. 返回 JWT 和用户基本信息

**响应体：**

```json
{
  "data": {
    "accessToken": "eyJhbGc...",
    "expiresIn": 7200,
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

### POST /api/v1/auth/refresh

刷新 JWT。

**请求头：** `Authorization: Bearer <expired_or_valid_jwt>`

**响应体：** 同上，返回新的 `accessToken`

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
