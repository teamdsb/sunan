---
status: current-source
owner: common
updated: 2026-05-04
replaces: []
replaced_by: []
---
# API 规范

本文档定义所有后端 REST API 的通用规范，所有 API 规格文档（OpenAPI YAML）均须遵守。

## 基本规则

- **协议**：HTTPS only
- **格式**：JSON（`Content-Type: application/json`）
- **版本**：URL 路径版本，当前为 `/api/v1`
- **字符集**：UTF-8
- **时区**：所有时间戳使用 ISO 8601 格式，带时区（`2024-01-15T08:30:00+08:00`）

## URL 命名规范

- 使用**名词复数**表示资源：`/certificates`、`/vessels`
- 使用**连字符**分隔多个单词：`/certificate-types`、`/ship-monitors`
- 嵌套资源用于表达从属关系：`/vessels/:id/certificates`
- 操作类动词放在末尾：`/reminders/:id/acknowledge`

## HTTP 方法语义

| 方法 | 语义 | 幂等 | 示例 |
|---|---|---|---|
| GET | 查询资源 | 是 | 获取证书列表 |
| POST | 创建资源 / 触发操作 | 否 | 创建证书记录 |
| PUT | 全量更新资源 | 是 | 更新证书元数据 |
| PATCH | 部分更新资源 | 否 | 更新证书状态 |
| DELETE | 软删除资源 | 是 | 删除证书记录 |

## 统一响应格式

### 成功响应（单条资源）

```json
{
  "data": {
    "id": "uuid",
    "...": "..."
  }
}
```

### 成功响应（列表资源）

```json
{
  "data": [...],
  "meta": {
    "total": 100,
    "page": 1,
    "pageSize": 20,
    "totalPages": 5
  }
}
```

### 分页查询参数

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `page` | integer | 1 | 页码，从1开始 |
| `pageSize` | integer | 20 | 每页条数，最大100 |
| `sortBy` | string | `createdAt` | 排序字段 |
| `sortOrder` | `asc` \| `desc` | `desc` | 排序方向 |

## 统一错误格式

所有错误响应均使用以下结构：

```json
{
  "statusCode": 400,
  "message": "证书到期日不能早于签发日",
  "error": "Bad Request",
  "timestamp": "2024-01-15T08:30:00+08:00",
  "path": "/api/v1/certificates"
}
```

### HTTP 状态码语义

| 状态码 | 含义 | 使用场景 |
|---|---|---|
| 200 | OK | 查询、更新成功 |
| 201 | Created | 创建资源成功 |
| 204 | No Content | 删除成功（无响应体） |
| 400 | Bad Request | 请求参数校验失败 |
| 401 | Unauthorized | 未登录或 Token 失效 |
| 403 | Forbidden | 无权限操作该资源 |
| 404 | Not Found | 资源不存在 |
| 409 | Conflict | 资源冲突（如重复创建） |
| 422 | Unprocessable Entity | 业务规则校验失败 |
| 500 | Internal Server Error | 服务端未预期错误 |

## 认证

所有需要登录的接口须在请求头携带 JWT：

```
Authorization: Bearer <jwt_token>
```

## 软删除

所有业务资源均使用软删除（`deleted_at` 字段）。DELETE 请求仅设置 `deleted_at`，不物理删除数据。查询接口默认过滤已删除数据，可通过 `?includeDeleted=true` 查询（需管理员权限）。

## 文件上传

文件上传采用预签名 URL 模式，见 `docs/specs/common/file-upload-spec.md`。接口中出现的 `oss_key` 字段均为文件在 OSS 中的路径键。

## 请求 ID

所有响应头包含 `X-Request-Id`，用于日志追踪。

## 速率限制

- 普通接口：100次/分钟/用户
- 文件上传预签名：20次/分钟/用户
- 超出限制返回 `429 Too Many Requests`

## 跨域（CORS）

后端配置允许企业微信域名和本系统域名的跨域请求。开发环境允许 `localhost:*`。

## API 文档

OpenAPI 文档通过 `/api/docs` 路径访问（仅开发/测试环境开放）。
