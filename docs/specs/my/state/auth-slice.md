# `auth` 状态规格

## 目标

统一管理企业微信 OAuth2 登录结果、JWT 生命周期、当前用户信息和 JS-SDK 签名状态。

## 状态结构

```typescript
interface AuthState {
  token: string | null;
  tokenExpiresAt: string | null;
  currentUser: {
    userId: string;
    name: string;
    avatar?: string;
    department: string[];
    position?: string;
    roles: string[];
  } | null;
  authStatus: 'idle' | 'authorizing' | 'authenticated' | 'unauthenticated';
  jssdkStatus: 'idle' | 'loading' | 'ready' | 'failed';
}
```

## RTK Query 端点

| 端点 | 用途 |
|---|---|
| `getCurrentUser` | 调用 `GET /auth/me` 获取当前用户 |
| `refreshToken` | 调用 `POST /auth/refresh` 刷新令牌 |
| `getJssdkSignature` | 调用 `GET /auth/jssdk/signature` 获取签名 |

## 行为规则

1. App 初始化优先读取 `localStorage.sunan_token`。
2. `401` 响应触发一次静默刷新；刷新失败后清空状态并重走 OAuth2。
3. JS-SDK 签名按页面 URL 缓存，路由变化后在需要企业微信能力的页面重新获取。

## 测试关注点

- JWT 过期后的自动刷新路径
- `state` 校验失败时的回退路径
- `wx.config` 失败后的页面降级展示
