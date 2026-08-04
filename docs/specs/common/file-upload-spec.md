---
status: current-spec
owner: common
updated: 2026-08-04
replaces: []
replaced_by: []
---

# 文件上传规格

## 概述

所有文件（证书图片、制度文档、附件等）存储于阿里云 OSS，后端 PostgreSQL 仅存储文件元数据。采用**预签名 URL 上传模式**，文件由前端直接上传至 OSS，不经过后端服务器。

## OSS Bucket 结构

```
sunan-files/
├── certificates/          # 电子证照
│   └── {year}/{month}/{uuid}.{ext}
├── enterprise-profiles/   # 企业资料
│   └── {year}/{month}/{uuid}.{ext}
├── enterprise-policies/   # 企业制度
│   └── {year}/{month}/{uuid}.{ext}
├── procurement/           # 采购管理附件与导出文件
│   ├── attachments/{year}/{month}/{uuid}.{ext}
│   └── exports/{year}/{month}/{uuid}.pdf
├── inspection-photos/     # 检查/整改照片
│   └── {year}/{month}/{uuid}.{ext}
└── meeting-records/       # 会议记录
    └── {year}/{month}/{uuid}.{ext}
```

## 上传流程

### Step 0：前端获取并展示上传策略

```text
GET /api/v1/files/policies/{category}
```

响应包含 `maxSize`、`extensions`、文件选择器使用的 `accept`，以及各扩展名的规范 MIME。前端必须在用户选择文件前展示支持格式和单文件大小限制，并在预签名前完成同口径校验；后端仍为最终校验来源。

```json
{
  "data": {
    "category": "procurement-attachments",
    "maxSize": 20971520,
    "extensions": [
      "pdf",
      "jpg",
      "jpeg",
      "png",
      "doc",
      "docx",
      "xls",
      "xlsx",
      "txt",
      "csv",
      "heic",
      "zip",
      "rar",
      "wps",
      "et",
      "dps"
    ],
    "accept": ".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.txt,.csv,.heic,.zip,.rar,.wps,.et,.dps",
    "mimeTypes": {
      "txt": "text/plain",
      "csv": "text/csv",
      "heic": "image/heic",
      "zip": "application/zip",
      "rar": "application/vnd.rar",
      "wps": "application/vnd.ms-works",
      "et": "application/vnd.ms-excel",
      "dps": "application/vnd.ms-powerpoint"
    }
  }
}
```

### Step 1：前端请求预签名 URL

```
POST /api/v1/files/presign
```

**请求体：**

```json
{
  "fileName": "苏南012国籍证书.pdf",
  "mimeType": "application/pdf",
  "fileSize": 1048576,
  "category": "certificates"
}
```

**响应体：**

```json
{
  "data": {
    "uploadUrl": "https://sunan-files.oss-cn-hangzhou.aliyuncs.com/...",
    "ossKey": "certificates/2024/01/550e8400-e29b-41d4-a716-446655440000.pdf",
    "mimeType": "application/pdf",
    "expiresAt": "2024-01-15T09:00:00+08:00",
    "headers": {
      "Content-Type": "application/pdf",
      "x-oss-meta-original-name": "苏南012国籍证书.pdf"
    }
  }
}
```

### Step 2：前端直传 OSS

```javascript
// 直接 PUT 到预签名 URL，无需携带 Authorization
await fetch(uploadUrl, {
  method: 'PUT',
  headers: {
    'Content-Type': presignMimeType,
    'x-oss-meta-original-name': fileName,
  },
  body: file,
});
```

### Step 3：前端通知后端写入元数据

```
POST /api/v1/files/callback
```

**请求体：**

```json
{
  "ossKey": "certificates/2024/01/550e8400-...",
  "fileName": "苏南012国籍证书.pdf",
  "mimeType": "application/pdf",
  "fileSize": 1048576,
  "category": "certificates"
}
```

**响应体：**

```json
{
  "data": {
    "id": "uuid",
    "ossKey": "certificates/2024/01/550e8400-...",
    "fileName": "苏南012国籍证书.pdf",
    "mimeType": "application/pdf",
    "fileSize": 1048576,
    "downloadUrl": "https://...",
    "createdAt": "2024-01-15T08:30:00+08:00"
  }
}
```

## 下载流程

文件下载使用 OSS **预签名下载 URL**，有效期15分钟。

未绑定到业务记录的临时上传结果可以使用 `GET /api/v1/files/{ossKey}/download-url`。一旦文件绑定到证照、企业资料、企业制度、采购单或工作台记录，前端必须改用相应的业务记录级下载 URL 接口；接口先校验当前用户能读取业务记录且文件关系存在，再签发短期 URL。

**响应体：**

