---
status: operations
owner: operations
updated: 2026-09-20
replaces: []
replaced_by: []
---
# 生产服务器资源清单

更新时间：2026-09-20

## 基本信息

- 公司：钦州市苏南船舶服务有限公司
- 域名：`qzssncb.com`
- 服务器公网 IP：`39.106.103.45`
- 登录用户：`root`
- SSH 密钥：`/Users/yuan/Downloads/teamdsb-sunan.pem`
- 服务器时区：建议保持 `Asia/Shanghai`
- 部署根目录：`/srv/sunan`（`/dev/vda3`，ext4 持久化磁盘）
- `/dev/sunan` 仅为兼容软链接，由 systemd-tmpfiles 开机创建；Docker 启动依赖 `/srv/sunan` 挂载。

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
| `sunan-api` | `sunan-api` | `sunan-api:0.0.8` | NestJS API |
| `sunan-web` | `sunan-web` | `sunan-web:0.0.8` | Vite 静态前端 |
| `sunan-nginx` | `sunan-nginx` | `sunan-nginx:0.0.8` | 反向代理和 TLS |

所有容器在 Docker 网络 `sunan` 内通信。

## 服务器目录

| 路径 | 用途 | 注意 |
|---|---|---|
| `/srv/sunan/deploy` | Compose、`.env`、部署配置 | `.env` 不入仓库 |
| `/srv/sunan/sunan-source/current` | 当前部署源码 | Compose 的 `SUNAN_SOURCE_DIR` 指向这里 |
| `/srv/sunan/sunan-source/backup-*` | 历史源码备份 | 可保留最近 5 份 |
| `/srv/sunan/sunan-db/data` | PostgreSQL 数据 | 不可删除 |
| `/srv/sunan/sunan-redis/data` | Redis AOF 数据 | 不可删除 |
| `/srv/sunan/sunan-oss/data` | MinIO 对象文件 | 不可删除 |
| `/srv/sunan/sunan-api/logs` | API 日志 | 可按保留策略清理 |
| `/srv/sunan/sunan-nginx/conf.d` | Nginx 配置 | 对应本地 `deploy/nginx/sunan.conf` |
| `/srv/sunan/sunan-nginx/certs` | Nginx 证书副本 | 由 certbot hook 更新 |
| `/srv/sunan/sunan-nginx/acme` | ACME 和企业微信域名校验文件 | HTTP/HTTPS 可访问 |
| `/srv/sunan/sunan-nginx/logs` | Nginx 日志 | 可按保留策略清理 |
| `/srv/sunan/sunan-wecom-ips` | 企业微信回调 IP 白名单 | 由 systemd timer 更新 |
| `/var/backups/sunan` | 数据、源码和镜像归档 | 按发布批次保留，限制读取权限 |

## 账号命名规则

统一账号名为 `sunan`：

- PostgreSQL 用户：`sunan`
- Redis ACL 用户：`sunan`
- MinIO Access Key：`sunan`

真实密码在服务器 `/srv/sunan/deploy/.env`，不要写入文档。

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
- 2026-09-20 远端检查结果：有效期 `2026-09-16 22:38:31 UTC` 到 `2026-12-15 22:38:30 UTC`

证书续费 hook：

```bash
/etc/letsencrypt/renewal-hooks/deploy/sunan-nginx-copy.sh
```
