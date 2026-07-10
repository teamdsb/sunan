---
status: current-spec
owner: wecom
updated: 2026-05-04
replaces: []
replaced_by: []
---
# 企业微信 JS-SDK 规格

## 概述

JS-SDK 使 H5 页面能调用企业微信原生能力（拍照、文件预览等）。里程碑1主要用于：
- 拍照上传证书图片（`wx.chooseImage` / `wx.uploadImage`）
- 预览文件（`wx.previewFile`）

## 初始化流程

JS-SDK 须按顺序完成两级配置：

```
① 注入企业级配置（wx.config）
        ↓
② 注入应用级配置（wx.agentConfig）
        ↓
③ 调用具体 API
```

## 后端签名接口

### GET /api/v1/auth/jssdk/signature

为指定 URL 生成 JS-SDK 签名。

**请求参数（Query）：**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `url` | string | 是 | 需要签名的页面 URL（须 URL 编码） |
| `type` | `corp` \| `agent` | 是 | 签名类型：`corp` 用于 wx.config，`agent` 用于 wx.agentConfig |

**响应体：**

```json
{
  "data": {
    "appId": "ww...",
    "timestamp": 1705300000,
    "nonceStr": "abc123",
    "signature": "sha1_hash_string"
  }
}
```

**后端签名算法：**

1. 获取对应类型的 jsapi_ticket（从 Redis 缓存读取，见 `token-cache-spec.md`）
2. 按照以下规则拼接字符串：
   ```
   jsapi_ticket={ticket}&noncestr={nonceStr}&timestamp={timestamp}&url={url}
   ```
3. 对拼接字符串进行 SHA1 哈希，得到 signature

**注意**：URL 须与前端调用时的 `window.location.href` 完全一致（包含查询参数，不包含 `#` 之后的内容）。

## 前端初始化代码规格

### wx.config（企业级）

```typescript
interface WxConfigParams {
  appId: string;      // CorpID
  timestamp: number;
  nonceStr: string;
  signature: string;  // corp jsapi_ticket 签名
  jsApiList: string[];
}

// 里程碑1需要的 API 列表
const CORP_JSAPI_LIST = [
  'chooseImage',
  'uploadImage',
  'previewFile',
  'getLocalImgData',
  'getLocation',
];
```

### wx.agentConfig（应用级）

```typescript
interface WxAgentConfigParams {
  corpid: string;
  agentid: string;
  timestamp: number;
  nonceStr: string;
  signature: string;  // agent jsapi_ticket 签名
  jsApiList: string[];
}

// 里程碑1应用级 API
const AGENT_JSAPI_LIST = [
  'selectExternalContact',
  'openEnterpriseChat',
];
```

## iOS / Android 差异处理

| 平台 | 签名 URL 规则 |
|---|---|
| iOS 企业微信 | 使用**应用首次加载时的 URL**（记录在 SPA 初始化时） |
| Android 企业微信 | 使用**当前页面 URL** |

**实现方案：**

```typescript
// 在 App.tsx 初始化时记录首次 URL（iOS 需要）
const initialUrl = window.location.href.split('#')[0];
sessionStorage.setItem('sunan_initial_url', initialUrl);

// 签名时的 URL 选择
function getSignatureUrl(): string {
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
  if (isIOS) {
    return sessionStorage.getItem('sunan_initial_url') || window.location.href.split('#')[0];
  }
  return window.location.href.split('#')[0];
}
```

## 使用场景规格

### 拍照上传证书

```typescript
// 触发拍照/选图
wx.chooseImage({
  count: 1,
  sizeType: ['compressed'],
  sourceType: ['camera', 'album'],
  success: (res) => {
    const localId = res.localIds[0];
    // 上传到微信服务器
    wx.uploadImage({
      localId,
      isShowProgressTips: 1,
      success: (uploadRes) => {
        const mediaId = uploadRes.serverId;
        // 调用后端接口，后端从微信下载并转存 OSS
        // POST /api/v1/files/from-wecom { mediaId }
      }
    });
  }
});
```

### 文件预览

```typescript
wx.previewFile({
  url: ossPresignedDownloadUrl,  // OSS 预签名下载 URL
  name: '证书文件名.pdf',
});
```

## 错误处理

| 错误码 | 含义 | 处理方式 |
|---|---|---|
| `config:fail` | wx.config 失败 | 重新获取签名后重试一次，失败则提示用户刷新 |
| `agentConfig:fail` | wx.agentConfig 失败 | 同上 |
| `-1` (通用错误) | 当前客户端版本不支持 | 提示用户升级企业微信 |

## Wave 3 定位证据

定位使用 `wx.getLocation`（优先）或浏览器定位降级，但只有成功回调中的经纬度和精度可提交为定位证据。用户拒绝授权、JS-SDK 配置失败或客户端不支持时，页面必须提供重新授权/重试初始化和人工异常说明；不得构造默认坐标或复用旧坐标。

## 初始化 React Hook 规格

```typescript
// hooks/useWecomJsSdk.ts
interface UseWecomJsSdkOptions {
  jsApiList: string[];
  agentJsApiList?: string[];
}

interface UseWecomJsSdkReturn {
  isReady: boolean;
  error: string | null;
}

// 该 Hook 负责：
// 1. 调用后端获取 corp 和 agent 签名
// 2. 顺序执行 wx.config → wx.ready → wx.agentConfig
// 3. 暴露 isReady 状态给需要调用 JS-SDK 的组件
```
