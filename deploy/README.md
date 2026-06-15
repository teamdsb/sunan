---
status: current-index
owner: operations
updated: 2026-06-13
replaces: []
replaced_by: []
---
# 苏南船舶部署文档索引

本目录是钦州市苏南船舶服务有限公司生产部署的唯一运维入口。后续开发或运维人员继续操作服务器时，先阅读本文件，再按任务类型阅读对应专项文档。

## 先读顺序

1. `development-operations-guidelines.md`：开发与运维操作前必须遵守的操作边界、验证要求和安全规则。
2. `server-inventory.md`：服务器、域名、容器、持久化目录、系统定时任务和证书现状。
3. `bootstrap-server.md`：新服务器初始化、Docker、目录、Compose、Nginx、证书和 systemd 落位。
4. `deployment-runbook.md`：从本地同步代码、构建、启动、验证和回滚的标准流程。
5. `environment-variables.md`：生产 `.env` 变量含义、来源和变更规范。
6. `tls-letsencrypt.md`：Let's Encrypt 证书、续费、Nginx 证书挂载和排障。
7. `wecom-operations.md`：企业微信 OAuth、JS-SDK、回调、审批、可信域名和 IP 白名单。
8. `backup-restore.md`：PostgreSQL、Redis、OSS、配置和源码备份恢复。
9. `troubleshooting.md`：常见故障的检查顺序和命令。

## 核心事实

- 服务器：`root@39.106.103.45`
- SSH 密钥：`/Users/yuan/Downloads/teamdsb-sunan.pem`
- 本地仓库：`/Users/yuan/项目/sunan/sunan`
- 服务器部署根目录：`/dev/sunan`
- 服务器 Compose 文件：`/dev/sunan/deploy/docker-compose.yml`
- 服务器环境变量：`/dev/sunan/deploy/.env`
- 服务器源码目录：`/dev/sunan/sunan-source/current`
- 前端域名：`https://app.qzssncb.com`
- 后端域名：`https://api.qzssncb.com`
- OSS S3 域名：`https://oss.qzssncb.com`
- OSS 控制台：`https://oss-console.qzssncb.com`

## Compose 与配置文件

- `docker-compose.yml`：当前服务器实际部署用 Compose，包含企业微信回调 IP 文件挂载。
- `docker-compose.prod.yml`：早期生产 Compose 快照，仅作为对照；继续操作优先使用 `docker-compose.yml`。
- `.env.example`：生产环境变量模板，不包含真实密码和 Secret。
- `nginx/sunan.conf`：Nginx 反向代理、证书、企业微信校验文件和回调 IP 限制配置。
- `scripts/sunan-update-wecom-callback-ips.py`：每日拉取企业微信回调 IP 段并更新 Nginx allow 配置。
- `systemd/`：企业微信回调 IP 定时同步的 systemd service/timer。

## 绝对不要做

- 不要把 `/dev/sunan/deploy/.env` 中的真实密码、JWT Secret、企业微信 Secret、Token、EncodingAESKey 写入仓库文档。
- 不要执行 `docker compose down -v`，除非明确要清空生产数据。
- 不要删除 `/dev/sunan/sunan-db/data`、`/dev/sunan/sunan-redis/data`、`/dev/sunan/sunan-oss/data`。
- 不要用 `docker system prune -a --volumes`。
- 不要用 `git reset --hard` 或覆盖用户未说明的本地改动。

## 最小健康检查

```bash
ssh -i /Users/yuan/Downloads/teamdsb-sunan.pem root@39.106.103.45 \
  'cd /dev/sunan/deploy && docker compose --env-file /dev/sunan/deploy/.env ps'

curl -fsS https://api.qzssncb.com/api/health
curl -fsS https://api.qzssncb.com/api/health/ready
curl -fsSI https://app.qzssncb.com
```
