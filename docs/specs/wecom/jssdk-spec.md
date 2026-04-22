# 企业微信 JS-SDK 规格（M6）

## 1. 文档定位

本规格定义 M6 的企业微信 JS-SDK 目标态、兼容态和迁移策略。M1-M5 已按旧版 `window.wx + wx.config + wx.agentConfig` 方式接入；M6 的目标是：

- 按企业微信当前官方推荐接入方式规划：`@wecom/jssdk` + `ww.register`
- 保留 legacy adapter，允许逐模块灰度兼容旧 `window.wx` 方案
- 将 JS-SDK 从“能用”升级为“可灰度、可回退、可真机验证、可排障”的正式发布能力

官方依据：

- 开始使用：<https://developer.work.weixin.qq.com/document/path/90514>
- JS-SDK 签名算法：<https://developer.work.weixin.qq.com/document/path/90539>

## 2. 当前现状

### 2.1 当前代码现状

前端当前代码仍以旧接入方式为主：

- `apps/web/src/hooks/useWecomJsSdk.ts`
- 通过后端 `GET /api/v1/auth/jssdk/signature`
- 依次执行 `wx.config -> wx.ready -> wx.agentConfig`

该方案在 M1-M5 已可支撑拍照上传、文件预览等能力，但不应继续作为 M6 的目标态规格。

### 2.2 M6 目标判断

- 目标态：`@wecom/jssdk` + `ww.register`
- 兼容态：legacy adapter 包装旧 `window.wx`
- 禁止把旧方案继续写成最终目标架构

## 3. 目标架构

### 3.1 接入分层

M6 前端 JS-SDK 分三层：

1. `signature client`
   - 负责向后端请求企业级签名与应用级签名
2. `wecom sdk adapter`
   - 统一封装 `ww.register`、`ww.invoke`、`ww.on`
   - 提供 legacy adapter 兼容旧 `window.wx`
3. `feature hooks`
   - 供上传、预览、拍照、审批辅助等业务页面调用

### 3.2 推荐 SDK

优先使用：

```ts
import * as ww from '@wecom/jssdk';
```

推荐注册方式：

```ts
await ww.register({
  corpId,
  agentId,
  jsApiList,
  getConfigSignature,
  getAgentConfigSignature,
});
```

说明：

- 具体参数结构以官方 SDK 当前版本为准。
- M6 规格只冻结“使用 `ww.register` 作为目标态”的原则，不把旧 `wx.ready` 链继续作为默认模型。

## 4. 签名接口

### 4.1 后端接口保持不变

继续复用：

- `GET /api/v1/auth/jssdk/signature`

请求参数：

| 参数 | 类型 | 说明 |
|---|---|---|
| `url` | string | 需签名的页面 URL |
| `type` | `corp` \| `agent` | 企业级或应用级签名 |

### 4.2 签名算法

后端仍按官方签名算法执行：

1. 获取 `jsapi_ticket`
2. 准备 `noncestr`、`timestamp`、`url`
3. 按以下格式拼接：
   `jsapi_ticket={ticket}&noncestr={nonceStr}&timestamp={timestamp}&url={url}`
4. 计算 SHA1 签名

说明：

- `url` 不包含 `#` 及其后部分。
- iOS/Android 对签名 URL 的取值规则必须显式区分。

## 5. URL 与平台差异

### 5.1 iOS

- 使用应用首次加载时的 URL 作为签名 URL。
- SPA 路由切换后，不重新改写 iOS 侧签名基准 URL。

### 5.2 Android

- 使用当前页面 URL 作为签名 URL。

### 5.3 统一约束

- 必须在适配器层统一实现 URL 选择逻辑。
- 页面业务代码不得自行拼装签名 URL。

## 6. 灰度与回退策略

### 6.1 目标态

- 默认优先尝试 `ww.register`
- 成功后对外暴露统一 `invoke` / `on` / `previewFile` / `chooseImage` / `uploadImage` 能力

### 6.2 兼容态

- 若当前模块尚未完成新版 SDK 验证，可通过 legacy adapter 使用旧 `window.wx`
- legacy adapter 只作为兼容层，不再写进业务页面的最终实现

### 6.3 回退策略

出现以下情况允许回退到 legacy adapter：

- 新 SDK 与当前企业微信版本兼容性异常
- 真机验证发现新版注册失败但旧方案可用
- 发布窗口前未完成指定模块的灰度验证

回退要求：

- 必须记录模块范围、回退原因、回退时间和恢复计划
- 不允许在文档中长期把 legacy 方案写成目标态

## 7. 业务能力暴露

M6 统一从适配器层向页面暴露能力：

- `chooseImage`
- `uploadImage`
- `previewFile`
- `getLocalImgData`
- 后续审批、分享或上下文能力

页面层只依赖：

- `useWecomSdkReady`
- `useWecomUpload`
- `useWecomPreview`

不得在业务页面中直接耦合 `window.wx`。

## 8. 可观测与排障

JS-SDK 初始化至少记录以下诊断信息：

- `pageRoute`
- `signatureUrl`
- `sdkMode`：`ww_register` / `legacy_wx`
- `clientPlatform`：iOS / Android / desktop
- `corpSignatureStatus`
- `agentSignatureStatus`
- `errorCode`
- `errorMessage`

失败事件需进入管理员诊断视图：

- 签名接口失败
- `ww.register` 失败
- legacy `wx.config` / `wx.agentConfig` 失败
- 真机环境下 API 不可用

## 9. 真机验证要求

JS-SDK 真机验证必须覆盖：

- iOS 企业微信
- Android 企业微信

每个平台至少验证：

- 登录进入业务页
- JS-SDK 注册成功
- 拍照上传
- 图片/文件预览
- 路由切换后重新进入页面
- 会话过期后恢复
- 弱网下上传与重试

## 10. M6 实施边界

本规格冻结的是：

- 目标接入方式
- 兼容策略
- 诊断口径
- 真机验证门槛

本规格不要求在文档阶段立即重写全部代码；实现阶段可按模块分批迁移，但必须遵循：

- 新页面优先使用 `@wecom/jssdk`
- 旧页面如暂时保留 legacy adapter，需有灰度与回退说明
