---
status: operations
owner: operations
updated: 2026-06-13
replaces: []
replaced_by: []
---
# 部署与发布操作手册

本手册描述从本地仓库发布到生产服务器的标准流程。执行前先读 `development-operations-guidelines.md`。

## 本地验证

在本地仓库执行：

```bash
pnpm --filter web test
pnpm --filter web build
pnpm --filter api test
pnpm --filter api build
```

如果只改前端，至少执行：

```bash
pnpm --filter web test
pnpm --filter web build
```

如果只改后端，至少执行：

```bash
pnpm --filter api test
pnpm --filter api build
```

## 部署前检查

```bash
ssh -i /Users/yuan/Downloads/teamdsb-sunan.pem -o StrictHostKeyChecking=no root@39.106.103.45 'set -e
cd /dev/sunan/deploy
docker compose --env-file /dev/sunan/deploy/.env ps
curl -fsS https://api.qzssncb.com/api/health
curl -fsS https://api.qzssncb.com/api/health/ready
'
```

## 同步源码

服务器不依赖镜像归档包，交付物是源码 + `docker-compose.yml`。标准同步方式如下：

```bash
set -e
REMOTE='root@39.106.103.45'
KEY='/Users/yuan/Downloads/teamdsb-sunan.pem'
TS=$(date +%Y%m%d%H%M%S)

ssh -i "$KEY" -o StrictHostKeyChecking=no "$REMOTE" "set -e
rm -rf /dev/sunan/sunan-source/upload-$TS
mkdir -p /dev/sunan/sunan-source/upload-$TS"

COPYFILE_DISABLE=1 tar --no-xattrs \
  --exclude='./.git' \
  --exclude='./node_modules' \
  --exclude='./*/node_modules' \
  --exclude='./apps/api/dist' \
  --exclude='./apps/web/dist' \
  --exclude='./deploy/.env' \
  --exclude='./.DS_Store' \
  -czf - -C /Users/yuan/项目/sunan/sunan . | \
  ssh -i "$KEY" -o StrictHostKeyChecking=no "$REMOTE" \
    "tar -xzf - -C /dev/sunan/sunan-source/upload-$TS"

ssh -i "$KEY" -o StrictHostKeyChecking=no "$REMOTE" "set -e
if [ -d /dev/sunan/sunan-source/current ]; then
  mv /dev/sunan/sunan-source/current /dev/sunan/sunan-source/backup-$TS
fi
mv /dev/sunan/sunan-source/upload-$TS /dev/sunan/sunan-source/current
ln -sfn /dev/sunan/sunan-source/current /dev/sunan/sunan-source/latest
find /dev/sunan/sunan-source -maxdepth 1 -type d -name 'backup-*' | sort | head -n -5 | xargs -r rm -rf
echo deployed-source-$TS"
```

## 更新服务器部署配置

如果本地 `deploy/docker-compose.yml` 或 `deploy/nginx/sunan.conf` 发生变化，需要同步到服务器：

```bash
scp -i /Users/yuan/Downloads/teamdsb-sunan.pem deploy/docker-compose.yml root@39.106.103.45:/dev/sunan/deploy/docker-compose.yml
scp -i /Users/yuan/Downloads/teamdsb-sunan.pem deploy/nginx/sunan.conf root@39.106.103.45:/dev/sunan/sunan-nginx/conf.d/sunan.conf
```

同步 Nginx 后必须测试：

```bash
ssh -i /Users/yuan/Downloads/teamdsb-sunan.pem root@39.106.103.45 'set -e
docker exec sunan-nginx nginx -t
docker exec sunan-nginx nginx -s reload
'
```

## 构建和启动

全量部署：

```bash
ssh -i /Users/yuan/Downloads/teamdsb-sunan.pem root@39.106.103.45 'set -e
cd /dev/sunan/deploy
docker compose --env-file /dev/sunan/deploy/.env up -d --build
docker compose --env-file /dev/sunan/deploy/.env ps
'
```

只重建前端：

```bash
ssh -i /Users/yuan/Downloads/teamdsb-sunan.pem root@39.106.103.45 'set -e
cd /dev/sunan/deploy
docker compose --env-file /dev/sunan/deploy/.env up -d --build sunan-web
docker compose --env-file /dev/sunan/deploy/.env ps
'
```

只重建后端：

```bash
ssh -i /Users/yuan/Downloads/teamdsb-sunan.pem root@39.106.103.45 'set -e
cd /dev/sunan/deploy
docker compose --env-file /dev/sunan/deploy/.env up -d --build sunan-api
docker compose --env-file /dev/sunan/deploy/.env ps
'
```

注意：Compose 可能因为依赖关系构建或 recreate 相关服务。每次操作后都要确认所有服务恢复。

## 发布后验证

```bash
ssh -i /Users/yuan/Downloads/teamdsb-sunan.pem root@39.106.103.45 'set -e
cd /dev/sunan/deploy
docker compose --env-file /dev/sunan/deploy/.env ps
docker ps --format "{{.Names}} {{.Status}}" | grep -E "sunan-web|sunan-api|sunan-db|sunan-redis|sunan-oss|sunan-nginx"
curl -fsS https://api.qzssncb.com/api/health
curl -fsS https://api.qzssncb.com/api/health/ready
curl -fsSI https://app.qzssncb.com | head -n 5
'
```

如果改了前端文案，可在容器内检索构建产物：

```bash
ssh -i /Users/yuan/Downloads/teamdsb-sunan.pem root@39.106.103.45 \
  'docker exec sunan-web sh -c "grep -R \"待查文案\" -n /usr/share/nginx/html || true"'
```

## 回滚源码版本

查看备份：

```bash
ssh -i /Users/yuan/Downloads/teamdsb-sunan.pem root@39.106.103.45 \
  'find /dev/sunan/sunan-source -maxdepth 1 -type d -name "backup-*" | sort'
```

回滚到指定备份：

```bash
ssh -i /Users/yuan/Downloads/teamdsb-sunan.pem root@39.106.103.45 'set -e
ROLLBACK=/dev/sunan/sunan-source/backup-YYYYMMDDHHMMSS
TS=$(date +%Y%m%d%H%M%S)
test -d "$ROLLBACK"
mv /dev/sunan/sunan-source/current /dev/sunan/sunan-source/failed-$TS
cp -a "$ROLLBACK" /dev/sunan/sunan-source/current
cd /dev/sunan/deploy
docker compose --env-file /dev/sunan/deploy/.env up -d --build
docker compose --env-file /dev/sunan/deploy/.env ps
'
```

## 查看日志

```bash
cd /dev/sunan/deploy
docker compose --env-file /dev/sunan/deploy/.env logs -f sunan-api
docker compose --env-file /dev/sunan/deploy/.env logs -f sunan-web
docker compose --env-file /dev/sunan/deploy/.env logs -f sunan-nginx
docker compose --env-file /dev/sunan/deploy/.env logs -f sunan-db
docker compose --env-file /dev/sunan/deploy/.env logs -f sunan-redis
docker compose --env-file /dev/sunan/deploy/.env logs -f sunan-oss
```
