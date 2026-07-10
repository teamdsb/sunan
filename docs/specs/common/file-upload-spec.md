---
status: current-spec
owner: common
updated: 2026-05-04
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
    'Content-Type': mimeType,
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

```
GET /api/v1/files/{ossKey}/download-url
```

**响应体：**

```json
{
  "data": {
    "downloadUrl": "https://sunan-files.oss-cn-hangzhou.aliyuncs.com/...?签名参数",
    "expiresAt": "2024-01-15T08:45:00+08:00"
  }
}
```

前端使用此 URL 直接下载，或传给 `wx.previewFile` 预览。

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

| 类别 | 允许格式 | 大小限制 |
|---|---|---|
| 证书文件 | PDF, JPG, PNG, JPEG | 20MB |
| 企业制度 | PDF, DOC, DOCX | 50MB |
| 采购附件 | PDF, JPG, PNG, DOC, DOCX, XLS, XLSX | 20MB |
| 采购导出 | PDF | 20MB |
| 检查照片 | JPG, PNG, JPEG | 10MB |
| 通用附件 | PDF, JPG, PNG, DOC, DOCX, XLS, XLSX | 20MB |

## 环境变量

| 变量名 | 说明 |
|---|---|
| `OSS_REGION` | OSS 地域（如 `oss-cn-hangzhou`） |
| `OSS_BUCKET` | Bucket 名称 |
| `OSS_ACCESS_KEY_ID` | AccessKey ID |
| `OSS_ACCESS_KEY_SECRET` | AccessKey Secret |
| `OSS_PRESIGN_EXPIRE` | 预签名上传 URL 有效期（秒，默认 `300`） |
| `OSS_DOWNLOAD_EXPIRE` | 预签名下载 URL 有效期（秒，默认 `900`） |