```json
{
  "data": {
    "downloadUrl": "https://sunan-files.oss-cn-hangzhou.aliyuncs.com/...?签名参数",
    "expiresAt": "2024-01-15T08:45:00+08:00"
  }
}
```

前端使用此 URL 获取文件内容，不依赖 `wx.previewFile` 或异步 `window.open`。

## 预览规则

| 格式                                                 | 应用内行为                                       |
| ---------------------------------------------------- | ------------------------------------------------ |
| PDF                                                  | 在统一预览弹窗内嵌展示                           |
| JPG / JPEG / PNG                                     | 在统一预览弹窗中按容器自适应展示                 |
| HEIC                                                 | 浏览器端按需加载转换器，转换为 JPEG 后展示       |
| TXT                                                  | 以纯文本展示，UTF-8 失败时回退 GB18030           |
| CSV                                                  | 以表格展示，支持引号包裹字段                     |
| DOC / DOCX / XLS / XLSX / WPS / ET / DPS / ZIP / RAR | 展示文件信息和“不支持在线预览”提示，保留下载入口 |

- 文本类预览最多读取前 2MB；CSV 最多展示 500 行、50 列，发生截断时必须提示。
- 预览或下载失败必须留在当前弹窗内反馈并允许重试，不打开空白窗口。
- 采购单与采购报表的“预览 PDF”在后端生成完成后直接打开统一预览弹窗；“导出 PDF”继续触发文件下载。

## 来自企业微信的图片

当用户通过 JS-SDK 拍照上传时，图片先到微信服务器（得到 `mediaId`），需后端中转到 OSS：

```
POST /api/v1/files/from-wecom
```

**请求体：**

```json
{
  "mediaId": "MEDIA_ID",
  "category": "inspection-photos"
}
```

后端处理：调用企业微信 `GET /cgi-bin/media/get?media_id=` 下载图片，再上传至 OSS。

### Wave 3 幂等、权限与重试

- `mediaId` 转存必须持久化状态 `queued|running|succeeded|failed`，以 `mediaId` 唯一；重复请求成功时返回同一 `files` 记录，失败时返回可重试的既有转存记录。
- 文件元数据创建不等同于业务访问授权。附件、PDF 与导出下载 URL 必须由对应业务记录的受权接口签发；不得用全局 `ossKey` 下载接口绕过记录权限。
- 上传或转存失败必须保留可重试反馈，不能把失败的 mediaId 或预签名上传占位值绑定到业务记录。

## 文件限制

| 类别                  | 允许格式                                                                          | 大小限制 |
| --------------------- | --------------------------------------------------------------------------------- | -------- |
| 证书文件              | PDF, JPG, PNG, JPEG                                                               | 20MB     |
| 企业资料              | PDF, JPG, JPEG, PNG, DOC, DOCX, XLS, XLSX, TXT, CSV, HEIC, ZIP, RAR, WPS, ET, DPS | 20MB     |
| 企业制度              | PDF, JPG, JPEG, PNG, DOC, DOCX, XLS, XLSX, TXT, CSV, HEIC, ZIP, RAR, WPS, ET, DPS | 50MB     |
| 采购附件              | PDF, JPG, JPEG, PNG, DOC, DOCX, XLS, XLSX, TXT, CSV, HEIC, ZIP, RAR, WPS, ET, DPS | 20MB     |
| 采购导出              | PDF                                                                               | 20MB     |
| 检查照片              | JPG, PNG, JPEG                                                                    | 10MB     |
| 工作台/会议等通用附件 | PDF, JPG, JPEG, PNG, DOC, DOCX, XLS, XLSX, TXT, CSV, HEIC, ZIP, RAR, WPS, ET, DPS | 20MB     |

浏览器可能为空 MIME 或返回 `application/octet-stream`。对于已允许扩展名，后端接受这两类通用 MIME 并归一为规范 MIME；若浏览器提供了与扩展名明确冲突的 MIME，则拒绝上传。证照与检查照片等专用类别不因通用附件扩展而放宽。

## 环境变量

| 变量名                  | 说明                                    |
| ----------------------- | --------------------------------------- |
| `OSS_REGION`            | OSS 地域（如 `oss-cn-hangzhou`）        |
| `OSS_BUCKET`            | Bucket 名称                             |
| `OSS_ACCESS_KEY_ID`     | AccessKey ID                            |
| `OSS_ACCESS_KEY_SECRET` | AccessKey Secret                        |
| `OSS_PRESIGN_EXPIRE`    | 预签名上传 URL 有效期（秒，默认 `300`） |
| `OSS_DOWNLOAD_EXPIRE`   | 预签名下载 URL 有效期（秒，默认 `900`） |
