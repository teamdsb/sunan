---
status: current-spec
owner: my
updated: 2026-05-04
replaces: []
replaced_by: []
---
# "我的"模块前端状态总览

## 设计原则

1. 服务端数据优先使用 RTK Query 管理。
2. 本地瞬时 UI 状态仅在页面级组件保存，不进入全局 store。
3. 认证态与用户设置为跨页面共享状态，其余数据按模块分域拆分。

## Store 结构

```typescript
interface RootState {
  auth: AuthState;
  myUi: MyUiState;
  [authApi.reducerPath]: ReturnType<typeof authApi.reducer>;
  [enterpriseApi.reducerPath]: ReturnType<typeof enterpriseApi.reducer>;
  [certificateApi.reducerPath]: ReturnType<typeof certificateApi.reducer>;
  [reminderApi.reducerPath]: ReturnType<typeof reminderApi.reducer>;
  [monitorApi.reducerPath]: ReturnType<typeof monitorApi.reducer>;
  [settingsApi.reducerPath]: ReturnType<typeof settingsApi.reducer>;
}
```

## 切片边界

| 切片 | 类型 | 负责内容 |
|---|---|---|
| `auth` | reducer + RTK Query | 登录用户、鉴权状态、JS-SDK 初始化上下文 |
| `enterpriseApi` | RTK Query | 企业资料、企业制度查询与变更 |
| `certificateApi` | RTK Query | 电子证照、证书类型、附件绑定 |
| `reminderApi` | RTK Query | 提醒看板、提醒列表、确认、扫描 |
| `monitorApi` | RTK Query | 船舶监控入口 |
| `settingsApi` | RTK Query | 用户设置 |
| `myUi` | reducer | 首页入口排序、筛选栏展开状态等纯前端状态 |

## Tag 规划

| API Slice | Tags |
|---|---|
| `authApi` | `Auth`, `CurrentUser` |
| `enterpriseApi` | `EnterpriseProfile`, `EnterprisePolicy`, `PolicyVersion` |
| `certificateApi` | `Certificate`, `CertificateType` |
| `reminderApi` | `Reminder`, `ReminderDashboard` |
| `monitorApi` | `ShipMonitor` |
| `settingsApi` | `UserSettings` |

## 验收要求

1. 任一详情页更新后，列表页数据能自动失效刷新。
2. 路由切换后不丢失当前登录态和设置态。
3. 网络请求错误统一映射为 Ant Design `message` 或页面态。
