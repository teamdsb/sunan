---
status: operations
owner: operations
updated: 2026-06-13
replaces: []
replaced_by: []
---
# 故障处理手册

先按顺序检查，不要跳到重装或清数据。

## 总体健康检查

```bash
ssh -i /Users/yuan/Downloads/teamdsb-sunan.pem root@39.106.103.45 'set -e
cd /dev/sunan/deploy
docker compose --env-file /dev/sunan/deploy/.env ps
docker ps --format "{{.Names}} {{.Status}}"
curl -fsS https://api.qzssncb.com/api/health
curl -fsSI https://app.qzssncb.com | head -n 5
df -h
'
```

## 前端打不开

1. 检查公网：

```bash
curl -fsSI https://app.qzssncb.com
```

2. 检查 Nginx 和 web：

```bash
cd /dev/sunan/deploy
docker compose --env-file /dev/sunan/deploy/.env ps sunan-web sunan-nginx
docker compose --env-file /dev/sunan/deploy/.env logs --tail=100 sunan-web
docker compose --env-file /dev/sunan/deploy/.env logs --tail=100 sunan-nginx
```

3. 检查 Nginx 配置：

```bash
docker exec sunan-nginx nginx -t
```

## API 不健康

```bash
cd /dev/sunan/deploy
docker compose --env-file /dev/sunan/deploy/.env ps sunan-api sunan-db sunan-redis sunan-oss
docker compose --env-file /dev/sunan/deploy/.env logs --tail=200 sunan-api
docker exec sunan-db pg_isready -U sunan -d sunan
docker exec sunan-redis redis-cli --user sunan -a "$REDIS_PASSWORD" ping
```

注意：最后一条需要在能读取 `.env` 的 shell 中设置 `REDIS_PASSWORD`，不要把密码输出到聊天。

## 数据库问题

检查：

```bash
docker exec -it sunan-db psql -U sunan -d sunan -c "select now();"
docker compose --env-file /dev/sunan/deploy/.env logs --tail=200 sunan-db
```

磁盘满会导致数据库异常：

```bash
df -h
du -sh /dev/sunan/sunan-db/data
```

不要删除数据目录。先清理日志或扩容。

## Redis 问题

检查：

```bash
docker compose --env-file /dev/sunan/deploy/.env logs --tail=200 sunan-redis
du -sh /dev/sunan/sunan-redis/data
```

如果 ACL 认证失败，确认 `.env` 中 `REDIS_USER`/`REDIS_PASSWORD` 与 Compose 一致，然后重启 Redis 和 API。

## OSS 上传/下载失败

检查：

```bash
curl -fsSI https://oss.qzssncb.com
curl -fsSI https://oss-console.qzssncb.com
docker compose --env-file /dev/sunan/deploy/.env logs --tail=200 sunan-oss
du -sh /dev/sunan/sunan-oss/data
```

常见原因：

- `OSS_ENDPOINT` 内网地址应为 `http://sunan-oss:9000`。
- `OSS_PUBLIC_ENDPOINT` 外网地址应为 `https://oss.qzssncb.com`。
- Nginx `client_max_body_size` 或 CORS 配置不正确。

## HTTPS 证书异常

```bash
openssl s_client -connect app.qzssncb.com:443 -servername app.qzssncb.com </dev/null 2>/dev/null | openssl x509 -noout -dates -subject -issuer
systemctl status certbot.timer --no-pager
certbot renew --dry-run --cert-name qzssncb.com --non-interactive
```

修复后：

```bash
/etc/letsencrypt/renewal-hooks/deploy/sunan-nginx-copy.sh
docker exec sunan-nginx nginx -t
docker exec sunan-nginx nginx -s reload
```

## 企业微信 OAuth 登录失败

检查：

- 企业微信后台 OAuth 回调域名是否为 `app.qzssncb.com`。
- `WECOM_CORP_ID`、`WECOM_AGENT_ID`、`WECOM_AGENT_SECRET` 是否存在。
- 前端构建参数是否使用最新 `.env`，改变量后需要重建 `sunan-web`。
- 后端日志是否有 `gettoken` 或用户信息接口错误。

命令：

```bash
docker compose --env-file /dev/sunan/deploy/.env logs --tail=200 sunan-api | grep -i wecom
```

## 企业微信回调失败

检查 timer 和 IP 文件：

```bash
systemctl status sunan-wecom-callback-ip-sync.timer --no-pager
systemctl status sunan-wecom-callback-ip-sync.service --no-pager
cat /dev/sunan/sunan-wecom-ips/state.json
docker exec sunan-nginx nginx -t
```

如果后台校验 URL 报错：

- 确认企业微信后台 Token/EncodingAESKey 与 `.env` 一致。
- 确认企业微信回调源 IP 在 `callback-allow.conf` 中。
- 临时排查时可以把企业微信后台提示的源 IP 追加到 `WECOM_CALLBACK_ALLOWED_IP_RANGES`，然后执行同步 service。

## 企业微信审批打不开

检查：

- 必须在企业微信客户端内打开前端。
- JS-SDK 可信域名必须包含 `app.qzssncb.com`。
- 自建应用需要有审批流程引擎相关权限。
- 后端是否成功创建或读取 `template_id`。

数据库：

```bash
docker exec -it sunan-db psql -U sunan -d sunan -c \
  "select module_code, template_code, wecom_template_id, enabled, updated_at from wecom_approval_template_bindings order by updated_at desc limit 10;"
```

API 日志：

```bash
docker compose --env-file /dev/sunan/deploy/.env logs --tail=300 sunan-api | grep -i approval
```

## 回滚

优先回滚源码版本，不动数据：

```bash
find /dev/sunan/sunan-source -maxdepth 1 -type d -name "backup-*" | sort
```

按 `deployment-runbook.md` 的“回滚源码版本”执行。
