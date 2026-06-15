---
status: operations
owner: operations
updated: 2026-06-13
replaces: []
replaced_by: []
---
# 开发与运维操作规范

本文件面向后续开发和运维操作。任何服务器操作前先读完本文件，并结合 `server-inventory.md` 和 `deployment-runbook.md` 执行。

## 工作目标

本项目采用 Docker Compose 在单台服务器部署前端、后端、PostgreSQL、Redis、MinIO OSS、Nginx。所有生产数据和配置集中在 `/dev/sunan` 下，便于备份、迁移和审计。

## 安全边界

- 可以读取本地仓库和 `deploy/` 文档。
- 可以通过 SSH 登录服务器检查状态和执行部署命令。
- 不要输出真实 Secret、密码、Token、EncodingAESKey、JWT Secret。
- 如必须确认某个敏感变量是否存在，只输出变量名和 `SET/EMPTY`，不要输出值。
- 修改生产 `.env` 前先备份：`cp /dev/sunan/deploy/.env /dev/sunan/deploy/.env.bak-$(date +%Y%m%d%H%M%S)`。
- 数据库、Redis、OSS 是生产持久化数据，任何删除、重建、清空前都必须先备份并获得明确确认。

## 操作习惯

- 所有远程命令用 `set -e`，失败即停止。
- 每次部署前先看容器状态，部署后必须做健康检查。
- 只改前端时，也要知道 `docker compose up -d --build sunan-web` 可能因为 `depends_on`/构建依赖触发其他镜像检查；操作后要确认所有容器恢复。
- 使用 `docker compose --env-file /dev/sunan/deploy/.env`，不要依赖当前 shell 环境。
- 修改 Nginx 配置后先 `nginx -t`，通过后再 reload。
- 证书和企业微信回调 IP 同步都有 systemd timer，优先检查 timer 状态，不要手工乱改生成文件。

## 禁止命令

除非用户明确要求并确认备份完成，否则不要执行：

```bash
docker compose down -v
docker volume rm
docker system prune -a --volumes
rm -rf /dev/sunan/sunan-db/data
rm -rf /dev/sunan/sunan-redis/data
rm -rf /dev/sunan/sunan-oss/data
rm -rf /dev/sunan/deploy/.env
```

## 服务器登录

```bash
ssh -i /Users/yuan/Downloads/teamdsb-sunan.pem -o StrictHostKeyChecking=no root@39.106.103.45
```

推荐远程命令格式：

```bash
ssh -i /Users/yuan/Downloads/teamdsb-sunan.pem -o StrictHostKeyChecking=no root@39.106.103.45 'set -e
cd /dev/sunan/deploy
docker compose --env-file /dev/sunan/deploy/.env ps
'
```

## 敏感变量检查方式

不要 `cat /dev/sunan/deploy/.env`。用下面方式确认变量是否存在：

```bash
ssh -i /Users/yuan/Downloads/teamdsb-sunan.pem root@39.106.103.45 '
set -e
for key in DB_PASSWORD REDIS_PASSWORD OSS_ACCESS_KEY_SECRET JWT_SECRET WECOM_AGENT_SECRET WECOM_CALLBACK_TOKEN WECOM_ENCODING_AES_KEY; do
  if grep -q "^${key}=." /dev/sunan/deploy/.env; then
    echo "${key}=SET"
  else
    echo "${key}=EMPTY"
  fi
done
'
```

## 完成标准

任何部署或配置改动完成后至少确认：

- `docker compose ps` 中 `sunan-api`、`sunan-db`、`sunan-redis` 为 healthy 或 Up。
- `sunan-web`、`sunan-nginx`、`sunan-oss` 为 Up。
- `curl -fsS https://api.qzssncb.com/api/health` 返回 `{"data":{"status":"ok"}}`。
- `curl -fsSI https://app.qzssncb.com` 返回 200。
- 如果改了证书，确认 `openssl x509 -noout -dates -ext subjectAltName`。
- 如果改了企业微信回调，确认 `sunan-wecom-callback-ip-sync.timer` 和回调 URL 校验。
