---
status: operations
owner: operations
updated: 2026-06-13
replaces: []
replaced_by: []
---
# 生产服务器资源清单

更新时间：2026-06-08

## 基本信息

- 公司：钦州市苏南船舶服务有限公司
- 域名：`qzssncb.com`
- 服务器公网 IP：`39.106.103.45`
- 登录用户：`root`
- SSH 密钥：`/Users/yuan/Downloads/teamdsb-sunan.pem`
- 服务器时区：建议保持 `Asia/Shanghai`
- 部署根目录：`/dev/sunan`

## 域名分配

| 域名 | 用途 | 上游服务 |
|---|---|---|
| `https://qzssncb.com` | 根域名，301 到前端 | Nginx |
| `https://app.qzssncb.com` | 前端 H5 / 企业微信工作台 | `sunan-web:80` |
| `https://api.qzssncb.com` | 后端 API | `sunan-api:3000` |
| `https://oss.qzssncb.com` | S3 / MinIO API | `sunan-oss:9000` |
| `https://oss-console.qzssncb.com` | MinIO 控制台 | `sunan-oss:9001` |

## 容器与镜像

| 服务 | 容器 | 镜像 | 作用 |
|---|---|---|---|
| `sunan-db` | `sunan-db` | `sunan-db:16-stable` | PostgreSQL 16 |
| `sunan-redis` | `sunan-redis` | `sunan-redis:7.4-stable` | Redis ACL + AOF |
| `sunan-oss` | `sunan-oss` | `sunan-oss:2025-09-07-stable` | MinIO 对象存储 |
| `sunan-oss-init` | `sunan-oss-init` | `sunan-oss-mc:2025-08-13-stable` | 初始化 bucket |
| `sunan-api` | `sunan-api` | `sunan-api:stable` | NestJS API |
| `sunan-web` | `sunan-web` | `sunan-web:stable` | Vite 静态前端 |
| `sunan-nginx` | `sunan-nginx` | `sunan-nginx:stable` | 反向代理和 TLS |

所有容器在 Docker 网络 `sunan` 内通信。

## 服务器目录

| 路径 | 用途 | 注意 |
|---|---|---|
| `/dev/sunan/deploy` | Compose、`.env`、部署配置 | `.env` 不入仓库 |
| `/dev/sunan/sunan-source/current` | 当前部署源码 | Compose 的 `SUNAN_SOURCE_DIR` 指向这里 |
| `/dev/sunan/sunan-source/backup-*` | 历史源码备份 | 可保留最近 5 份 |
| `/dev/sunan/sunan-db/data` | PostgreSQL 数据 | 不可删除 |
| `/dev/sunan/sunan-redis/data` | Redis AOF 数据 | 不可删除 |
| `/dev/sunan/sunan-oss/data` | MinIO 对象文件 | 不可删除 |
| `/dev/sunan/sunan-api/logs` | API 日志 | 可按保留策略清理 |
| `/dev/sunan/sunan-nginx/conf.d` | Nginx 配置 | 对应本地 `deploy/nginx/sunan.conf` |
| `/dev/sunan/sunan-nginx/certs` | Nginx 证书副本 | 由 certbot hook 更新 |
| `/dev/sunan/sunan-nginx/acme` | ACME 和企业微信域名校验文件 | HTTP/HTTPS 可访问 |
| `/dev/sunan/sunan-nginx/logs` | Nginx 日志 | 可按保留策略清理 |
| `/dev/sunan/sunan-wecom-ips` | 企业微信回调 IP 白名单 | 由 systemd timer 更新 |
| `/dev/sunan/sunan-images` | 镜像/备份预留目录 | 不作为主要交付物 |

## 账号命名规则

统一账号名为 `sunan`：

- PostgreSQL 用户：`sunan`
- Redis ACL 用户：`sunan`
- MinIO Access Key：`sunan`

真实密码在服务器 `/dev/sunan/deploy/.env`，不要写入文档。

## 系统定时任务

| Timer | 用途 | 当前规则 |
|---|---|---|
| `certbot.timer` | Let's Encrypt 自动续费 | 系统 certbot 默认计划 |
| `sunan-wecom-callback-ip-sync.timer` | 每日拉取企业微信回调 IP 段 | 每天 03:20 |

查看命令：

```bash
systemctl list-timers --all --no-pager | grep -E 'certbot|sunan-wecom'
systemctl status certbot.timer --no-pager
systemctl status sunan-wecom-callback-ip-sync.timer --no-pager
```

## 当前证书

- 证书类型：Let's Encrypt 公共可信证书
- 证书名：`qzssncb.com`
- 覆盖域名：
  - `qzssncb.com`
  - `app.qzssncb.com`
  - `api.qzssncb.com`
  - `oss.qzssncb.com`
  - `oss-console.qzssncb.com`
- 2026-06-08 远端检查结果：有效期 `2026-05-19 12:50:40 UTC` 到 `2026-08-17 12:50:39 UTC`

证书续费 hook：

```bash
/etc/letsencrypt/renewal-hooks/deploy/sunan-nginx-copy.sh
```
