---
status: operations
owner: operations
updated: 2026-07-12
replaces: []
replaced_by: []
---
# 生产环境变量说明

生产环境变量文件位于服务器：

```text
/dev/sunan/deploy/.env
```

本仓库只保存模板：

```text
deploy/.env.example
```

不要把真实 `.env` 拷贝进仓库，不要把真实密码和 Secret 写入文档。

## 基础变量

| 变量 | 用途 | 示例/说明 |
|---|---|---|
| `SUNAN_SOURCE_DIR` | Compose build context | `/dev/sunan/sunan-source/current` |
| `SUNAN_VERSION` | 当前部署版本，用于容器环境和镜像标签追踪 | `0.0.4` |
| `APP_DOMAIN` | 根域名 | `qzssncb.com` |
| `WEB_PUBLIC_URL` | 前端公网地址 | `https://app.qzssncb.com` |
| `API_PUBLIC_URL` | 后端公网地址 | `https://api.qzssncb.com` |

## PostgreSQL

| 变量 | 用途 |
|---|---|
| `DB_NAME` | 数据库名，当前为 `sunan` |
| `DB_USER` | 数据库用户，当前为 `sunan` |
| `DB_PASSWORD` | 数据库强密码 |

容器内连接：

```bash
docker exec -it sunan-db psql -U sunan -d sunan
```

## Redis

| 变量 | 用途 |
|---|---|
| `REDIS_USER` | Redis ACL 用户，当前为 `sunan` |
| `REDIS_PASSWORD` | Redis ACL 强密码 |

Compose 会关闭默认用户并启用 `sunan` 用户。

## OSS / MinIO

| 变量 | 用途 |
|---|---|
| `OSS_REGION` | S3 region，当前模板为 `us-east-1` |
| `OSS_BUCKET` | 默认 bucket，当前为 `sunan-files` |
| `OSS_ACCESS_KEY_ID` | MinIO Access Key，当前命名为 `sunan` |
| `OSS_ACCESS_KEY_SECRET` | MinIO Secret |
| `OSS_PRESIGN_EXPIRE` | 上传预签名有效期 |
| `OSS_DOWNLOAD_EXPIRE` | 下载预签名有效期 |

外部地址：

- S3 API：`https://oss.qzssncb.com`
- 控制台：`https://oss-console.qzssncb.com`

## JWT

| 变量 | 用途 |
|---|---|
| `JWT_SECRET` | JWT 签名密钥，至少 32 字符 |
| `JWT_EXPIRES_IN` | 登录有效期，如 `7200s` |

改动 `JWT_SECRET` 会使旧 token 失效。

## 企业微信

| 变量 | 用途 |
|---|---|
| `WECOM_CORP_ID` | 企业 ID |
| `WECOM_AGENT_ID` | 自建应用 AgentId |
| `WECOM_AGENT_SECRET` | 自建应用 Secret |
| `WECOM_REDIRECT_URI` | OAuth 回调地址，当前为 `https://app.qzssncb.com/auth/callback` |
| `WECOM_SYSTEM_ADMIN_USER_IDS` | 系统管理员企业微信 UserID，英文逗号分隔 |
| `WECOM_CALLBACK_TOKEN` | 接收消息/审批回调 Token |
| `WECOM_ENCODING_AES_KEY` | 加密回调 EncodingAESKey |
| `WECOM_CALLBACK_ALLOWED_IP_RANGES` | 手动追加回调来源 IP/CIDR，可为空 |
| `WECOM_CALLBACK_ALLOWED_IP_RANGES_FILE` | 自动生成 IP 白名单文件，默认 `/run/sunan/wecom-ips/callback-ip-list.txt` |
| `WECOM_CALLBACK_SIGNATURE_REQUIRED` | 是否强制验签，生产应为 `true` |
| `WECOM_CALLBACK_MAX_SKEW_SECONDS` | 回调时间戳偏移容忍秒数，模板为 `300` |

`WECOM_CALLBACK_ALLOWED_IP_RANGES` 可留空。系统每日自动拉取企业微信官方回调 IP 段，并与该变量手动追加值合并。

## 修改流程

1. 备份：

```bash
cp /dev/sunan/deploy/.env /dev/sunan/deploy/.env.bak-$(date +%Y%m%d%H%M%S)
```

2. 编辑：

```bash
vim /dev/sunan/deploy/.env
```

3. 重启相关服务：

```bash
cd /dev/sunan/deploy
docker compose --env-file /dev/sunan/deploy/.env up -d sunan-api sunan-web
```

4. 验证：

```bash
curl -fsS https://api.qzssncb.com/api/health
curl -fsS https://api.qzssncb.com/api/health/ready
curl -fsSI https://app.qzssncb.com
```

`/api/health` 只验证 API 进程存活；`/api/health/ready` 还会验证 PostgreSQL、Redis 和 OSS。生产环境变量缺失、仍为示例值、密钥过短或公网 URL 非 HTTPS 时，API 会拒绝启动。

如果修改了企业微信回调 IP 手动追加值，执行：

```bash
systemctl start sunan-wecom-callback-ip-sync.service
systemctl status sunan-wecom-callback-ip-sync.service --no-pager
```
